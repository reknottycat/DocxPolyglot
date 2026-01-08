
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { APIConfig } from "../types";

/**
 * 翻译批处理入口
 */
export const translateBatch = async (
  texts: string[],
  targetLanguage: string,
  config: APIConfig
): Promise<{ items: string[], tokens: number }> => {
  if (texts.length === 0) return { items: [], tokens: 0 };

  const prompt = `Task: Translate the following JSON string array into ${targetLanguage}.
Requirements:
1. Return ONLY a valid JSON array of strings.
2. Length must be exactly ${texts.length}.
3. Keep the original structure. No explanation.

Input: ${JSON.stringify(texts)}`;

  if (config.provider === 'gemini') {
    return translateWithGeminiSDK(texts, targetLanguage, config, prompt);
  } else {
    return translateWithOpenAISDK(texts, targetLanguage, config, prompt);
  }
};

/**
 * 测试连接：使用官方 OpenAI SDK 逻辑
 */
export const testConnection = async (config: APIConfig): Promise<boolean> => {
  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true // 允许在浏览器端使用
    });

    const completion = await client.chat.completions.create({
      model: config.modelId,
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 5,
    });

    return !!completion.choices[0]?.message?.content;
  } catch (e) {
    console.error("SDK Connection Error:", e);
    return false;
  }
};

async function translateWithGeminiSDK(
  texts: string[],
  targetLanguage: string,
  config: APIConfig,
  prompt: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: config.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const translatedArray = JSON.parse(response.text || "[]") as string[];
    const tokens = response.usageMetadata?.totalTokenCount || 0;
    return { items: normalizeResult(translatedArray, texts), tokens };
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return { items: texts, tokens: 0 };
  }
}

async function translateWithOpenAISDK(
  texts: string[],
  targetLanguage: string,
  config: APIConfig,
  prompt: string
) {
  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true
    });

    const completion = await client.chat.completions.create({
      model: config.modelId,
      messages: [
        { role: 'system', content: 'You are a professional translator. Output only JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4096,
      stream: false
    });

    // 处理推理内容 (如 DeepSeek-R1)
    const reasoning = (completion.choices[0]?.message as any).reasoning_content;
    if (reasoning) {
      console.debug("Model Reasoning:", reasoning);
    }

    const content = completion.choices[0]?.message?.content || "";
    let cleanJson = content.trim();
    
    // 清洗 Markdown 代码块
    if (cleanJson.includes('```')) {
      cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    // 提取数组部分
    const start = cleanJson.indexOf('[');
    const end = cleanJson.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      cleanJson = cleanJson.substring(start, end + 1);
    }

    const translatedArray = JSON.parse(cleanJson);
    const tokens = completion.usage?.total_tokens || 0;

    return { items: normalizeResult(translatedArray, texts), tokens };
  } catch (error: any) {
    console.error("OpenAI SDK Translation Error:", error);
    return { items: texts, tokens: 0 };
  }
}

function normalizeResult(translated: string[], original: string[]): string[] {
  if (!Array.isArray(translated)) return original;
  if (translated.length === original.length) return translated;
  if (translated.length < original.length) {
    return [...translated, ...original.slice(translated.length)];
  }
  return translated.slice(0, original.length);
}
