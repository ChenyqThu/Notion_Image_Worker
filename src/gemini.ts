import { GoogleGenAI, Modality } from "@google/genai";

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

export async function expandPrompt(shortDescription: string): Promise<string> {
	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
	const promptModel = process.env.GEMINI_PROMPT_MODEL || "gemini-3-flash";
	const response = await ai.models.generateContent({
		model: promptModel,
		contents: shortDescription,
		config: {
			systemInstruction: SYSTEM_PROMPT,
		},
	});

	if (!response.text) {
		throw new Error("Failed to generate expanded prompt.");
	}
	return response.text.trim();
}

function decodeBinaryString(binaryString: string): Uint8Array {
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

type GeneratedImage = {
	bytes: Uint8Array;
	mimeType: string;
};

export async function generateImage(expandedPrompt: string): Promise<GeneratedImage> {
	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
	const imageModel =
		process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";
	const imageAspectRatio = process.env.GEMINI_IMAGE_ASPECT_RATIO || "1:1";
	const response = await ai.models.generateContent({
		model: imageModel,
		contents: expandedPrompt,
		config: {
			responseModalities: [Modality.IMAGE],
			imageConfig: {
				aspectRatio: imageAspectRatio,
			},
		},
	});

	const parts = response.candidates?.[0]?.content?.parts ?? [];
	for (const part of parts) {
		const inlineData = part.inlineData;
		if (inlineData?.data) {
			return {
				bytes: decodeBinaryString(atob(inlineData.data)),
				mimeType: inlineData.mimeType || "image/png",
			};
		}
	}

	if (response.data) {
		return {
			bytes: decodeBinaryString(response.data),
			mimeType: "image/png",
		};
	}

	throw new Error("Failed to generate image bytes from Gemini response.");
}
