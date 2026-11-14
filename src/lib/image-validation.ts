export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  format?: "jpeg" | "png" | "webp";
  width?: number;
  height?: number;
  buffer?: Buffer;
}

// 2 MB binary limit (accounting for base64 overhead ~ 2.8 MB string)
export const MAX_IMAGE_BINARY_BYTES = 2 * 1024 * 1024;
export const MIN_IMAGE_DIMENSION = 64;
export const MAX_IMAGE_DIMENSION = 4096;

/**
 * Validates data URL format, base64 payload size, file signatures, and dimensions.
 * Strictly allows JPEG, PNG, and WEBP only. Rejects SVG, malformed base64, and oversized payloads.
 */
export function validateImagePayload(dataUrl: unknown): ImageValidationResult {
  if (typeof dataUrl !== "string" || !dataUrl.trim()) {
    return { valid: false, error: "An uploaded photo is required." };
  }

  // Reject SVG immediately if MIME prefix indicates SVG
  if (dataUrl.startsWith("data:image/svg")) {
    return { valid: false, error: "SVG images are not supported. Please upload a JPG, PNG, or WEBP image." };
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return {
      valid: false,
      error: "Invalid photo format. Expected base64 data URL with a supported image MIME type.",
    };
  }

  const claimedMime = match[1].toLowerCase();
  if (claimedMime !== "image/jpeg" && claimedMime !== "image/png" && claimedMime !== "image/webp") {
    return {
      valid: false,
      error: `Unsupported image format (${claimedMime}). Only JPG, PNG, and WEBP are allowed.`,
    };
  }

  const base64Data = match[2];

  // Quick base64 character sanity check
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data)) {
    return { valid: false, error: "Malformed base64 image data." };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    return { valid: false, error: "Failed to decode base64 image data." };
  }

  if (buffer.length === 0) {
    return { valid: false, error: "Uploaded image file is empty." };
  }

  if (buffer.length > MAX_IMAGE_BINARY_BYTES) {
    return {
      valid: false,
      error: `Image file is too large (${(buffer.length / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 2 MB.`,
    };
  }

  const details = inspectImageBuffer(buffer);
  if (!details) {
    return {
      valid: false,
      error: "Invalid image file signature. File header does not match a valid JPG, PNG, or WEBP file.",
    };
  }

  const { format, width, height } = details;

  // Validate claimed mime matches actual signature
  if (
    (format === "jpeg" && claimedMime !== "image/jpeg") ||
    (format === "png" && claimedMime !== "image/png") ||
    (format === "webp" && claimedMime !== "image/webp")
  ) {
    return {
      valid: false,
      error: `MIME type (${claimedMime}) does not match detected file signature (${format}).`,
    };
  }

  // Dimension validation
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image dimensions are too small (${width}x${height}). Minimum dimension is ${MIN_IMAGE_DIMENSION}px.`,
    };
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image dimensions are too large (${width}x${height}). Maximum dimension is ${MAX_IMAGE_DIMENSION}px.`,
    };
  }

  return {
    valid: true,
    format,
    width,
    height,
    buffer,
  };
}

/**
 * Checks magic bytes and extracts dimensions for PNG, JPEG, and WEBP.
 */
export function inspectImageBuffer(
  buffer: Buffer
): { format: "jpeg" | "png" | "webp"; width: number; height: number } | null {
  if (buffer.length < 12) return null;

  // 1. PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { format: "png", width, height };
    }
    return null;
  }

  // 2. JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF markers: SOF0 to SOF3, SOF5 to SOF7, SOF9 to SOF11, SOF13 to SOF15
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (offset + 8 < buffer.length) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { format: "jpeg", width, height };
        }
      }
      if (marker === 0xd9) break; // End of image
      if (offset + 3 >= buffer.length) break;
      const len = buffer.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }

  // 3. WEBP signature: 'RIFF' + 4 bytes + 'WEBP'
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    if (buffer.length < 16) return null;
    const chunkType = buffer.subarray(12, 16).toString("ascii");

    if (chunkType === "VP8 " && buffer.length >= 30) {
      // VP8 (lossy)
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { format: "webp", width, height };
    } else if (chunkType === "VP8L" && buffer.length >= 25) {
      // VP8L (lossless)
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { format: "webp", width, height };
    } else if (chunkType === "VP8X" && buffer.length >= 30) {
      // VP8X (extended)
      const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { format: "webp", width, height };
    }
  }

  return null;
}
