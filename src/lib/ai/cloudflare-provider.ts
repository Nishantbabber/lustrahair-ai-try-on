import type { TryOnProvider, TryOnInput, TryOnOutput, Look, HairColor, TransformationMode } from "@/types/tryon";
import { buildTryOnPrompt } from "./prompts";
import {
  getCloudflareConfig,
  prepareReferenceImage,
  runCloudflareImageInference,
} from "@/lib/cloudflare/client";

function extractBase64(imageData: string): { mimeType: string; buffer: Buffer } {
  if (imageData.startsWith("data:")) {
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid image data format. Expected base64 data URL.");
    }
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], "base64"),
    };
  }
  throw new Error("Image must be provided as a base64 data URL.");
}

export const cloudflareProvider: TryOnProvider = {
  name: "cloudflare",

  async generateTryOn(
    input: TryOnInput,
    look?: Look | null,
    color?: HairColor | null,
    mode: TransformationMode = "both",
    signal?: AbortSignal
  ): Promise<TryOnOutput> {
    const startTime = Date.now();

    // 1. Validate server-side credentials
    const { config, error: configError } = getCloudflareConfig();
    if (!config) {
      throw new Error(configError || "Cloudflare credentials are not configured on the server.");
    }

    // 2. Extract and decode input image
    const { buffer: rawBuffer } = extractBase64(input.originalImage);

    // 3. Prepare reference image according to FLUX.2 Klein 4B requirements (< 512px, aspect ratio preserved)
    const prepared = await prepareReferenceImage(rawBuffer);

    // 4. Construct prompt preserving transformation mode and tenant specifics
    const prompt = buildTryOnPrompt(look, color, mode);

    console.log(
      `[CLOUDFLARE_PROVIDER] Generating try-on — mode: ${mode}, model: ${config.model}, imageSize: ${prepared.width}x${prepared.height}, wasResized: ${prepared.wasResized}`
    );

    // 5. Execute Cloudflare Workers AI inference (no automatic retry for paid generation)
    const result = await runCloudflareImageInference({
      config,
      imageBuffer: prepared.buffer,
      mimeType: prepared.mimeType,
      prompt,
      originalWidth: prepared.originalWidth,
      originalHeight: prepared.originalHeight,
      signal,
    });

    if (!result.success || !result.image) {
      const errorMsg = result.error || "Cloudflare Workers AI generation failed.";
      const error = new Error(errorMsg);
      // Attach code if available
      (error as Error & { code?: string }).code = result.code || "UPSTREAM_ERROR";
      throw error;
    }

    const elapsedMs = Date.now() - startTime;

    return {
      resultImage: result.image,
      provider: "cloudflare",
      processingTimeMs: elapsedMs,
    };
  },
};
