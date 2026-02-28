import { Worker } from "@notionhq/workers";
import { Client } from "@notionhq/client";
import { expandPrompt, generateImage } from "./gemini";

const worker = new Worker();
export default worker;
const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";

type GenerateImageInput = {
	short_description: string;
	page_id: string; // the page to embed the image into
	target_block_id?: string; // optional insertion anchor block
	aspect_ratio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
	image_size?: "1K" | "2K" | "4K";
};

function extensionFromMimeType(mimeType: string): string {
	switch (mimeType) {
		case "image/jpeg":
			return "jpg";
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
		case "image/gif":
			return "gif";
		default:
			return "bin";
	}
}

async function uploadImageToNotion(
	notionApiKey: string,
	imageBytes: Uint8Array,
	mimeType: string,
): Promise<string> {
	const fileName = `nano-banana-${Date.now()}.${extensionFromMimeType(mimeType)}`;

	// Step 1: create upload object
	const createResponse = await fetch(`${NOTION_API_BASE_URL}/file_uploads`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${notionApiKey}`,
			"Notion-Version": NOTION_API_VERSION,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			filename: fileName,
			content_type: mimeType,
			mode: "single_part",
		}),
	});

	if (!createResponse.ok) {
		const body = await createResponse.text();
		throw new Error(
			`Notion file upload create failed: ${createResponse.status} ${body}`,
		);
	}

	const createPayload = (await createResponse.json()) as {
		id?: string;
		upload_url?: string;
	};
	if (!createPayload.id || !createPayload.upload_url) {
		throw new Error(
			`Notion file upload create returned invalid payload: ${JSON.stringify(createPayload)}`,
		);
	}

	// Step 2: upload bytes
	const form = new FormData();
	form.append(
		"file",
		new Blob([Buffer.from(imageBytes)], { type: mimeType }),
		fileName,
	);
	const uploadResponse = await fetch(createPayload.upload_url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${notionApiKey}`,
			"Notion-Version": NOTION_API_VERSION,
		},
		body: form,
	});

	if (!uploadResponse.ok) {
		const body = await uploadResponse.text();
		throw new Error(
			`Notion file upload send failed: ${uploadResponse.status} ${body}`,
		);
	}

	// Step 3: return file_upload id to reference in block
	return createPayload.id;
}

worker.tool<GenerateImageInput, string>("generateNanoBananaImage", {
	title: "Generate Nano Banana Image",
	description:
		"Generate and insert an image into Notion. Always pass page_id. If the user asks for a specific section/position, also pass target_block_id so the image is inserted under that block. Uses Notion file_upload for native embedding.",
	schema: {
		type: "object",
		properties: {
			short_description: {
				type: "string",
				description: "A short, simple description of the desired image. e.g. 'A cute cat reading a book'",
			},
			page_id: {
				type: "string",
				description: "The Notion Page ID where the image should be embedded. Note: The Notion Integration must be invited to this page.",
			},
			target_block_id: {
				type: "string",
				description:
					"Optional Notion block ID to control placement. If provided, image and prompt are inserted under this block. If omitted, they are appended to the page root.",
			},
			aspect_ratio: {
				type: "string",
				enum: ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"],
				description:
					"Optional image aspect ratio. Let the agent choose based on user intent (e.g. portrait uses 9:16, landscape uses 16:9).",
			},
			image_size: {
				type: "string",
				enum: ["1K", "2K", "4K"],
				description:
					"Optional output resolution tier. 1K is fastest/cheapest, 2K for higher detail, 4K for maximum detail when needed.",
			},
		},
		required: ["short_description", "page_id"],
		additionalProperties: false,
	},
	execute: async ({
		short_description,
		page_id,
		target_block_id,
		aspect_ratio,
		image_size,
	}) => {
		try {
			const notionApiKey = process.env.NOTION_API_KEY;
			if (!notionApiKey) {
				throw new Error("NOTION_API_KEY is not configured.");
			}

			// 1. Expand the prompt
			console.log(`Expanding prompt for: ${short_description}`);
			const expandedPrompt = await expandPrompt(short_description);
			console.log(`Expanded Prompt: ${expandedPrompt}`);

			// 2. Generate the Image
			console.log(`Generating image from expanded prompt...`);
			const generatedImage = await generateImage(expandedPrompt, {
				aspectRatio: aspect_ratio,
				imageSize: image_size,
			});

			// 3. Upload image bytes via Notion File Upload API
			console.log(`Uploading image bytes to Notion File Upload API...`);
			const fileUploadId = await uploadImageToNotion(
				notionApiKey,
				generatedImage.bytes,
				generatedImage.mimeType,
			);

			const appendBlockId = target_block_id || page_id;
			console.log(`Appending image to Notion block: ${appendBlockId}`);
			const notion = new Client({ auth: notionApiKey });
			await notion.blocks.children.append({
				block_id: appendBlockId,
				children: [
					{
						object: 'block',
						type: 'image',
						image: {
							type: "file_upload",
							file_upload: {
								id: fileUploadId,
							},
						},
					} as any,
					{
						object: 'block',
						type: 'paragraph',
						paragraph: {
							rich_text: [
								{
									type: 'text',
									text: {
										content: `Expanded Prompt: ${expandedPrompt}`,
									},
								},
							],
						},
					},
				],
			});

			return `Successfully generated and uploaded image to Notion. page_id=${page_id}, inserted_under=${appendBlockId}.`;
		} catch (e: any) {
			console.error(`Error generating or uploading image: ${e.stack || e.message}`);
			return `Failed to generate or upload image: ${e.message}`;
		}
	},
});
