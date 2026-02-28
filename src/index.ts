import { Worker } from "@notionhq/workers";
import { Client } from "@notionhq/client";
import { expandPrompt, generateImage } from "./gemini";
import FormData from "form-data";
import fetch from "node-fetch";

const worker = new Worker();
export default worker;

type GenerateImageInput = {
	short_description: string;
	page_id: string; // the page to embed the image into
};

async function uploadToFreeImageHost(base64Image: string): Promise<string> {
	const apiKey = '6d207e02198a847aa98d0a2a901485a5';
	const form = new FormData();
	form.append('key', apiKey);
	form.append('action', 'upload');
	form.append('source', base64Image);
	form.append('format', 'json');

	const res = await fetch('https://freeimage.host/api/1/upload', {
		method: 'POST',
		body: form
	});

	if (!res.ok) {
		throw new Error(`Failed to upload to freeimage.host: ${res.status}`);
	}

	const data = await res.json() as any;
	if (!data || !data.image || !data.image.url) {
		throw new Error(`Invalid response from freeimage.host: ${JSON.stringify(data)}`);
	}

	return data.image.url;
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

			// 3. Upload image to Freeimage.host to get a public URL
			console.log(`Uploading image binary to FreeImage.host...`);
			const base64Image = Buffer.from(generatedImage.bytes).toString('base64');
			const publicImageUrl = await uploadToFreeImageHost(base64Image);

			console.log(`Appending image to Notion page: ${page_id}`);
			const notion = new Client({ auth: notionApiKey });
			await notion.blocks.children.append({
				block_id: page_id,
				children: [
					{
						object: 'block',
						type: 'image',
						image: {
							type: "external",
							external: {
								url: publicImageUrl,
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
			console.error(`Error generating or uploading image: ${e.stack || e.message}`);
			return `Failed to generate or upload image: ${e.message}`;
		}
	},
});
