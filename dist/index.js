"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workers_1 = require("@notionhq/workers");
const client_1 = require("@notionhq/client");
const gemini_1 = require("./gemini");
const worker = new workers_1.Worker();
exports.default = worker;
// Assume the user sets their Notion integration token in the .env
const notion = new client_1.Client({ auth: process.env.NOTION_API_KEY });
worker.tool("generateNanoBananaImage", {
    title: "Generate Nano Banana Image",
    description: "Expands a short image description into a highly detailed Nano Banana Pro prompt, generates the image using Gemini Imagen, and returns the uploaded image to Notion.",
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
            // 1. Expand the prompt
            console.log(`Expanding prompt for: ${short_description}`);
            const expandedPrompt = await (0, gemini_1.expandPrompt)(short_description);
            console.log(`Expanded Prompt: ${expandedPrompt}`);
            // 2. Generate the Image
            console.log(`Generating image from expanded prompt...`);
            const imageBytes = await (0, gemini_1.generateImage)(expandedPrompt);
            // 3. Upload the image to Notion
            // Notion's API for image blocks requires a URL.
            // Since we have raw bytes, we need to convert them to a data URI
            // and then use that as an external URL.
            // Note: For production, you'd typically upload to a cloud storage (S3, Cloudinary)
            // and use that permanent URL. Data URIs can be very large and might have limitations.
            const base64Image = Buffer.from(imageBytes).toString('base64');
            const dataUri = `data:image/jpeg;base64,${base64Image}`;
            console.log(`Uploading image to Notion page: ${page_id}`);
            await notion.blocks.children.append({
                block_id: page_id,
                children: [
                    {
                        object: 'block',
                        type: 'image',
                        image: {
                            type: 'external',
                            external: {
                                url: dataUri,
                            },
                        },
                    },
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
        }
        catch (e) {
            console.error(`Error generating or uploading image: ${e.message}`);
            return `Failed to generate or upload image: ${e.message}`;
        }
    },
});
