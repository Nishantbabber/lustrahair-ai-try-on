import { NextRequest, NextResponse } from "next/server";
import {
  getCloudflareConfig,
  isCloudflareTestAllowed,
  prepareReferenceImage,
  runCloudflareImageInference,
  CLOUDFLARE_TIMEOUT_MS,
} from "@/lib/cloudflare/client";
import { inspectImageBuffer, MAX_IMAGE_BINARY_BYTES } from "@/lib/image-validation";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Strict request-body limit: 6 MB (permits base64 string for 2 MB binary + multipart / JSON overhead)
const MAX_REQUEST_BODY_BYTES = 6 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 1000;

export async function POST(request: NextRequest) {
  // 1. Production environment gate
  if (!isCloudflareTestAllowed()) {
    return NextResponse.json(
      {
        success: false,
        code: "FORBIDDEN",
        error: "This test endpoint is disabled in production.",
      },
      { status: 403 }
    );
  }

  // 2. Validate server environment variables
  const { config, error: configError } = getCloudflareConfig();
  if (!config) {
    return NextResponse.json(
      {
        success: false,
        code: "CONFIG_ERROR",
        error: configError || "Cloudflare credentials are not configured on the server.",
      },
      { status: 500 }
    );
  }

  // 3. Enforce strict request-body size limit via Content-Length header
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const trimmed = contentLengthHeader.trim();
    if (!/^\d+$/.test(trimmed)) {
      return NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "Invalid Content-Length header." },
        { status: 400 }
      );
    }
    const contentLength = Number(trimmed);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "Invalid Content-Length header." },
        { status: 400 }
      );
    }
    if (contentLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: "PAYLOAD_TOO_LARGE",
          error: `Request body exceeds maximum size limit of ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)} MB.`,
        },
        { status: 413 }
      );
    }
  }

  // Read body with hard byte limit
  let bodyBuffer: Buffer;
  try {
    const arrayBuf = await request.arrayBuffer();
    if (arrayBuf.byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: "PAYLOAD_TOO_LARGE",
          error: `Request body exceeds maximum size limit of ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)} MB.`,
        },
        { status: 413 }
      );
    }
    bodyBuffer = Buffer.from(arrayBuf);
  } catch {
    return NextResponse.json(
      { success: false, code: "BAD_REQUEST", error: "Failed to read request payload." },
      { status: 400 }
    );
  }

  // 4. Parse incoming payload (supports application/json with base64 originalImage or multipart/form-data)
  const contentType = request.headers.get("content-type") || "";
  let prompt = "";
  let imageBuffer: Buffer | null = null;

  if (contentType.includes("application/json")) {
    let json: { prompt?: unknown; image?: unknown; originalImage?: unknown };
    try {
      json = JSON.parse(bodyBuffer.toString("utf-8"));
    } catch {
      return NextResponse.json(
        { success: false, code: "INVALID_JSON", error: "Malformed JSON payload." },
        { status: 400 }
      );
    }

    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      return NextResponse.json(
        { success: false, code: "INVALID_JSON", error: "Payload must be a JSON object." },
        { status: 400 }
      );
    }

    prompt = typeof json.prompt === "string" ? json.prompt.trim() : "";
    const rawImage = typeof json.image === "string" ? json.image : typeof json.originalImage === "string" ? json.originalImage : null;

    if (!rawImage) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "An image payload is required." },
        { status: 400 }
      );
    }

    // Extract base64
    const match = rawImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "Invalid image format. Expected base64 data URL." },
        { status: 400 }
      );
    }

    const base64Data = match[2];
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data)) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "Malformed base64 image data." },
        { status: 400 }
      );
    }

    try {
      imageBuffer = Buffer.from(base64Data, "base64");
    } catch {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "Failed to decode base64 image data." },
        { status: 400 }
      );
    }
  } else if (contentType.includes("multipart/form-data")) {
    // For multipart incoming from direct FormData
    try {
      // Re-create a Request with the buffer to parse via formData()
      const arrayBuffer = bodyBuffer.buffer.slice(
        bodyBuffer.byteOffset,
        bodyBuffer.byteOffset + bodyBuffer.byteLength
      ) as ArrayBuffer;
      const dummyReq = new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": contentType },
        body: arrayBuffer,
      });
      const formData = await dummyReq.formData();
      prompt = (formData.get("prompt") as string) || "";
      const file = formData.get("image") || formData.get("input_image_0") || formData.get("originalImage");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const fileBuffer = await (file as Blob).arrayBuffer();
        imageBuffer = Buffer.from(fileBuffer);
      }
    } catch {
      return NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "Failed to parse multipart form data." },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      {
        success: false,
        code: "UNSUPPORTED_MEDIA_TYPE",
        error: "Content-Type must be application/json or multipart/form-data.",
      },
      { status: 415 }
    );
  }

  // 5. Validate Prompt Length
  if (!prompt) {
    return NextResponse.json(
      { success: false, code: "VALIDATION_ERROR", error: "Prompt is required." },
      { status: 400 }
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        error: `Prompt is too long (${prompt.length} chars). Maximum allowed is ${MAX_PROMPT_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

  // 6. Validate Image
  if (!imageBuffer || imageBuffer.length === 0) {
    return NextResponse.json(
      { success: false, code: "VALIDATION_ERROR", error: "A valid reference image is required." },
      { status: 400 }
    );
  }

  if (imageBuffer.length > MAX_IMAGE_BINARY_BYTES) {
    return NextResponse.json(
      {
        success: false,
        code: "PAYLOAD_TOO_LARGE",
        error: `Image file exceeds maximum allowed size of ${MAX_IMAGE_BINARY_BYTES / (1024 * 1024)} MB.`,
      },
      { status: 413 }
    );
  }

  // Validate image magic bytes and supported formats (JPEG, PNG, WEBP)
  const inspected = inspectImageBuffer(imageBuffer);
  if (!inspected) {
    return NextResponse.json(
      {
        success: false,
        code: "UNSUPPORTED_IMAGE",
        error: "Invalid image file signature. Only JPG, PNG, and WEBP are supported.",
      },
      { status: 400 }
    );
  }

  // 7. Prepare reference image (resize to < 512px if needed, preserving aspect ratio, without upscaling)
  let prepared: Awaited<ReturnType<typeof prepareReferenceImage>>;
  try {
    prepared = await prepareReferenceImage(imageBuffer);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        code: "IMAGE_PROCESSING_ERROR",
        error: err instanceof Error ? err.message : "Failed to process image.",
      },
      { status: 400 }
    );
  }

  // 8. Execute inference with AbortSignal timeout (no automatic retries)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUDFLARE_TIMEOUT_MS);

  try {
    const result = await runCloudflareImageInference({
      config,
      imageBuffer: prepared.buffer,
      mimeType: prepared.mimeType,
      prompt,
      originalWidth: prepared.originalWidth,
      originalHeight: prepared.originalHeight,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!result.success) {
      const status =
        result.code === "AUTH_ERROR"
          ? 502
          : result.code === "TIMEOUT"
          ? 504
          : result.code === "VALIDATION_ERROR"
          ? 400
          : 502;

      return NextResponse.json(
        {
          success: false,
          code: result.code || "GENERATION_FAILED",
          error: result.error || "Image generation failed.",
          model: result.model,
          elapsedMs: result.elapsedMs,
          ...(result.neurons !== undefined ? { neurons: result.neurons } : {}),
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      image: result.image,
      model: result.model,
      elapsedMs: result.elapsedMs,
      ...(result.neurons !== undefined ? { neurons: result.neurons } : {}),
      inputDetails: {
        originalWidth: prepared.originalWidth,
        originalHeight: prepared.originalHeight,
        processedWidth: prepared.width,
        processedHeight: prepared.height,
        wasResized: prepared.wasResized,
        format: prepared.mimeType,
      },
    });
  } catch {
    clearTimeout(timeoutId);
    return NextResponse.json(
      {
        success: false,
        code: "UNEXPECTED_ERROR",
        error: "An unexpected error occurred during generation.",
      },
      { status: 500 }
    );
  }
}
