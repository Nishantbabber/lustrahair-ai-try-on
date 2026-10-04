import { NextRequest, NextResponse } from "next/server";
import { generateTryOn, resolveProviderName } from "@/lib/ai/provider";
import { getLookById as getStaticLookById } from "@/data/looks";
import { type HairColorId, type Look } from "@/types/tryon";
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

    console.log(
      `[TRYON] Request received — tenant: ${tenantId} (${tenant.brandName}), lookId: ${body.lookId}, provider: ${providerName}`
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

    // 3. Pre-call Tenant Quota Check
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

    // 3. Input Validations
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

    if (!body.lookId || typeof body.lookId !== "string") {
      return NextResponse.json(
        { success: false, code: "SERVER_ERROR", error: "Please select a hairstyle to try on." },
        { status: 400 }
      );
    }

    // 4. Resolve Look from Tenant Catalog first, then static catalog
    const tenantStyle = tenant.styles.find((s) => s.id === body.lookId);
    let look: Look | undefined;

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
      look = getStaticLookById(body.lookId);
    }

    if (!look) {
      return NextResponse.json(
        { success: false, code: "SERVER_ERROR", error: "Selected hairstyle is not available." },
        { status: 404 }
      );
    }

    const allowedShades = resolveShadesForStyle(tenant, tenantStyle);
    let colorId = body.colorId ?? allowedShades[0]?.id ?? "";
    if (tenantStyle?.colorOnly && allowedShades[0]) {
      colorId = allowedShades[0].id;
    }
    const selectedShade = allowedShades.find((s) => s.id === colorId);
    if (!selectedShade) {
      return NextResponse.json(
        { success: false, code: "SERVER_ERROR", error: "Selected shade is invalid." },
        { status: 400 }
      );
    }

    const color = shadeToHairColor(selectedShade);

    // 5. Execute AI Generation with timeout and 1 automatic retry
    const result = await withTimeoutAndRetry(
      async () => {
        return generateTryOn(
          {
            originalImage: body.originalImage!,
            lookId: body.lookId!,
            colorId,
          },
          look!,
          color
        );
      },
      {
        timeoutMs: 45000,
        maxRetries: 1,
        tenantId,
        stageName: "AI Generation",
      }
    );

    // 6. Increment monthly usage on successful generation
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
    });
  } catch (error) {
    // 7. Structured error classification, server-side audit logging, and friendly response
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
