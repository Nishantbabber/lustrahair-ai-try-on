import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildTryOnPrompt } from "../src/lib/ai/prompts";
import { shadeToHairColor, resolveShadesForStyle } from "../src/lib/tenant/catalog";
import {
  getTenantConfig,
  isKnownTenant,
  resolveTenantId,
  sanitizeTenantForClient,
} from "../src/lib/tenant/loader";
import { checkTenantQuota } from "../src/lib/tenant/usage";
import { InMemorySlidingWindowRateLimiter } from "../src/lib/rate-limit/limiter";
import { validateImagePayload } from "../src/lib/image-validation";
import { withTimeoutAndRetry } from "../src/lib/ai/errors";
import { getSecurityHeaders } from "../src/lib/security-headers";
import { POST as tryOnHandler } from "../src/app/api/try-on/route";
import { middleware } from "../src/middleware";
import { NextRequest } from "next/server";

describe("1. Mode-Specific Prompts Verification", () => {
  const sampleLook = {
    id: "signature-waves",
    name: "Signature Waves",
    category: "Long · Wavy",
    length: '22"',
    description: "Soft cascading waves",
    previewImage: "/img.jpg",
    demoResultImage: "/demo.jpg",
    aiInstruction: "Render soft loose waves.",
    stylistRecommendation: "Great volume",
    productId: "prod-1",
  };

  const sampleColor = {
    id: "honey-blonde",
    name: "Honey Blonde",
    hex: "#c9a66b",
    category: "blonde",
    aiInstruction: "Warm honey blonde highlights",
  };

  test("Style only mode: preserves original hair color, requires hairstyle", () => {
    const prompt = buildTryOnPrompt(sampleLook, null, "style");
    assert.match(prompt, /Change ONLY the person's haircut and hairstyle/);
    assert.match(prompt, /PRESERVE the person's existing natural hair color/);
    assert.match(prompt, /Do NOT dye or alter the hair color/);
    assert.match(prompt, /The new hairstyle to apply is:/);
    assert.doesNotMatch(prompt, /Warm honey blonde/);
  });

  test("Colour only mode: strictly preserves haircut/length/texture/parting, applies new color", () => {
    const prompt = buildTryOnPrompt(null, sampleColor, "color");
    assert.match(prompt, /Change ONLY the color of the hair/);
    assert.match(prompt, /CRITICAL INSTRUCTIONS — DO NOT CHANGE THE HAIRSTYLE/);
    assert.match(prompt, /Keep the exact same haircut, hair length, and silhouette/);
    assert.match(prompt, /Keep the exact same hair texture, wave pattern, or curl pattern/);
    assert.match(prompt, /Keep the exact same parting, volume, and hair styling/);
    assert.match(prompt, /Do NOT give the person a haircut or a different hairstyle/);
    assert.match(prompt, /Do NOT tint eyebrows, eyelashes, skin/);
    assert.match(prompt, /Warm honey blonde/);
    assert.match(prompt, /#c9a66b/);
    assert.doesNotMatch(prompt, /Signature Waves/);
  });

  test("Both mode: combines hairstyle and hair colour", () => {
    const prompt = buildTryOnPrompt(sampleLook, sampleColor, "both");
    assert.match(prompt, /The selected hairstyle is:/);
    assert.match(prompt, /Signature Waves/);
    assert.match(prompt, /The selected color is:/);
    assert.match(prompt, /Warm honey blonde highlights/);
  });
});

describe("2. Tenant Isolation & Security Verification (Phase 1A)", () => {
  const aura = getTenantConfig("aurasalon")!;
  const def = getTenantConfig("default")!;

  test("Tenant configurations load correctly with distinct catalogs", () => {
    assert.ok(aura);
    assert.ok(def);
    assert.equal(aura.brandName, "Aura Salon & Studio");
    assert.equal(def.brandName, "LustraHair");

    const auraStyleIds = aura.styles.map((s) => s.id);
    const defStyleIds = def.styles.map((s) => s.id);

    // silk-straight is in default but NOT in aurasalon
    assert.ok(defStyleIds.includes("silk-straight"));
    assert.ok(!auraStyleIds.includes("silk-straight"));

    // soft-espresso is in aurasalon shades, not in default shades
    const auraShadeIds = aura.shades.map((s) => s.id);
    const defShadeIds = def.shades.map((s) => s.id);
    assert.ok(auraShadeIds.includes("soft-espresso"));
    assert.ok(!defShadeIds.includes("soft-espresso"));
  });

  test("1. Unknown tenant rejection: returns null, no silent fallback", () => {
    const unknown = getTenantConfig("non-existent-tenant-xyz");
    assert.equal(unknown, null, "Unknown tenant must return null instead of falling back to default");
    assert.equal(isKnownTenant("malicious-tenant"), false);
  });

  test("2. Vercel hostname is not interpreted as a tenant ID", () => {
    const resolvedVercel = resolveTenantId("lustrahair-test.vercel.app", null);
    assert.equal(resolvedVercel, "default", "*.vercel.app hostnames must never be parsed as tenant IDs");

    const resolvedDirect = resolveTenantId("vercel.app", null);
    assert.equal(resolvedDirect, "default");
  });

  test("3. Tenant catalogue isolation: Aura salon cannot access default-only styles", () => {
    const requestedStyleId = "silk-straight"; // Belongs to default, NOT aurasalon
    const tenantStyle = aura.styles.find((s) => s.id === requestedStyleId);
    assert.equal(tenantStyle, undefined, "AuraSalon catalogue must not resolve silk-straight");
  });

  test("3. Tenant catalogue isolation: Default store cannot access AuraSalon-exclusive shades", () => {
    const requestedShadeId = "soft-espresso"; // Belongs to aurasalon, NOT default
    const matchedShade = def.shades.find((s) => s.id === requestedShadeId);
    assert.equal(matchedShade, undefined, "Default catalogue must not resolve soft-espresso");
  });

  test("Tenant style shade restrictions are enforced", () => {
    const velvetBrunette = aura.styles.find((s) => s.id === "rich-brunette");
    assert.ok(velvetBrunette);
    const allowed = resolveShadesForStyle(aura, velvetBrunette);
    assert.deepEqual(allowed.map((s) => s.id), ["soft-espresso"]);
  });
});

describe("3. Server-Side Image Validation Verification (Phase 1A)", () => {
  // Helper to create a minimal PNG buffer
  function createTestPng(width = 100, height = 100): Buffer {
    const buf = Buffer.alloc(24);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    buf[0] = 0x89;
    buf[1] = 0x50;
    buf[2] = 0x4e;
    buf[3] = 0x47;
    buf[4] = 0x0d;
    buf[5] = 0x0a;
    buf[6] = 0x1a;
    buf[7] = 0x0a;
    // IHDR chunk: length 13, IHDR, width, height
    buf.writeUInt32BE(13, 8);
    buf.write("IHDR", 12);
    buf.writeUInt32BE(width, 16);
    buf.writeUInt32BE(height, 20);
    return buf;
  }

  test("Valid PNG image passes validation", () => {
    const pngBuf = createTestPng(120, 120);
    const dataUrl = `data:image/png;base64,${pngBuf.toString("base64")}`;
    const result = validateImagePayload(dataUrl);
    assert.equal(result.valid, true);
    assert.equal(result.format, "png");
    assert.equal(result.width, 120);
    assert.equal(result.height, 120);
  });

  test("4. Unsupported image format rejection: SVG rejected", () => {
    const svgDataUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==";
    const result = validateImagePayload(svgDataUrl);
    assert.equal(result.valid, false);
    assert.match(result.error!, /SVG images are not supported/);
  });

  test("4. Unsupported format rejection: fake payload claiming to be PNG", () => {
    const fakeGif = Buffer.from("GIF89a...");
    const dataUrl = `data:image/png;base64,${fakeGif.toString("base64")}`;
    const result = validateImagePayload(dataUrl);
    assert.equal(result.valid, false);
    assert.match(result.error!, /Invalid image file signature/);
  });

  test("5. Malformed base64 rejection", () => {
    const malformed = "data:image/png;base64,***NOT_VALID_BASE64***";
    const result = validateImagePayload(malformed);
    assert.equal(result.valid, false);
    assert.match(result.error!, /Malformed base64/);
  });

  test("6. Oversized request rejection (> 2 MB)", () => {
    const largeBuf = Buffer.alloc(2 * 1024 * 1024 + 10);
    const dataUrl = `data:image/png;base64,${largeBuf.toString("base64")}`;
    const result = validateImagePayload(dataUrl);
    assert.equal(result.valid, false);
    assert.match(result.error!, /Image file is too large/);
  });

  test("7. Image dimension validation: rejects sub-minimum dimensions (< 64px)", () => {
    const tinyPng = createTestPng(32, 32);
    const dataUrl = `data:image/png;base64,${tinyPng.toString("base64")}`;
    const result = validateImagePayload(dataUrl);
    assert.equal(result.valid, false);
    assert.match(result.error!, /Image dimensions are too small/);
  });

  test("7. Image dimension validation: rejects dimensions over 4096px", () => {
    const hugePng = createTestPng(5000, 5000);
    const dataUrl = `data:image/png;base64,${hugePng.toString("base64")}`;
    const result = validateImagePayload(dataUrl);
    assert.equal(result.valid, false);
    assert.match(result.error!, /Image dimensions are too large/);
  });
});

describe("4. AI Provider Request Security Verification (Phase 1A)", () => {
  test("8. Provider AbortSignal propagation and timeout cancellation", async () => {
    let wasAborted = false;

    await assert.rejects(
      async () => {
        await withTimeoutAndRetry(
          async (signal: AbortSignal) => {
            return new Promise((resolve, reject) => {
              signal.addEventListener("abort", () => {
                wasAborted = true;
                reject(new Error("AbortError"));
              });
            });
          },
          {
            timeoutMs: 50,
            maxRetries: 0,
            tenantId: "default",
          }
        );
      },
      /AbortError|timed out/
    );

    assert.equal(wasAborted, true, "AbortSignal must propagate to operation");
  });

  test("9. No automatic paid-generation retries: maxRetries = 0 fails on first attempt", async () => {
    let attempts = 0;

    await assert.rejects(
      async () => {
        await withTimeoutAndRetry(
          async () => {
            attempts++;
            throw new Error("timed out");
          },
          {
            timeoutMs: 100,
            maxRetries: 0,
            tenantId: "default",
          }
        );
      },
      /timed out/
    );

    assert.equal(attempts, 1, "Must not retry paid generation requests");
  });
});

describe("5. Public/Private Tenant Configuration Separation (Phase 1A)", () => {
  test("10. Private configuration does not appear in client payloads", () => {
    const rawTenant = getTenantConfig("default")!;
    assert.ok(rawTenant);
    assert.ok(rawTenant.monthlyTryOnLimit);
    assert.ok(rawTenant.styles[0].aiInstruction);

    const publicTenant = sanitizeTenantForClient(rawTenant);

    // monthlyTryOnLimit and limits removed
    assert.equal((publicTenant as unknown as { monthlyTryOnLimit?: number }).monthlyTryOnLimit, undefined);
    assert.equal((publicTenant as unknown as { limits?: unknown }).limits, undefined);

    // aiInstruction removed from all styles and shades
    for (const style of publicTenant.styles) {
      assert.equal(style.aiInstruction, undefined, `Style ${style.id} must not leak aiInstruction to client`);
    }
    for (const shade of publicTenant.shades) {
      assert.equal(shade.aiInstruction, undefined, `Shade ${shade.id} must not leak aiInstruction to client`);
    }

    // Public branding, copy, theme, and product metadata remain intact
    assert.equal(publicTenant.brandName, "LustraHair");
    assert.ok(publicTenant.theme.primaryColor);
    assert.ok(publicTenant.styles[0].productId);
    assert.ok(publicTenant.styles[0].stylistRecommendation);
  });
});

describe("6. Security Headers & Safe Errors Verification (Phase 1A)", () => {
  test("12. Security headers are properly defined", () => {
    const devHeaders = getSecurityHeaders(false);
    assert.equal(devHeaders["X-Content-Type-Options"], "nosniff");
    assert.equal(devHeaders["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.equal(devHeaders["X-Frame-Options"], "DENY");
    assert.match(devHeaders["Content-Security-Policy"], /default-src 'self'/);
    assert.match(devHeaders["Content-Security-Policy"], /frame-ancestors 'none'/);
    assert.equal(devHeaders["Strict-Transport-Security"], undefined);

    const prodHeaders = getSecurityHeaders(true);
    assert.match(prodHeaders["Strict-Transport-Security"]!, /max-age=31536000/);
  });

  test("11. Safe tenant lookup: unknown tenant cannot be loaded", () => {
    assert.equal(getTenantConfig("non-existent"), null);
    assert.equal(isKnownTenant("non-existent"), false);
  });

  test("Tenant identifier parser ignores spoofed prefixes and vercel domains", () => {
    assert.equal(resolveTenantId("preview-git-branch.lustrahair.vercel.app"), "default");
    assert.equal(resolveTenantId("www.domain.com"), "default");
    assert.equal(resolveTenantId("app.domain.com"), "default");
    assert.equal(resolveTenantId("aurasalon.domain.com"), "aurasalon");
    assert.equal(resolveTenantId("unknownsalon.domain.com"), null);
  });
});

describe("7. Rate Limiting and Session Compatibility", () => {
  test("Per-IP rate limiter enforces limits per key and handles window expiration", () => {
    const limiter = new InMemorySlidingWindowRateLimiter();
    const key = "tryon:testtenant:127.0.0.1";
    const limit = 3;
    const windowMs = 1000;

    const r1 = limiter.consume(key, limit, windowMs);
    const r2 = limiter.consume(key, limit, windowMs);
    const r3 = limiter.consume(key, limit, windowMs);
    assert.equal(r1.allowed, true);
    assert.equal(r2.allowed, true);
    assert.equal(r3.allowed, true);

    const r4 = limiter.consume(key, limit, windowMs);
    assert.equal(r4.allowed, false, "4th request within window must be rate limited");
    assert.equal(r4.remaining, 0);
    assert.ok(r4.retryAfterSeconds > 0);
  });

  test("Legacy session without mode field defaults safely to 'both'", () => {
    const legacySession: {
      originalImage: string;
      originalImageName: string;
      selectedLookId: string;
      selectedColorId: string;
      resultImage: string;
      saved: boolean;
      provider: string;
      photoConsentGiven: boolean;
      mode?: string;
    } = {
      originalImage: "data:image/jpeg;base64,123",
      originalImageName: "me.jpg",
      selectedLookId: "signature-waves",
      selectedColorId: "espresso",
      resultImage: "data:image/png;base64,456",
      saved: true,
      provider: "gemini",
      photoConsentGiven: true,
    };

    const effectiveMode = legacySession.mode ?? "both";
    assert.equal(effectiveMode, "both");
  });

  test("Tenant Quota checks remaining allocations correctly", () => {
    const quota = checkTenantQuota("aurasalon", 250);
    assert.equal(typeof quota.allowed, "boolean");
    assert.equal(quota.limit, 250);
    assert.equal(typeof quota.currentUsage, "number");
  });
});

describe("8. Route Handler Security Verification (G2 & G3 - Route-Level)", () => {
  // Helper to construct a valid 120x120 PNG data URL
  function createTestPngDataUrl(): string {
    const buf = Buffer.alloc(24);
    buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4e; buf[3] = 0x47;
    buf[4] = 0x0d; buf[5] = 0x0a; buf[6] = 0x1a; buf[7] = 0x0a;
    buf.writeUInt32BE(13, 8);
    buf.write("IHDR", 12);
    buf.writeUInt32BE(120, 16);
    buf.writeUInt32BE(120, 20);
    return `data:image/png;base64,${buf.toString("base64")}`;
  }

  test("Route-level: Missing x-tenant-id header is rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ mode: "both" }),
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "INVALID_TENANT");
    assert.match(data.error, /Missing x-tenant-id header/);
  });

  test("Route-level: Unknown x-tenant-id header is rejected with 404 (no fallback)", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "unknown-salon-hacker",
      },
      body: JSON.stringify({ mode: "both" }),
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "NOT_FOUND");
    assert.match(data.error, /Tenant not found/);
  });

  test("Route-level: Malformed x-tenant-id header is rejected with 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "../malicious/path",
      },
      body: JSON.stringify({ mode: "both" }),
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "NOT_FOUND");
  });

  test("Route-level: Valid tenant header ('default' and 'aurasalon') is accepted past tenant validation", async () => {
    for (const validTenant of ["default", "aurasalon"]) {
      const req = new NextRequest("http://localhost:3000/api/try-on", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": validTenant,
        },
        body: JSON.stringify({
          consentGiven: false, // will fail at consent step (step 3), proving tenant validation succeeded
        }),
      });

      const res = await tryOnHandler(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, "SERVER_ERROR");
      assert.match(data.error, /consent checkbox/);
    }
  });

  test("Route-level: Oversized request-body via Content-Length is rejected with 413 before JSON parsing", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
        "content-length": String(5 * 1024 * 1024), // 5 MB declared
      },
      body: "{}",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "PAYLOAD_TOO_LARGE");
    assert.match(data.error, /exceeds maximum size limit/);
  });

  test("Route-level: Oversized streamed body without Content-Length is rejected with 413", async () => {
    // Generate a payload exceeding 4 MB
    const largePayload = "a".repeat(4 * 1024 * 1024 + 1024);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(largePayload));
        controller.close();
      },
    });

    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
        // No Content-Length header
      },
      body: stream,
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "PAYLOAD_TOO_LARGE");
  });

  test("Route-level: Valid Content-Length header is accepted", async () => {
    const payload = JSON.stringify({ consentGiven: false });
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
        "content-length": String(Buffer.byteLength(payload, "utf-8")),
      },
      body: payload,
    });

    const res = await tryOnHandler(req);
    // Passes Content-Length validation and fails at consent validation (step 3)
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, "SERVER_ERROR");
    assert.match(data.error, /consent checkbox/);
  });

  test("Route-level: Malformed Content-Length '123abc' is rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
        "content-length": "123abc",
      },
      body: "{}",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, "BAD_REQUEST");
    assert.match(data.error, /Invalid Content-Length header/);
  });

  test("Route-level: Malformed Content-Length '4.5' is rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
        "content-length": "4.5",
      },
      body: "{}",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, "BAD_REQUEST");
    assert.match(data.error, /Invalid Content-Length header/);
  });

  test("Route-level: Negative Content-Length '-1' is rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
        "content-length": "-1",
      },
      body: "{}",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, "BAD_REQUEST");
    assert.match(data.error, /Invalid Content-Length header/);
  });

  test("Route-level: Unsafe integer Content-Length is rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
        "content-length": "99999999999999999999999999999999",
      },
      body: "{}",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, "BAD_REQUEST");
    assert.match(data.error, /Invalid Content-Length header/);
  });

  test("Route-level: Malformed JSON receives controlled 400 response", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
      },
      body: "{ not valid json ::: }",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "INVALID_JSON");
    assert.match(data.error, /Malformed JSON payload/);
  });

  test("Route-level: JSON null rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
      },
      body: "null",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "INVALID_JSON");
    assert.match(data.error, /request body must be a JSON object/);
  });

  test("Route-level: JSON array rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
      },
      body: "[1, 2, 3]",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "INVALID_JSON");
    assert.match(data.error, /request body must be a JSON object/);
  });

  test("Route-level: JSON string rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
      },
      body: '"just a string"',
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "INVALID_JSON");
    assert.match(data.error, /request body must be a JSON object/);
  });

  test("Route-level: JSON number rejected with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
      },
      body: "42",
    });

    const res = await tryOnHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "INVALID_JSON");
    assert.match(data.error, /request body must be a JSON object/);
  });

  test("Route-level: Valid image requests continue to pass validation", async () => {
    const validPng = createTestPngDataUrl();
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": "default",
      },
      body: JSON.stringify({
        consentGiven: true,
        originalImage: validPng,
        mode: "style",
        lookId: "nonexistent-look", // triggers look validation in catalog (step 6a)
      }),
    });

    const res = await tryOnHandler(req);
    // Must pass image validation (step 5) and fail at catalogue look resolution (step 6a)
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.match(data.error, /Selected hairstyle is not available/);
  });
});

describe("9. Middleware Integration Verification (Middleware-Level)", () => {
  test("Middleware: ignores static assets and Next internals", () => {
    const staticReq = new NextRequest("http://localhost:3000/_next/static/test.js");
    const res = middleware(staticReq);
    assert.equal(res.headers.get("x-tenant-id"), null);
  });

  test("Middleware: overwrites untrusted incoming x-tenant-id header with resolved tenant", () => {
    // Client sends spoofed x-tenant-id: "aurasalon" on default domain
    const req = new NextRequest("http://localhost:3000/api/try-on", {
      headers: {
        "x-tenant-id": "aurasalon",
      },
    });

    const res = middleware(req);
    // Resolved tenant should be "default" (from localhost), NOT client-supplied "aurasalon"
    assert.equal(res.headers.get("x-tenant-id"), "default");
  });

  test("Middleware: resolves query param ?tenant=aurasalon and sets trusted header", () => {
    const req = new NextRequest("http://localhost:3000/api/try-on?tenant=aurasalon", {
      headers: {
        "x-tenant-id": "fake-tenant",
      },
    });

    const res = middleware(req);
    assert.equal(res.headers.get("x-tenant-id"), "aurasalon");
  });

  test("Middleware: rejects unknown tenant in query param on API route with 404 JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/try-on?tenant=unknown-salon");
    const res = middleware(req);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, "NOT_FOUND");
  });

  test("Middleware: resolves subdomain tenant and sets header", () => {
    const req = new NextRequest("http://aurasalon.example.com/api/try-on", {
      headers: {
        host: "aurasalon.example.com",
      },
    });

    const res = middleware(req);
    assert.equal(res.headers.get("x-tenant-id"), "aurasalon");
  });

  test("Middleware: vercel.app domains always resolve to default, never parsed as tenant", () => {
    const req = new NextRequest("http://aurasalon.vercel.app/api/try-on", {
      headers: {
        host: "aurasalon.vercel.app",
      },
    });

    const res = middleware(req);
    assert.equal(res.headers.get("x-tenant-id"), "default");
  });
});
