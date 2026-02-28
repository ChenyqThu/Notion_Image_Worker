import { expandPrompt, generateImage } from "./src/gemini";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";

// Load local .env manually since we aren't using the notion worker runtime
dotenv.config();

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";

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

async function uploadImageToNotion(
    notionApiKey: string,
    imageBytes: Uint8Array,
    mimeType: string,
): Promise<string> {
    const fileName = `e2e-test-${Date.now()}.${extensionFromMimeType(mimeType)}`;
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
        throw new Error(
            `Notion file upload create failed: ${createResponse.status} ${await createResponse.text()}`,
        );
    }

    const createPayload = (await createResponse.json()) as { id?: string; upload_url?: string };
    if (!createPayload.id || !createPayload.upload_url) {
        throw new Error(`Notion file upload create invalid payload: ${JSON.stringify(createPayload)}`);
    }

    const form = new FormData();
    form.append("file", new Blob([Buffer.from(imageBytes)], { type: mimeType }), fileName);
    const sendResponse = await fetch(createPayload.upload_url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Notion-Version": NOTION_API_VERSION,
        },
        body: form,
    });

    if (!sendResponse.ok) {
        throw new Error(
            `Notion file upload send failed: ${sendResponse.status} ${await sendResponse.text()}`,
        );
    }

    return createPayload.id;
}

async function testWorkerLogic() {
    console.log("=== Starting End-to-End Notion File Upload Test ===\n");

    try {
        const pageId = process.env.TEST_PAGE_ID;
        const notionApiKey = process.env.NOTION_API_KEY;
        const description = process.env.TEST_PROMPT || "A cute cat hacking on a laptop in a cyberpunk city";
        if (!notionApiKey) throw new Error("NOTION_API_KEY is not set in .env");
        if (!pageId) throw new Error("TEST_PAGE_ID is not set in .env");

        console.log(`[Stage 1] Expanding Prompt for: "${description}"`);
        const expandedPrompt = await expandPrompt(description);

        console.log(`[Stage 2] Generating image with Gemini...`);
        const generatedImage = await generateImage(expandedPrompt);
        console.log(`✅ Image generated! Size: ${generatedImage.bytes.length} bytes`);

        console.log(`[Stage 3] Uploading image bytes via Notion File Upload API...`);
        const fileUploadId = await uploadImageToNotion(
            notionApiKey,
            generatedImage.bytes,
            generatedImage.mimeType,
        );
        console.log(`✅ Notion file_upload id: ${fileUploadId}`);

        console.log(`[Stage 4] Appending file_upload image block to page ${pageId}...`);
        const notion = new Client({ auth: notionApiKey });
        await notion.blocks.children.append({
            block_id: pageId,
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
                        rich_text: [{ type: 'text', text: { content: `Prompt: ${expandedPrompt}` } }],
                    },
                },
            ],
        });

        console.log("\n✅ Embedded successfully. Check your Notion page.");
    } catch (e: any) {
        console.error(`\n❌ Error during test:`, e.stack || e.message);
        process.exitCode = 1;
    }
}

testWorkerLogic();
