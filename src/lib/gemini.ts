import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY!;
const ai = new GoogleGenAI({
    apiKey: apiKey,
});

export const gemini = ai.models;

/**
 * Helper to generate structured JSON from Gemini 2.5 Flash Lite.
 */
export async function generateStructuredAnalysis(prompt: string) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });

        const text = response.text || "";
        if (!text) throw new Error("Gemini returned empty response");

        // Strip markdown blocks if present
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1] : text;

        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Gemini 2.5 Analysis Error:", error);
        throw error;
    }
}
