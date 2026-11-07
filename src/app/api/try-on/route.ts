import { NextRequest, NextResponse } from "next/server";
import { generateTryOn, resolveProviderName } from "@/lib/ai/provider";
import { getLookById as getStaticLookById } from "@/data/looks";
import { type HairColorId, type Look, type TransformationMode } from "@/types/tryon";
import { getTenantConfig } from "@/lib/tenant/loader";
import { checkTenantQuota, incrementTenantUsage, recordConsentEvent, recordRateLimitHit } from "@/lib/tenant/usage";
import {
  classifyAIError,
  logServerError,
  withTimeoutAndRetry,
} from "@/lib/ai/errors";
import { getClientIp, getRateLimiter, RATE_LIMIT_WINDOW_MS } from "@/lib/rate-limit/limiter";
import { resolveShadesForStyle, shadeToHairColor } from "@/lib/tenant/catalog";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface TryOnRequestBody {
  originalImage?: string;
  mode?: TransformationMode;
  lookId?: string;
  colorId?: HairColorId;
  consentGiven?: boolean;
}

export async function POST(request: NextRequest) {
  // 1. Resolve tenant identity
  const tenantHeader = request.headers.get("x-tenant-id");
  const cookieTenant = request.cookies.get("x-tenant-id")?.value;
  const tenantId = (tenantHeader || cookieTenant || "default").toLowerCase();
  const tenant = getTenantConfig(tenantId);

  try {
    const body = (await request.json()) as TryOnRequestBody;
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
    const quota = checkTenantQuota(tenantId, tenant.monthlyTryOnLimit);
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
          currentUsage: quota.currentUsage,
          limit: quota.limit,
        },
        { status: 429 }
      );
    }

    // 5. Image Validations
    if (!body.originalImage || typeof body.originalImage !== "string") {
      return NextResponse.json(
        {
          success: false,
          code: "UNSAFE_IMAGE",
          error: "An uploaded photo is required to create your try-on preview.",
        },
        { status: 400 }
      );
    }

    if (!body.originalImage.startsWith("data:image/")) {
      return NextResponse.json(
        {
          success: false,
          code: "UNSAFE_IMAGE",
          error: "Invalid photo format. Please upload a JPG, PNG, or WEBP image.",
        },
        { status: 400 }
      );
    }

    // 6. Mode-specific input requirements
    const requireStyle = mode === "style" || mode === "both";
    const requireColor = mode === "color" || mode === "both";

    // 6a. Hairstyle resolution & validation
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
      if (tenantStyle) {
        look = {
          id: tenantStyle.id,
          name: tenantStyle.name,
          category: tenantStyle.category,
          length: tenantStyle.length,
          description: tenantStyle.description,
          previewImage: tenantStyle.referenceImage || tenantStyle.previewImage || "",
          demoResultImage: tenantStyle.demoResultImage,
          aiInstruction: tenantStyle.aiInstruction,
          stylistRecommendation: tenantStyle.stylistRecommendation,
          productId: tenantStyle.productId,
          colorOnly: tenantStyle.colorOnly,
        };
      } else {
        look = getStaticLookById(body.lookId) || null;
      }

      if (!look) {
        return NextResponse.json(
          { success: false, code: "SERVER_ERROR", error: "Selected hairstyle is not available in this catalogue." },
          { status: 404 }
        );
      }
    }

    // 6b. Hair Colour resolution & validation
    let color: ReturnType<typeof shadeToHairColor> | null = null;

    if (requireColor) {
      // In color-only mode, colorId is strictly required
      // In both mode, colorId is required unless style is colorOnly
      if (!body.colorId || typeof body.colorId !== "string" || !body.colorId.trim()) {
        return NextResponse.json(
          { success: false, code: "SERVER_ERROR", error: "Please select a hair colour to try on." },
          { status: 400 }
        );
      }

      // If a hairstyle is also selected and restricts shades, validate against allowed shades
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

    // 7. Execute AI Generation with timeout and 1 automatic retry
    const result = await withTimeoutAndRetry(
      async () => {
        return generateTryOn(
          {
            originalImage: body.originalImage!,
            lookId: body.lookId,
            colorId: body.colorId,
            mode,
          },
          look,
          color,
          mode
        );
      },
      {
        timeoutMs: 45000,
        maxRetries: 1,
        tenantId,
        stageName: "AI Generation",
      }
    );

    // 8. Increment monthly usage on successful generation
    const newUsage = incrementTenantUsage(tenantId);
    console.log(
      `[TRYON] Success — tenant: ${tenantId}, newUsage: ${newUsage}/${tenant.monthlyTryOnLimit}`
    );

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
