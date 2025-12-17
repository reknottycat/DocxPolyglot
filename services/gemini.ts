import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Translates a batch of text segments to the target language.
 * Tries to use the lighter model first to save tokens/cost.
 */
export const translateBatch = async (
  texts: string[],
  targetLanguage: string
): Promise<{ items: string[], tokens: number }> => {
  if (texts.length === 0) return { items: [], tokens: 0 };

  // Strategy: Try Flash Lite first for efficiency, fallback to 2.5 Flash for robustness
  const models = ["gemini-flash-lite-latest", "gemini-2.5-flash"];
  
  // Optimized prompt to save tokens
  const prompt = `Translate these text segments into ${targetLanguage}.
Rules:
1. Maintain formatting, tone, and meaning.
2. Keep proper nouns/symbols as is if appropriate.
3. Return a JSON string array matching input length.

Segments:
${JSON.stringify(texts)}`;

  let lastError;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
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
      if (!jsonText) {
        throw new Error(`Empty response from ${model}`);
      }

      const translatedArray = JSON.parse(jsonText) as string[];
      const tokens = response.usageMetadata?.totalTokenCount || 0;

      // Safety check for length mismatch
      if (translatedArray.length !== texts.length) {
          console.warn(`Mismatch in translation length with ${model}. Expected ${texts.length}, got ${translatedArray.length}.`);
          
          // If mismatch is severe, maybe throw to try next model? 
          // For now, we patch it up to avoid breaking the document.
          if (translatedArray.length < texts.length) {
              return { 
                items: [...translatedArray, ...texts.slice(translatedArray.length)], 
                tokens 
              };
          } else {
              return { 
                items: translatedArray.slice(0, texts.length), 
                tokens 
              };
          }
      }

      return { items: translatedArray, tokens };

    } catch (error) {
      console.warn(`Model ${model} failed:`, error);
      lastError = error;
      // Continue to next model
    }
  }

  // If all models fail, return original texts (prevent data loss) and 0 tokens
  console.error("All models failed for batch.", lastError);
  return { items: texts, tokens: 0 };
};