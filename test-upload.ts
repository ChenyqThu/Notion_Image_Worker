import dotenv from "dotenv";

dotenv.config();

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";

async function uploadDummyImageToNotion() {
	const notionApiKey = process.env.NOTION_API_KEY;
	if (!notionApiKey) throw new Error("NOTION_API_KEY is required");

	const dummyImage = Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
		"base64",
	);

	const createResponse = await fetch(`${NOTION_API_BASE_URL}/file_uploads`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${notionApiKey}`,
			"Notion-Version": NOTION_API_VERSION,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			filename: "dummy.png",
			content_type: "image/png",
			mode: "single_part",
		}),
	});

	if (!createResponse.ok) {
		throw new Error(
			`Create upload failed: ${createResponse.status} ${await createResponse.text()}`,
		);
	}

	const createPayload = (await createResponse.json()) as { id?: string; upload_url?: string };
	if (!createPayload.id || !createPayload.upload_url) {
		throw new Error(`Invalid create payload: ${JSON.stringify(createPayload)}`);
	}

	const form = new FormData();
	form.append("file", new Blob([dummyImage], { type: "image/png" }), "dummy.png");
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

	console.log(`Success, file_upload_id=${createPayload.id}`);
}

uploadDummyImageToNotion().catch((err) => {
	console.error(err.stack || err.message);
	process.exitCode = 1;
});
