import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Translates a batch of text segments to the target language using a specific model.
 */
export const translateBatch = async (
  texts: string[],
  targetLanguage: string,
  modelId: string
): Promise<{ items: string[], tokens: number }> => {
  if (texts.length === 0) return { items: [], tokens: 0 };

  // Optimized prompt to minimize input tokens
  const prompt = `Translate to ${targetLanguage}. Return JSON array.
[${texts.map(t => JSON.stringify(t)).join(",")}]`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");

    const translatedArray = JSON.parse(jsonText) as string[];
    const tokens = response.usageMetadata?.totalTokenCount || 0;

    // Length check and padding
    if (translatedArray.length !== texts.length) {
      if (translatedArray.length < texts.length) {
        return { items: [...translatedArray, ...texts.slice(translatedArray.length)], tokens };
      } else {
        return { items: translatedArray.slice(0, texts.length), tokens };
      }
    }

    return { items: translatedArray, tokens };
  } catch (error) {
    console.error(`Translation error with ${modelId}:`, error);
    // Fallback to original text on error
    return { items: texts, tokens: 0 };
  }
};