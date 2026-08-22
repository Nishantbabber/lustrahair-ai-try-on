import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TryOnProvider, TryOnInput, TryOnOutput, Look, HairColor } from "@/types/tryon";
import { buildTryOnPrompt } from "./prompts";

function extractBase64(imageData: string): { mimeType: string; data: string } {
  if (imageData.startsWith("data:")) {
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid image data format. Expected base64 data URL.");
    }
    return { mimeType: match[1], data: match[2] };
  }
  throw new Error("Image must be provided as a data URL");
}

function extractImageFromResponse(response: {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mime_type?: string; data?: string };
        image?: { mimeType?: string; data?: string };
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}): string | null {
  if (!response) return null;

  if (response.promptFeedback?.blockReason) {
    throw new Error(
      `Image generation was blocked by safety filters: ${response.promptFeedback.blockReason}`
    );
  }

  const candidates = response.candidates ?? [];
  for (const candidate of candidates) {
    if (candidate.finishReason === "SAFETY") {
      throw new Error(
        "Image generation was blocked by safety settings. Please try a different photo or look."
      );
    }

    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      // 1. camelCase inlineData
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
      // 2. snake_case inline_data
      if (part.inline_data?.data) {
        const mime = part.inline_data.mime_type ?? "image/png";
        return `data:${mime};base64,${part.inline_data.data}`;
      }
      // 3. image object
      if (part.image?.data) {
        const mime = part.image.mimeType ?? "image/png";
        return `data:${mime};base64,${part.image.data}`;
      }
      // 4. Data URL embedded in text output
      if (typeof part.text === "string" && part.text.includes("data:image/")) {
        const match = part.text.match(/data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+/);
        if (match) {
          return match[0];
        }
      }
    }
  }

  return null;
}

export const geminiProvider: TryOnProvider = {
  name: "gemini",

  async generateTryOn(
    input: TryOnInput,
    look: Look,
    color: HairColor
  ): Promise<TryOnOutput> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server");
    }

    const modelName =
      process.env.GEMINI_MODEL?.trim().replace(/['"]/g, "") ||
      "gemini-2.5-flash-image";

    // If an OpenRouter key or model format (e.g. google/gemini-3.1-flash-image) is provided, delegate to OpenRouter
    if (apiKey.startsWith("sk-or-") || modelName.includes("/")) {
      const { openrouterProvider } = await import("./openrouter-provider");
      return openrouterProvider.generateTryOn(input, look, color);
    }

    console.log(`[TRYON] Gemini request starting`);
    console.log(`[TRYON] Gemini model = ${modelName}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        // @ts-expect-error responseModalities is supported by image-generation capable models
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const { mimeType, data } = extractBase64(input.originalImage);
    const prompt = buildTryOnPrompt(look, color);

    let result;
    try {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data,
          },
        },
        { text: prompt },
      ]);
      console.log(`[TRYON] Gemini returned successfully = true`);
    } catch (err) {
      console.log(`[TRYON] Gemini returned successfully = false`);
      console.error(
        `[TRYON] Gemini API error:`,
        err instanceof Error ? err.message : err
      );
      throw err;
    }

    const response = result.response;
    const resultImage = extractImageFromResponse(response);
    const hasImage = Boolean(resultImage);

    console.log(`[TRYON] Generated image found = ${hasImage}`);

    if (!resultImage) {
      let returnedText = "";
      try {
        returnedText = response.text();
      } catch {
        // ignore
      }
      const detail = returnedText
        ? ` Model response text: "${returnedText.slice(0, 200)}"`
        : "";
      throw new Error(
        `Gemini did not return an image.${detail} The model response did not contain image data. Please check the model name or prompt.`
      );
    }

    return {
      resultImage,
      provider: "gemini",
      processingTimeMs: Date.now() - start,
    };
  },
};
