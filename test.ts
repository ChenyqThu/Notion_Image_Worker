import { expandPrompt, generateImage } from "./src/gemini";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";
import fetch from "node-fetch";
import FormData from "form-data";

// Load local .env manually since we aren't using the notion worker runtime
dotenv.config();

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


async function testWorkerLogic() {
    console.log("=== 🚀 Starting End-to-End Notion Upload Test ===\n");

    const description = "A cute cat hacking on a laptop in a cyberpunk city";
    const pageId = "9c4e54d06d6e46e3b79e8c9f680b398c"; // The user's target page ID

    try {
        const notionApiKey = process.env.NOTION_API_KEY;
        if (!notionApiKey) throw new Error("NOTION_API_KEY is not set in .env");

        console.log(`[Stage 1] Expanding Prompt for: "${description}"`);
        const expandedPrompt = await expandPrompt(description);

        console.log(`[Stage 2] Generating Image with Gemini Imagen...`);
        const generatedImage = await generateImage(expandedPrompt);
        console.log(`✅ Image generated! Size: ${generatedImage.bytes.length} bytes`);

        console.log(`[Stage 3] Uploading Image to Freeimage.host to get public URL...`);
        const base64Image = Buffer.from(generatedImage.bytes).toString('base64');
        const publicImageUrl = await uploadToFreeImageHost(base64Image);
        console.log(`✅ Uploaded to Freeimage.host! Public URL: ${publicImageUrl}`);

        console.log(`[Stage 4] Appending External Image Block to Page ${pageId}...`);
        const notion = new Client({ auth: notionApiKey });
        await notion.blocks.children.append({
            block_id: pageId,
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
                        rich_text: [{ type: 'text', text: { content: `Prompt: ${expandedPrompt}` } }],
                    },
                },
            ],
        });

        console.log("\n🎉 Embedded Successfully! Check your Notion Page.");
    } catch (e: any) {
        console.error(`\n❌ Error during test:`, e.stack || e.message);
    }
}

testWorkerLogic();
