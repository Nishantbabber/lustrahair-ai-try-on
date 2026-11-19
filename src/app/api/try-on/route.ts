import { NextRequest, NextResponse } from "next/server";
import { generateTryOn, resolveProviderName } from "@/lib/ai/provider";
import { type HairColorId, type Look, type TransformationMode } from "@/types/tryon";
import { getTenantConfig, isKnownTenant, isValidTenantIdentifier } from "@/lib/tenant/loader";
import { checkTenantQuota, incrementTenantUsage, recordConsentEvent, recordRateLimitHit } from "@/lib/tenant/usage";
import {
  classifyAIError,
  logServerError,
  withTimeoutAndRetry,
} from "@/lib/ai/errors";
import { getClientIp, getRateLimiter, RATE_LIMIT_WINDOW_MS } from "@/lib/rate-limit/limiter";
import { resolveShadesForStyle, shadeToHairColor } from "@/lib/tenant/catalog";
import { validateImagePayload } from "@/lib/image-validation";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Maximum request body size: 4 MB (allows 2 MB binary image as base64 ~2.8 MB + JSON metadata)
const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024;

interface TryOnRequestBody {
  originalImage?: string;
  currentGenerationImage?: string;
  mode?: TransformationMode;
  lookId?: string;
  colorId?: HairColorId;
  consentGiven?: boolean;
}

export async function POST(request: NextRequest) {
  // 1. Resolve & strictly validate tenant identity inside the API route (G3)
  const rawTenantHeader = request.headers.get("x-tenant-id");

  if (!rawTenantHeader || !rawTenantHeader.trim()) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_TENANT",
        error: "Missing x-tenant-id header.",
      },
      { status: 400 }
    );
  }

  const tenantId = rawTenantHeader.toLowerCase().trim();

  if (!isValidTenantIdentifier(tenantId) || !isKnownTenant(tenantId)) {
    return NextResponse.json(
      {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found or invalid tenant identifier.",
      },
      { status: 404 }
    );
  }

  const tenant = getTenantConfig(tenantId);
  if (!tenant) {
    return NextResponse.json(
      {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found or invalid tenant identifier.",
      },
      { status: 404 }
    );
  }

  // 2. Enforce request-body size limits before JSON parsing (G2)
  // Check Content-Length header first if present
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const trimmed = contentLengthHeader.trim();
    if (!/^\d+$/.test(trimmed)) {
      return NextResponse.json(
        {
          success: false,
          code: "BAD_REQUEST",
          error: "Invalid Content-Length header.",
        },
        { status: 400 }
      );
    }
    const contentLength = Number(trimmed);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return NextResponse.json(
        {
          success: false,
          code: "BAD_REQUEST",
          error: "Invalid Content-Length header.",
        },
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

  // Stream-read request body with hard bounded byte limit
  let bodyText = "";
  if (request.body) {
    try {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let totalBytes = 0;
      const chunks: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_REQUEST_BODY_BYTES) {
          try {
            await reader.cancel();
          } catch {
            // Best-effort stream cancellation
          }
          return NextResponse.json(
            {
              success: false,
              code: "PAYLOAD_TOO_LARGE",
              error: `Request body exceeds maximum size limit of ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)} MB.`,
            },
            { status: 413 }
          );
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
      chunks.push(decoder.decode());
      bodyText = chunks.join("");
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "BAD_REQUEST",
          error: "Failed to read request body.",
        },
        { status: 400 }
      );
    }
  } else {
    // If request has no stream body, try request.text() with length check
    try {
      bodyText = await request.text();
      if (Buffer.byteLength(bodyText, "utf-8") > MAX_REQUEST_BODY_BYTES) {
        return NextResponse.json(
          {
            success: false,
            code: "PAYLOAD_TOO_LARGE",
            error: `Request body exceeds maximum size limit of ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)} MB.`,
          },
          { status: 413 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: "BAD_REQUEST",
          error: "Failed to read request body.",
        },
        { status: 400 }
      );
    }
  }

  // Parse JSON safely
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(bodyText);
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_JSON",
        error: "Malformed JSON payload.",
      },
      { status: 400 }
    );
  }

  // Validate parsed JSON structure: reject null, arrays, primitives
  if (typeof rawParsed !== "object" || rawParsed === null || Array.isArray(rawParsed)) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_JSON",
        error: "Malformed JSON payload: request body must be a JSON object.",
      },
      { status: 400 }
    );
  }

  const body = rawParsed as TryOnRequestBody;

  try {
    const providerName = resolveProviderName();

    // Mode resolution & validation: default to "both" for backward compatibility
    const mode: TransformationMode =
      body.mode === "style" || body.mode === "color" || body.mode === "both"
        ? body.mode
        : "both";

    console.log(
      `[TRYON] Request received — tenant: ${tenantId} (${tenant.brandName}), mode: ${mode}, lookId: ${body.lookId}, colorId: ${body.colorId}, provider: ${providerName}`
    );

    // 2. Per-IP rate limit (stacks independently of monthly tenant quota)
    const clientIp = getClientIp(request.headers);
    const perIpLimit = tenant.limits?.perIpPerHour ?? 5;
    const rateLimit = getRateLimiter().consume(
      `tryon:${tenantId}:${clientIp}`,
      perIpLimit,
      RATE_LIMIT_WINDOW_MS
    );

    if (!rateLimit.allowed) {
      recordRateLimitHit(tenantId, clientIp);
      logServerError({
        tenantId,
        code: "IP_RATE_LIMIT_EXCEEDED",
        message: `Per-IP hourly limit reached (${perIpLimit}/hour)`,
        context: {
          ip: clientIp,
          limit: perIpLimit,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
      });

      return NextResponse.json(
        {
          success: false,
          code: "IP_RATE_LIMIT_EXCEEDED",
          error:
            "You've reached the hourly try-on limit from this network. Please try again in a little while.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    // 3. Affirmative consent is required before any processing
    if (body.consentGiven !== true) {
      return NextResponse.json(
        {
          success: false,
          code: "SERVER_ERROR",
          error: "Please confirm the photo processing consent checkbox before generating a look.",
        },
        { status: 400 }
      );
    }

    recordConsentEvent(tenantId);

    // 4. Pre-call Tenant Quota Check
    const quota = checkTenantQuota(tenantId, tenant.monthlyTryOnLimit ?? 250);
    if (!quota.allowed) {
      logServerError({
        tenantId,
        code: "TENANT_QUOTA_EXCEEDED",
        message: `Monthly try-on limit reached (${quota.currentUsage}/${quota.limit})`,
        context: { currentUsage: quota.currentUsage, limit: quota.limit },
      });

      return NextResponse.json(
        {
          success: false,
          code: "TENANT_QUOTA_EXCEEDED",
          error: `We've hit the monthly try-on limit for ${tenant.brandName}. Please contact the store or try again next month.`,
        },
        { status: 429 }
      );
    }

    // 5. Server-Side Image Validations: Size, Format, Signature, Base64 & Dimensions
    // Use currentGenerationImage as the generation input if provided, falling back to originalImage
    const generationImage = body.currentGenerationImage || body.originalImage;
    const imageValidation = validateImagePayload(generationImage);
    if (!imageValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          code: "UNSAFE_IMAGE",
          error: imageValidation.error || "Invalid photo format. Please upload a clear JPG, PNG, or WEBP image under 2 MB.",
        },
        { status: 400 }
      );
    }

    // 6. Mode-specific input requirements
    const requireStyle = mode === "style" || mode === "both";
    const requireColor = mode === "color" || mode === "both";

    // 6a. Hairstyle resolution & validation strictly within tenant catalogue
    let look: Look | null = null;
    let tenantStyle: (typeof tenant.styles)[number] | undefined;

    if (requireStyle) {
      if (!body.lookId || typeof body.lookId !== "string" || !body.lookId.trim()) {
        return NextResponse.json(
          { success: false, code: "SERVER_ERROR", error: "Please select a hairstyle to try on." },
          { status: 400 }
        );
      }

      tenantStyle = tenant.styles.find((s) => s.id === body.lookId);
      if (!tenantStyle) {
        // Strictly reject look if not found in this tenant's catalogue (no global fallback)
        return NextResponse.json(
          { success: false, code: "SERVER_ERROR", error: "Selected hairstyle is not available in this catalogue." },
          { status: 404 }
        );
      }

      look = {
        id: tenantStyle.id,
        name: tenantStyle.name,
        category: tenantStyle.category,
        length: tenantStyle.length,
        description: tenantStyle.description,
        previewImage: tenantStyle.referenceImage || tenantStyle.previewImage || "",
        demoResultImage: tenantStyle.demoResultImage,
        aiInstruction: tenantStyle.aiInstruction || "",
        stylistRecommendation: tenantStyle.stylistRecommendation,
        productId: tenantStyle.productId,
        colorOnly: tenantStyle.colorOnly,
      };
    }

    // 6b. Hair Colour resolution & validation strictly within tenant catalogue
    let color: ReturnType<typeof shadeToHairColor> | null = null;

    if (requireColor) {
      if (!body.colorId || typeof body.colorId !== "string" || !body.colorId.trim()) {
        return NextResponse.json(
          { success: false, code: "SERVER_ERROR", error: "Please select a hair colour to try on." },
          { status: 400 }
        );
      }

      // If a hairstyle is selected and restricts shades, validate against allowed shades
      const allowedShades = tenantStyle ? resolveShadesForStyle(tenant, tenantStyle) : tenant.shades;
      const matchedShade = allowedShades.find((s) => s.id === body.colorId);

      if (!matchedShade) {
        return NextResponse.json(
          { success: false, code: "SERVER_ERROR", error: "Selected hair colour is not available." },
          { status: 400 }
        );
      }

      color = shadeToHairColor(matchedShade);
    }

    // 7. Execute AI Generation with timeout and NO automatic retries for paid generations
    const result = await withTimeoutAndRetry(
      async (signal: AbortSignal) => {
        return generateTryOn(
          {
            originalImage: generationImage!,
            currentGenerationImage: generationImage!,
            lookId: body.lookId,
            colorId: body.colorId,
            mode,
          },
          look,
          color,
          mode,
          signal
        );
      },
      {
        timeoutMs: 45000,
        maxRetries: 0, // Disabled automatic retries for paid generation requests
        tenantId,
        stageName: "AI Generation",
      }
    );

    // 8. Increment monthly usage on successful generation
    const newUsage = incrementTenantUsage(tenantId);
    console.log(
      `[TRYON] Success — tenant: ${tenantId}, newUsage: ${newUsage}/${tenant.monthlyTryOnLimit ?? 250}`
    );

    // Return safe response without internal quota numbers
    return NextResponse.json({
      success: true,
      resultImage: result.resultImage,
      provider: result.provider,
      processingTimeMs: result.processingTimeMs,
      configuredProvider: providerName,
      tenantId,
      mode,
    });
  } catch (error) {
    // 9. Structured error classification, server-side audit logging, and friendly response
    const classified = classifyAIError(error);

    logServerError({
      tenantId,
      code: classified.code,
      message: classified.userMessage,
      originalError: error,
    });

    return NextResponse.json(
      {
        success: false,
        code: classified.code,
        error: classified.userMessage,
      },
      { status: classified.status }
    );
  }
}
