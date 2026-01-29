import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || 'placeholder';
const ai = new GoogleGenAI({
    apiKey: apiKey,
});

export const gemini = ai.models;

/**
 * Helper to generate structured JSON with fallback logic.
 */
export async function generateStructuredAnalysis(prompt: string) {
    const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError = null;

    for (const model of models) {
        try {
            console.log(`[GEMINI] Attempting analysis with model: ${model}`);
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            } as any);

            const text = response.text || "";
            if (!text) throw new Error(`${model} returned empty response`);

            try {
                return JSON.parse(text);
            } catch (e) {
                console.error(`[GEMINI] JSON parse failed even in JSON mode for ${model}:`, e);
                throw e;
            }
        } catch (error: any) {
            lastError = error;
            const isOverloaded = error?.status === 503 || error?.status === 429 || error?.message?.includes("overloaded") || error?.message?.includes("Too Many Requests");

            if (isOverloaded) {
                console.warn(`[GEMINI] Model ${model} is overloaded or rate-limited. Falling back...`);
                continue; // Try next model
            }

            console.error(`[GEMINI] Non-recoverable error with ${model}:`, error);
            throw error;
        }
    }

    throw lastError || new Error("All Gemini models failed");
}
