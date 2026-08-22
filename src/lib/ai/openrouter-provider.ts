import type { TryOnProvider, TryOnInput, TryOnOutput, Look, HairColor } from "@/types/tryon";
import { buildTryOnPrompt } from "./prompts";

interface OpenRouterResponse {
  id?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: {
      role?: string;
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
            image_url?: { url?: string };
            url?: string;
            b64_json?: string;
          }>;
      images?: Array<
        | string
        | {
            url?: string;
            image_url?: { url?: string };
            b64_json?: string;
          }
      >;
      parts?: Array<{
        type?: string;
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mime_type?: string; data?: string };
        image?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message?: string;
    code?: string | number;
  };
}

function extractImageFromOpenRouterResponse(response: OpenRouterResponse): string | null {
  if (!response) return null;

  // 1. Direct choices structure
  const choices = response.choices ?? [];
  for (const choice of choices) {
    const message = choice.message;
    if (!message) continue;

    // Check message.images array
    if (Array.isArray(message.images) && message.images.length > 0) {
      for (const img of message.images) {
        if (typeof img === "string" && img.startsWith("data:image/")) {
          return img;
        }
        if (typeof img === "string" && img.startsWith("http")) {
          return img;
        }
        if (typeof img === "object" && img !== null) {
          if (img.url) return img.url;
          if (img.image_url?.url) return img.image_url.url;
          if (img.b64_json) return `data:image/png;base64,${img.b64_json}`;
        }
      }
    }

    // Check message.parts array
    if (Array.isArray(message.parts) && message.parts.length > 0) {
      for (const part of message.parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? "image/png";
          return `data:${mime};base64,${part.inlineData.data}`;
        }
        if (part.inline_data?.data) {
          const mime = part.inline_data.mime_type ?? "image/png";
          return `data:${mime};base64,${part.inline_data.data}`;
        }
        if (part.image?.data) {
          const mime = part.image.mimeType ?? "image/png";
          return `data:${mime};base64,${part.image.data}`;
        }
      }
    }

    // Check message.content
    const content = message.content;
    if (typeof content === "string") {
      // 1. Markdown with base64 data URL: ![...](data:image/...)
      const mdDataUrlMatch = content.match(/!\[.*?\]\((data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+)\)/);
      if (mdDataUrlMatch) {
        return mdDataUrlMatch[1];
      }

      // 2. Markdown with http(s) URL: ![...](https://...)
      const mdHttpMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
      if (mdHttpMatch) {
        return mdHttpMatch[1];
      }

      // 3. Raw base64 data URL
      const dataUrlMatch = content.match(/data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+/);
      if (dataUrlMatch) {
        return dataUrlMatch[0];
      }

      // 4. Raw http image URL in content
      const httpUrlMatch = content.match(/https?:\/\/[^\s"']+\.(?:png|jpg|jpeg|webp)(?:\?[^\s"']*)?/i);
      if (httpUrlMatch) {
        return httpUrlMatch[0];
      }
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "image_url" && part.image_url?.url) {
          return part.image_url.url;
        }
        if (part.url) {
          return part.url;
        }
        if (part.b64_json) {
          return `data:image/png;base64,${part.b64_json}`;
        }
        if (typeof part.text === "string") {
          const match = part.text.match(/data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+/);
          if (match) return match[0];
        }
      }
    }
  }

  // 2. Standard image generation response format: data[0].url or data[0].b64_json
  if (Array.isArray(response.data) && response.data.length > 0) {
    const first = response.data[0];
    if (first.url) return first.url;
    if (first.b64_json) return `data:image/png;base64,${first.b64_json}`;
  }

  return null;
}

export const openrouterProvider: TryOnProvider = {
  name: "openrouter",

  async generateTryOn(
    input: TryOnInput,
    look: Look,
    color: HairColor
  ): Promise<TryOnOutput> {
    const apiKey =
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        "OpenRouter API key is not configured. Please add OPENROUTER_API_KEY (or GEMINI_API_KEY) to .env.local"
      );
    }

    const modelName =
      process.env.OPENROUTER_MODEL?.trim().replace(/['"]/g, "") ||
      process.env.GEMINI_MODEL?.trim().replace(/['"]/g, "") ||
      "google/gemini-3.1-flash-image";

    const maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS) || 2048;

    console.log(`[TRYON] OpenRouter request starting`);
    console.log(`[TRYON] OpenRouter model = ${modelName}`);
    console.log(`[TRYON] OpenRouter max_tokens = ${maxTokens}`);

    const prompt = buildTryOnPrompt(look, color);
    const start = Date.now();

    const requestBody = {
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: input.originalImage,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: maxTokens,
      modalities: ["image", "text"],
    };

    let responseData: OpenRouterResponse;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "LustraHair AI Try-On",
        },
        body: JSON.stringify(requestBody),
      });

      responseData = (await response.json()) as OpenRouterResponse;

      if (!response.ok) {
        console.log(`[TRYON] OpenRouter returned status = ${response.status}`);
        const errMsg =
          responseData.error?.message ||
          `OpenRouter API returned HTTP ${response.status}`;
        console.error(`[TRYON] OpenRouter error:`, errMsg);
        throw new Error(`OpenRouter error: ${errMsg}`);
      }

      console.log(`[TRYON] OpenRouter returned successfully = true`);
    } catch (err) {
      console.log(`[TRYON] OpenRouter request failed`);
      console.error(
        `[TRYON] OpenRouter error:`,
        err instanceof Error ? err.message : err
      );
      throw err;
    }

    const resultImage = extractImageFromOpenRouterResponse(responseData);
    const hasImage = Boolean(resultImage);

    console.log(`[TRYON] Generated image found = ${hasImage}`);

    if (!resultImage) {
      let returnedText = "";
      try {
        const choice = responseData.choices?.[0];
        if (typeof choice?.message?.content === "string") {
          returnedText = choice.message.content;
        }
      } catch {
        // ignore
      }

      const detail = returnedText
        ? ` Model response text: "${returnedText.slice(0, 250)}"`
        : "";

      throw new Error(
        `OpenRouter did not return an image.${detail} Please verify the model '${modelName}' supports image generation output.`
      );
    }

    return {
      resultImage,
      provider: "openrouter",
      processingTimeMs: Date.now() - start,
    };
  },
};
