import dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";
const dummyImage = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
	"base64",
);

async function testNotionUpload(): Promise<void> {
	const notionApiKey = process.env.NOTION_API_KEY;
	const pageId = process.env.TEST_PAGE_ID;
	if (!notionApiKey) throw new Error("NOTION_API_KEY is required");

	const mimeType = "image/png";
	const fileName = `notion-upload-smoke-${Date.now()}.png`;

	console.log("Step 1: creating upload object...");
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
			`Create upload failed: ${createResponse.status} ${await createResponse.text()}`,
		);
	}

	const createPayload = (await createResponse.json()) as {
		id?: string;
		upload_url?: string;
	};
	if (!createPayload.id || !createPayload.upload_url) {
		throw new Error(`Invalid create payload: ${JSON.stringify(createPayload)}`);
	}
	console.log(`Created file_upload_id=${createPayload.id}`);

	console.log("Step 2: uploading file bytes...");
	const form = new FormData();
	form.append("file", new Blob([dummyImage], { type: mimeType }), fileName);
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
			`Send upload failed: ${sendResponse.status} ${await sendResponse.text()}`,
		);
	}
	console.log("Upload bytes success.");

	if (pageId) {
		console.log(`Step 3: appending image block to page ${pageId}...`);
		const notion = new Client({ auth: notionApiKey });
		await notion.blocks.children.append({
			block_id: pageId,
			children: [
				{
					object: "block",
					type: "image",
					image: {
						type: "file_upload",
						file_upload: { id: createPayload.id },
					},
				} as any,
			],
		});
		console.log("Append block success.");
	} else {
		console.log("TEST_PAGE_ID not set; skipped append-to-page step.");
	}
}

testNotionUpload().catch((err) => {
	console.error(err.stack || err.message);
	process.exitCode = 1;
});
