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
};

function extensionFromMimeType(mimeType: string): string {
	switch (mimeType) {
		case "image/jpeg":
			return "jpg";
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
		default:
			return "bin";
	}
}

async function uploadImageWithNotionFileApi(
	notionApiKey: string,
	imageBytes: Uint8Array,
	mimeType: string,
): Promise<string> {
	const fileName = `nano-banana.${extensionFromMimeType(mimeType)}`;
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
		throw new Error(`Notion file upload create failed: ${createResponse.status}`);
	}

	const createPayload = (await createResponse.json()) as {
		id?: string;
		upload_url?: string;
	};
	if (!createPayload.id) {
		throw new Error("Notion file upload create did not return an id.");
	}

	const uploadUrl = createPayload.upload_url;
	if (!uploadUrl) {
		throw new Error("Notion file upload create did not return an upload_url.");
	}

	const uploadForm = new FormData();
	const fileBuffer = Buffer.from(imageBytes);
	uploadForm.append("file", new Blob([fileBuffer], { type: mimeType }), fileName);
	const sendResponse = await fetch(uploadUrl, {
		method: "POST",
		body: uploadForm,
	});

	if (!sendResponse.ok) {
		throw new Error(`Notion file upload send failed: ${sendResponse.status}`);
	}

	return createPayload.id;
}

worker.tool<GenerateImageInput, string>("generateNanoBananaImage", {
	title: "Generate Nano Banana Image",
	description: "Expands a short image description into a highly detailed Nano Banana prompt, generates an image using Gemini 3.1 Flash Image, and uploads it to Notion.",
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
			}
		},
		required: ["short_description", "page_id"],
		additionalProperties: false,
	},
	execute: async ({ short_description, page_id }) => {
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
			const generatedImage = await generateImage(expandedPrompt);

			// 3. Upload image bytes via Notion File Upload API
			console.log(`Uploading image binary via Notion File Upload API...`);
			const fileUploadId = await uploadImageWithNotionFileApi(
				notionApiKey,
				generatedImage.bytes,
				generatedImage.mimeType,
			);

			console.log(`Uploading image to Notion page: ${page_id}`);
			const notion = new Client({ auth: notionApiKey });
			await notion.blocks.children.append({
				block_id: page_id,
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

			return `Successfully generated and uploaded image to Notion page ${page_id}.`;
		} catch (e: any) {
			console.error(`Error generating or uploading image: ${e.message}`);
			return `Failed to generate or upload image: ${e.message}`;
		}
	},
});
