"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandPrompt = expandPrompt;
exports.generateImage = generateImage;
const genai_1 = require("@google/genai");
const ai = new genai_1.GoogleGenAI({});
const SYSTEM_PROMPT = `
You are an expert prompt engineer specializing in creating prompts for the Nano Banana Pro (and Imagen) image generation model.
Your task is to take a simple user description and expand it into a highly detailed, professional prompt.

Follow these guidelines for the expanded prompt:
1. **Scene**: Describe the overall scene and atmosphere.
2. **Subject**: Detail the subject's appearance, clothing, pose, and expression.
3. **Environment**: Describe the background, setting, and props.
4. **Lighting**: Specify the light source, quality, and mood (e.g., golden hour, cinematic, soft studio lighting).
5. **Camera/Style**: Mention camera details (e.g., 50mm lens, f/1.8), perspective, and the overall artistic style (photorealistic, Ukiyo-e, anime, etc.).

Return ONLY the final expanded prompt. Do not include any conversational filler.
`;
async function expandPrompt(shortDescription) {
    const promptModel = process.env.GEMINI_PROMPT_MODEL || 'gemini-3-flash';
    const response = await ai.models.generateContent({
        model: promptModel,
        contents: shortDescription,
        config: {
            systemInstruction: SYSTEM_PROMPT,
        }
    });
    if (!response.text) {
        throw new Error("Failed to generate expanded prompt.");
    }
    return response.text.trim();
}
async function generateImage(expandedPrompt) {
    const imageModel = process.env.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002';
    // Note: Use the appropriate Imagen model available in the @google/genai SDK
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: expandedPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1'
        }
    });
    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Failed to generate image.");
    }
    const imageObj = response.generatedImages[0].image;
    if (!imageObj) {
        throw new Error("No image object returned");
    }
    const base64Image = imageObj.imageBytes;
    if (!base64Image) {
        throw new Error("No image bytes returned");
    }
    // Convert base64 string to Uint8Array
    const binaryString = atob(base64Image);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
