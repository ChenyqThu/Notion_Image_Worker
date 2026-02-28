import { expandPrompt, generateImage } from "./src/gemini";
import dotenv from "dotenv";

// Load local .env manually since we aren't using the notion worker runtime
dotenv.config();

async function testWorkerLogic() {
    console.log("=== 🚀 Starting Local Integration Test ===\n");

    const description = "A cute cat hacking on a laptop in a cyberpunk city";
    const pageId = "12345678-abcd-efgh-ijkl-1234567890ab"; // Dummy page ID for local display

    try {
        console.log(`[Stage 1] Expanding Prompt for: "${description}"`);
        const expandedPrompt = await expandPrompt(description);
        console.log(`\n✅ Generated Nano Banana Pro Prompt:\n-----------------------------------\n${expandedPrompt}\n-----------------------------------\n`);

        console.log(`[Stage 2] Generating Image with Gemini Imagen...`);
        const generatedImage = await generateImage(expandedPrompt);

        const base64Image = Buffer.from(generatedImage.bytes).toString('base64');
        const dataUri = `data:${generatedImage.mimeType};base64,${base64Image}`;

        console.log(`\n✅ Image successfully generated! (Size: ${base64Image.length} bytes)`);
        console.log(`🔍 Data URI Prefix: ${dataUri.substring(0, 100)}...`);

        console.log(`\n[Stage 3] The final script will upload this Base64 to Notion Page: ${pageId}`);
        console.log("\n🎉 Local logic test passed successfully!");
    } catch (e: any) {
        console.error(`\n❌ Error during test:`, e.message);
    }
}

testWorkerLogic();
