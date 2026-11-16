import sharp from "sharp";
import { inspectImageBuffer, MAX_IMAGE_BINARY_BYTES } from "@/lib/image-validation";

export const CLOUDFLARE_DEFAULT_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export const CLOUDFLARE_MAX_REFERENCE_DIMENSION = 511; // Must be strictly smaller than 512px
export const CLOUDFLARE_OUTPUT_DIMENSION = 512;
export const CLOUDFLARE_TIMEOUT_MS = 60000;

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  model: string;
}

export interface ResizeImageResult {
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  wasResized: boolean;
}

export interface CloudflareGenerationResult {
  success: boolean;
  image?: string; // data URL
  model: string;
  elapsedMs: number;
  neurons?: number;
  error?: string;
  code?: string;
}

/**
 * Validates and retrieves server-side Cloudflare environment variables.
 * Never exposes credentials to client.
 */
export function getCloudflareConfig(): { config: CloudflareConfig | null; error?: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const model = process.env.CLOUDFLARE_IMAGE_MODEL?.trim() || CLOUDFLARE_DEFAULT_MODEL;

  if (!accountId || !apiToken) {
    return {
      config: null,
      error: "Cloudflare Workers AI credentials (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN) are not configured.",
    };
  }

  return {
    config: {
      accountId,
      apiToken,
      model,
    },
  };
}

/**
 * Checks whether the test endpoint is permitted in the current environment.
 * Development: enabled by default.
 * Production: blocked unless ENABLE_CLOUDFLARE_TEST_ROUTE === "true".
 */
export function isCloudflareTestAllowed(): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    return true;
  }
  return process.env.ENABLE_CLOUDFLARE_TEST_ROUTE === "true";
}

/**
 * Resizes the image buffer if either dimension is >= 512 pixels so both dimensions are < 512 pixels.
 * Preserves aspect ratio.
 * Does not upscale small images unnecessarily.
 * Validates the actual decoded image and supported format (JPEG, PNG, WEBP).
 */
export async function prepareReferenceImage(buffer: Buffer): Promise<ResizeImageResult> {
  if (buffer.length > MAX_IMAGE_BINARY_BYTES) {
    throw new Error(`Image file exceeds limit of ${MAX_IMAGE_BINARY_BYTES / (1024 * 1024)} MB.`);
  }

  const inspected = inspectImageBuffer(buffer);
  if (!inspected) {
    throw new Error("Invalid image file header. Only JPEG, PNG, and WEBP images are supported.");
  }

  const { format, width: originalWidth, height: originalHeight } = inspected;
  const mimeType =
    format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";

  // Requirement: Reference image dimensions must both be smaller than 512 pixels (< 512, max 511).
  // Do not upscale small images unnecessarily.
  const needsDownscale =
    originalWidth > CLOUDFLARE_MAX_REFERENCE_DIMENSION ||
    originalHeight > CLOUDFLARE_MAX_REFERENCE_DIMENSION;

  if (!needsDownscale) {
    return {
      buffer,
      mimeType,
      originalWidth,
      originalHeight,
      width: originalWidth,
      height: originalHeight,
      wasResized: false,
    };
  }

  // Downscale preserving aspect ratio using Sharp (fit: 'inside', withoutEnlargement: true)
  const imageInstance = sharp(buffer).resize({
    width: CLOUDFLARE_MAX_REFERENCE_DIMENSION,
    height: CLOUDFLARE_MAX_REFERENCE_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  let resizedBuffer: Buffer;
  if (format === "jpeg") {
    resizedBuffer = await imageInstance.jpeg({ quality: 90 }).toBuffer();
  } else if (format === "png") {
    resizedBuffer = await imageInstance.png().toBuffer();
  } else {
    resizedBuffer = await imageInstance.webp({ quality: 90 }).toBuffer();
  }

  // Re-inspect resized buffer to obtain exact resulting dimensions
  const meta = await sharp(resizedBuffer).metadata();
  const width = meta.width ?? originalWidth;
  const height = meta.height ?? originalHeight;

  return {
    buffer: resizedBuffer,
    mimeType,
    originalWidth,
    originalHeight,
    width,
    height,
    wasResized: true,
  };
}

/**
 * Executes image generation on Cloudflare Workers AI with FLUX.2 Klein 4B.
 * - Enforces multipart/form-data.
 * - Does not manually set Content-Type header.
 * - Fixed 4-step inference; no unsupported 'steps' parameter.
 * - Returns generated image as a displayable data URL, model, elapsed time, and usage/neurons.
 * - Never retries paid generations automatically.
 * - Enforces timeout via AbortSignal.
 */
export async function runCloudflareImageInference(params: {
  config: CloudflareConfig;
  imageBuffer: Buffer;
  mimeType: string;
  prompt: string;
  signal?: AbortSignal;
}): Promise<CloudflareGenerationResult> {
  const { config, imageBuffer, mimeType, prompt, signal } = params;

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/ai/run/${config.model}`;

  const formData = new FormData();
  formData.append("prompt", prompt);
  // Send reference image as binary in input_image_0
  const arrayBuffer = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: mimeType });
  formData.append("input_image_0", blob, "reference_image");
  formData.append("width", String(CLOUDFLARE_OUTPUT_DIMENSION));
  formData.append("height", String(CLOUDFLARE_OUTPUT_DIMENSION));

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: formData,
      signal,
    });

    const elapsedMs = Date.now() - startTime;

    // Check Cloudflare Neurons usage from header or response
    const neuronsHeader = response.headers.get("cf-ai-neurons");
    let neurons: number | undefined = neuronsHeader ? parseFloat(neuronsHeader) : undefined;
    if (neurons !== undefined && isNaN(neurons)) {
      neurons = undefined;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();

      if (!response.ok || json.success === false) {
        const errorMsg =
          json.errors && Array.isArray(json.errors) && json.errors.length > 0
            ? json.errors.map((e: { message?: string }) => e.message || "Unknown error").join(", ")
            : `Cloudflare API returned status ${response.status} (${response.statusText || "Error"})`;

        return {
          success: false,
          model: config.model,
          elapsedMs,
          neurons,
          error: errorMsg,
          code: response.status === 401 || response.status === 403 ? "AUTH_ERROR" : "UPSTREAM_ERROR",
        };
      }

      // Check result.image (base64 string)
      const base64Image = json.result?.image;
      if (typeof base64Image === "string" && base64Image.length > 0) {
        // Normalize as data URL
        const dataUrl = base64Image.startsWith("data:")
          ? base64Image
          : `data:image/jpeg;base64,${base64Image}`;

        return {
          success: true,
          image: dataUrl,
          model: config.model,
          elapsedMs,
          neurons,
        };
      }

      return {
        success: false,
        model: config.model,
        elapsedMs,
        neurons,
        error: "Upstream response did not contain the expected image payload.",
        code: "INVALID_RESPONSE",
      };
    } else if (contentType.startsWith("image/")) {
      // Cloudflare returned raw binary image stream
      if (!response.ok) {
        return {
          success: false,
          model: config.model,
          elapsedMs,
          neurons,
          error: `Cloudflare API returned HTTP ${response.status}`,
          code: "UPSTREAM_ERROR",
        };
      }

      const arrayBuf = await response.arrayBuffer();
      const outputBuffer = Buffer.from(arrayBuf);
      const dataUrl = `data:${contentType};base64,${outputBuffer.toString("base64")}`;

      return {
        success: true,
        image: dataUrl,
        model: config.model,
        elapsedMs,
        neurons,
      };
    } else {
      return {
        success: false,
        model: config.model,
        elapsedMs,
        neurons,
        error: `Unexpected response content-type: ${contentType}`,
        code: "INVALID_RESPONSE",
      };
    }
  } catch (err: unknown) {
    const elapsedMs = Date.now() - startTime;
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        model: config.model,
        elapsedMs,
        error: "Generation request timed out.",
        code: "TIMEOUT",
      };
    }

    return {
      success: false,
      model: config.model,
      elapsedMs,
      error: "Failed to communicate with Cloudflare Workers AI service.",
      code: "NETWORK_ERROR",
    };
  }
}
