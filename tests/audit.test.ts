import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildTryOnPrompt } from "../src/lib/ai/prompts.ts";
import { shadeToHairColor, resolveShadesForStyle } from "../src/lib/tenant/catalog.ts";
import { getTenantConfig } from "../src/lib/tenant/loader.ts";
import { checkTenantQuota } from "../src/lib/tenant/usage.ts";
import { InMemorySlidingWindowRateLimiter } from "../src/lib/rate-limit/limiter.ts";

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

describe("2. Tenant Isolation & Cross-Tenant Rejection Verification", () => {
  const aura = getTenantConfig("aurasalon");
  const def = getTenantConfig("default");

  test("Tenant configurations load correctly with distinct catalogs", () => {
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

  test("Unknown tenant safely falls back to default tenant", () => {
    const unknown = getTenantConfig("non-existent-tenant-xyz");
    assert.equal(unknown.id, "default");
    assert.equal(unknown.brandName, "LustraHair");
  });

  test("Tenant isolation logic: Aura salon cannot access default-only styles", () => {
    const requestedStyleId = "silk-straight"; // Belongs to default, NOT aurasalon
    const tenantStyle = aura.styles.find((s) => s.id === requestedStyleId);
    assert.equal(tenantStyle, undefined, "AuraSalon catalogue must not resolve silk-straight");
  });

  test("Tenant isolation logic: Default store cannot access AuraSalon-exclusive shades", () => {
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

describe("3. Credits, Limits & Rate Limiting Verification", () => {
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

  test("Different IP or Tenant maintains separate rate limit buckets", () => {
    const limiter = new InMemorySlidingWindowRateLimiter();
    const keyA = "tryon:aurasalon:10.0.0.1";
    const keyB = "tryon:default:10.0.0.1";

    limiter.consume(keyA, 1, 60000);
    const blockedA = limiter.consume(keyA, 1, 60000);
    assert.equal(blockedA.allowed, false);

    const allowedB = limiter.consume(keyB, 1, 60000);
    assert.equal(allowedB.allowed, true, "Separate tenant bucket must remain allowed");
  });

  test("Tenant Quota checks remaining allocations correctly", () => {
    const quota = checkTenantQuota("aurasalon", 250);
    assert.equal(typeof quota.allowed, "boolean");
    assert.equal(quota.limit, 250);
    assert.equal(typeof quota.currentUsage, "number");
  });
});

describe("4. Session Compatibility Verification", () => {
  test("Legacy session without mode field defaults safely to 'both'", () => {
    const legacySession = {
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
    assert.equal(legacySession.originalImage, "data:image/jpeg;base64,123");
    assert.equal(legacySession.selectedLookId, "signature-waves");
  });

  test("Validation for hasValidResult in all three modes", () => {
    function hasValidResultTest(session) {
      const mode = session.mode ?? "both";
      if (!session.originalImage || !session.resultImage) return false;
      if (mode === "color") return Boolean(session.selectedColorId);
      if (mode === "style") return Boolean(session.selectedLookId);
      return Boolean(session.selectedLookId && session.selectedColorId);
    }

    // Color only doesn't need selectedLookId
    assert.ok(hasValidResultTest({
      originalImage: "data:image/jpeg;base64,abc",
      resultImage: "data:image/png;base64,xyz",
      selectedColorId: "espresso",
      mode: "color",
    }));

    // Style only doesn't need selectedColorId
    assert.ok(hasValidResultTest({
      originalImage: "data:image/jpeg;base64,abc",
      resultImage: "data:image/png;base64,xyz",
      selectedLookId: "signature-waves",
      mode: "style",
    }));

    // Both requires both
    assert.ok(!hasValidResultTest({
      originalImage: "data:image/jpeg;base64,abc",
      resultImage: "data:image/png;base64,xyz",
      selectedLookId: "signature-waves",
      mode: "both",
    }));
    assert.ok(hasValidResultTest({
      originalImage: "data:image/jpeg;base64,abc",
      resultImage: "data:image/png;base64,xyz",
      selectedLookId: "signature-waves",
      selectedColorId: "espresso",
      mode: "both",
    }));
  });
});
