import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { NextRequest } from "next/server";
import {
  prepareReferenceImage,
  getCloudflareConfig,
  isCloudflareTestAllowed,
  CLOUDFLARE_DEFAULT_MODEL,
  resolveOutputDimensions,
  FLUX_MIN_DIMENSION,
  FLUX_MAX_DIMENSION,
  FLUX_DIMENSION_STEP,
} from "../src/lib/cloudflare/client";
import { POST as cloudflareImageHandler } from "../src/app/api/test/cloudflare-image/route";

// Load .env.local for tests if present
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignore
}

describe("Cloudflare FLUX.2 Klein 4B Isolated Integration Tests", () => {
  // Helpers
  async function createTestImage(width: number, height: number, format: "jpeg" | "png" | "webp") {
    const s = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 150, g: 100, b: 50 },
      },
    });
    if (format === "jpeg") return s.jpeg().toBuffer();
    if (format === "png") return s.png().toBuffer();
    return s.webp().toBuffer();
  }

  test("1. Environment variables and config reading", () => {
    const { config } = getCloudflareConfig();
    // In our test environment, config should either resolve or report safely
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
      assert.ok(config);
      assert.equal(config.accountId, process.env.CLOUDFLARE_ACCOUNT_ID);
      assert.equal(config.apiToken, process.env.CLOUDFLARE_API_TOKEN);
      assert.equal(config.model, process.env.CLOUDFLARE_IMAGE_MODEL || CLOUDFLARE_DEFAULT_MODEL);
    }
  });

  test("2. Environment gate: blocked in production unless explicit flag is enabled", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ENABLE_CLOUDFLARE_TEST_ROUTE;

    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      delete process.env.ENABLE_CLOUDFLARE_TEST_ROUTE;
      assert.equal(isCloudflareTestAllowed(), false);

      process.env.ENABLE_CLOUDFLARE_TEST_ROUTE = "true";
      assert.equal(isCloudflareTestAllowed(), true);

      (process.env as Record<string, string>).NODE_ENV = "development";
      assert.equal(isCloudflareTestAllowed(), true);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prevNodeEnv;
      if (prevFlag !== undefined) {
        process.env.ENABLE_CLOUDFLARE_TEST_ROUTE = prevFlag;
      } else {
        delete process.env.ENABLE_CLOUDFLARE_TEST_ROUTE;
      }
    }
  });

  test("3. Valid JPEG image processing: preserves aspect ratio, small images not upscaled", async () => {
    const buf = await createTestImage(300, 200, "jpeg");
    const result = await prepareReferenceImage(buf);

    assert.equal(result.wasResized, false);
    assert.equal(result.width, 300);
    assert.equal(result.height, 200);
    assert.equal(result.mimeType, "image/jpeg");
    assert.ok(result.width < 512);
    assert.ok(result.height < 512);
  });

  test("4. Valid PNG and WEBP image processing", async () => {
    const pngBuf = await createTestImage(250, 250, "png");
    const pngResult = await prepareReferenceImage(pngBuf);
    assert.equal(pngResult.mimeType, "image/png");
    assert.equal(pngResult.width, 250);

    const webpBuf = await createTestImage(250, 250, "webp");
    const webpResult = await prepareReferenceImage(webpBuf);
    assert.equal(webpResult.mimeType, "image/webp");
    assert.equal(webpResult.width, 250);
  });

  test("5. Image larger than 512x512 is resized so both dimensions are < 512px", async () => {
    const largeBuf = await createTestImage(1024, 768, "jpeg");
    const result = await prepareReferenceImage(largeBuf);

    assert.equal(result.wasResized, true);
    assert.ok(result.width < 512, `Width ${result.width} must be < 512`);
    assert.ok(result.height < 512, `Height ${result.height} must be < 512`);
    // Aspect ratio 1024 / 768 = 1.3333
    const ratio = result.width / result.height;
    assert.ok(Math.abs(ratio - 1024 / 768) < 0.05, "Aspect ratio preserved");
  });

  test("6. Square image larger than 512x512 downscales to 511x511", async () => {
    const squareBuf = await createTestImage(800, 800, "png");
    const result = await prepareReferenceImage(squareBuf);

    assert.equal(result.wasResized, true);
    assert.ok(result.width < 512);
    assert.ok(result.height < 512);
    assert.equal(result.width, 511);
    assert.equal(result.height, 511);
  });

  test("7. Invalid image bytes rejected by prepareReferenceImage", async () => {
    const fakeBuffer = Buffer.from("Not an image at all, just text");
    await assert.rejects(
      async () => {
        await prepareReferenceImage(fakeBuffer);
      },
      {
        message: /Invalid image file header/,
      }
    );
  });

  test("8. API endpoint rejects requests without required prompt", async () => {
    const jpegBuf = await createTestImage(200, 200, "jpeg");
    const dataUrl = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;

    const req = new NextRequest("http://localhost/api/test/cloudflare-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, prompt: "" }),
    });

    const res = await cloudflareImageHandler(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Prompt is required/);
  });

  test("9. API endpoint rejects oversized request-body via Content-Length", async () => {
    const req = new NextRequest("http://localhost/api/test/cloudflare-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "10000000", // 10MB
      },
      body: JSON.stringify({ prompt: "test" }),
    });

    const res = await cloudflareImageHandler(req);
    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.code, "PAYLOAD_TOO_LARGE");
  });

  test("10. API endpoint rejects missing credentials with safe 500 status", async () => {
    const prevAcc = process.env.CLOUDFLARE_ACCOUNT_ID;
    const prevTok = process.env.CLOUDFLARE_API_TOKEN;

    try {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.CLOUDFLARE_API_TOKEN;

      const jpegBuf = await createTestImage(200, 200, "jpeg");
      const dataUrl = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;

      const req = new NextRequest("http://localhost/api/test/cloudflare-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test hair", image: dataUrl }),
      });

      const res = await cloudflareImageHandler(req);
      assert.equal(res.status, 500);
      const data = await res.json();
      assert.equal(data.code, "CONFIG_ERROR");
      assert.match(data.error, /credentials .* are not configured/);
    } finally {
      process.env.CLOUDFLARE_ACCOUNT_ID = prevAcc;
      process.env.CLOUDFLARE_API_TOKEN = prevTok;
    }
  });

  test("11. Production access blocked by default", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFlag = process.env.ENABLE_CLOUDFLARE_TEST_ROUTE;

    try {
      (process.env as Record<string, string>).NODE_ENV = "production";
      delete process.env.ENABLE_CLOUDFLARE_TEST_ROUTE;

      const req = new NextRequest("http://localhost/api/test/cloudflare-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test" }),
      });

      const res = await cloudflareImageHandler(req);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, "FORBIDDEN");
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prevNodeEnv;
      if (prevFlag !== undefined) {
        process.env.ENABLE_CLOUDFLARE_TEST_ROUTE = prevFlag;
      } else {
        delete process.env.ENABLE_CLOUDFLARE_TEST_ROUTE;
      }
    }
  });

  test("12. Cloudflare authentication failure is caught and safe message returned", async () => {
    const prevTok = process.env.CLOUDFLARE_API_TOKEN;
    try {
      process.env.CLOUDFLARE_API_TOKEN = "invalid_token_for_testing";

      const jpegBuf = await createTestImage(200, 200, "jpeg");
      const dataUrl = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;

      const req = new NextRequest("http://localhost/api/test/cloudflare-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test hair", image: dataUrl }),
      });

      const res = await cloudflareImageHandler(req);
      assert.ok(res.status === 502 || res.status === 500);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error);
      // Ensure raw token is not exposed in error or body
      assert.ok(!JSON.stringify(data).includes("invalid_token_for_testing"));
    } finally {
      process.env.CLOUDFLARE_API_TOKEN = prevTok;
    }
  });

  test("13. Timeout handling aborts after deadline", async () => {
    const controller = new AbortController();
    controller.abort(); // already aborted signal
    const { getCloudflareConfig, runCloudflareImageInference } = await import("../src/lib/cloudflare/client");
    const { config } = getCloudflareConfig();
    assert.ok(config);

    const jpegBuf = await createTestImage(200, 200, "jpeg");
    const result = await runCloudflareImageInference({
      config,
      imageBuffer: jpegBuf,
      mimeType: "image/jpeg",
      prompt: "test hair",
      originalWidth: 200,
      originalHeight: 200,
      signal: controller.signal,
    });

    assert.equal(result.success, false);
    assert.equal(result.code, "TIMEOUT");
    assert.match(result.error || "", /timed out/);
  });

  describe("resolveOutputDimensions — aspect-ratio-matching output sizes", () => {
    test("13a. Square input (1:1) → square output", () => {
      const dims = resolveOutputDimensions(1000, 1000);
      assert.equal(dims.width, dims.height);
      assert.equal(dims.width % FLUX_DIMENSION_STEP, 0);
      assert.ok(dims.width >= FLUX_MIN_DIMENSION);
      assert.ok(dims.width <= FLUX_MAX_DIMENSION);
    });

    test("13b. Portrait input (3:4) → portrait output (height > width)", () => {
      const dims = resolveOutputDimensions(900, 1200);
      assert.ok(dims.height > dims.width, `Expected h(${dims.height}) > w(${dims.width})`);
      assert.equal(dims.width % FLUX_DIMENSION_STEP, 0);
      assert.equal(dims.height % FLUX_DIMENSION_STEP, 0);
      assert.ok(dims.width >= FLUX_MIN_DIMENSION);
      assert.ok(dims.height <= FLUX_MAX_DIMENSION);
    });

    test("13c. Landscape input (16:9) → landscape output (width > height)", () => {
      const dims = resolveOutputDimensions(1920, 1080);
      assert.ok(dims.width > dims.height, `Expected w(${dims.width}) > h(${dims.height})`);
      assert.equal(dims.width % FLUX_DIMENSION_STEP, 0);
      assert.equal(dims.height % FLUX_DIMENSION_STEP, 0);
      assert.ok(dims.height >= FLUX_MIN_DIMENSION);
      assert.ok(dims.width <= FLUX_MAX_DIMENSION);
    });

    test("13d. Very tall portrait (9:16) → portrait within limits", () => {
      const dims = resolveOutputDimensions(1080, 1920);
      assert.ok(dims.height > dims.width, `Expected h(${dims.height}) > w(${dims.width})`);
      assert.equal(dims.width % FLUX_DIMENSION_STEP, 0);
      assert.equal(dims.height % FLUX_DIMENSION_STEP, 0);
      assert.ok(dims.width >= FLUX_MIN_DIMENSION);
      assert.ok(dims.height <= FLUX_MAX_DIMENSION);
    });

    test("13e. Standard portrait photo (4:5) → near 4:5 portrait output", () => {
      const dims = resolveOutputDimensions(800, 1000);
      assert.ok(dims.height > dims.width, `Expected h(${dims.height}) > w(${dims.width})`);
      // Aspect ratio should be close to 0.8 (4:5)
      const outputRatio = dims.width / dims.height;
      assert.ok(Math.abs(outputRatio - 0.8) < 0.1, `Ratio ${outputRatio} should be near 0.8`);
    });

    test("13f. All dimensions are multiples of 32", () => {
      const testCases = [
        [640, 480], [480, 640], [1000, 1000], [300, 400],
        [1920, 1080], [1080, 1920], [4000, 3000], [100, 200],
      ];
      for (const [w, h] of testCases) {
        const dims = resolveOutputDimensions(w, h);
        assert.equal(dims.width % FLUX_DIMENSION_STEP, 0, `Width ${dims.width} not multiple of ${FLUX_DIMENSION_STEP} for input ${w}x${h}`);
        assert.equal(dims.height % FLUX_DIMENSION_STEP, 0, `Height ${dims.height} not multiple of ${FLUX_DIMENSION_STEP} for input ${w}x${h}`);
        assert.ok(dims.width >= FLUX_MIN_DIMENSION, `Width ${dims.width} < min ${FLUX_MIN_DIMENSION} for input ${w}x${h}`);
        assert.ok(dims.height >= FLUX_MIN_DIMENSION, `Height ${dims.height} < min ${FLUX_MIN_DIMENSION} for input ${w}x${h}`);
        assert.ok(dims.width <= FLUX_MAX_DIMENSION, `Width ${dims.width} > max ${FLUX_MAX_DIMENSION} for input ${w}x${h}`);
        assert.ok(dims.height <= FLUX_MAX_DIMENSION, `Height ${dims.height} > max ${FLUX_MAX_DIMENSION} for input ${w}x${h}`);
      }
    });
  });

  describe("Customer /try-on flow integration with Cloudflare provider", () => {
    test("14. resolveProviderName returns 'cloudflare' when AI_PROVIDER=cloudflare", async () => {
      const prevAiProvider = process.env.AI_PROVIDER;
      try {
        process.env.AI_PROVIDER = "cloudflare";
        const { resolveProviderName } = await import("../src/lib/ai/provider");
        assert.equal(resolveProviderName(), "cloudflare");

        process.env.AI_PROVIDER = "  CLOUDFLARE  ";
        assert.equal(resolveProviderName(), "cloudflare");
      } finally {
        process.env.AI_PROVIDER = prevAiProvider;
      }
    });

    test("15. createProvider('cloudflare') returns cloudflareProvider", async () => {
      const { createProvider } = await import("../src/lib/ai/provider");
      const provider = await createProvider("cloudflare");
      assert.equal(provider.name, "cloudflare");
      assert.equal(typeof provider.generateTryOn, "function");
    });

    test("16. Full /api/try-on route invocation with AI_PROVIDER=cloudflare in all 3 modes", async () => {
      const prevAiProvider = process.env.AI_PROVIDER;
      try {
        process.env.AI_PROVIDER = "cloudflare";

        const { POST: tryOnHandler } = await import("../src/app/api/try-on/route");
        const jpegBuf = await createTestImage(100, 100, "jpeg");
        const dataUrl = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;

        // Mode: style
        const reqStyle = new NextRequest("http://localhost/api/try-on", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": "default",
          },
          body: JSON.stringify({
            originalImage: dataUrl,
            mode: "style",
            lookId: "signature-waves",
            consentGiven: true,
          }),
        });
        // Mode: color
        const reqColor = new NextRequest("http://localhost/api/try-on", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": "default",
          },
          body: JSON.stringify({
            originalImage: dataUrl,
            mode: "color",
            colorId: "espresso-brown",
            consentGiven: true,
          }),
        });
        // Mode: both
        const reqBoth = new NextRequest("http://localhost/api/try-on", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-id": "default",
          },
          body: JSON.stringify({
            originalImage: dataUrl,
            mode: "both",
            lookId: "signature-waves",
            colorId: "espresso-brown",
            consentGiven: true,
          }),
        });

        // We test with an invalid token to verify full route wiring, tenant checks, quota checks, mode routing,
        // and graceful upstream error mapping without charging customer usage or leaking credentials
        const prevTok = process.env.CLOUDFLARE_API_TOKEN;
        try {
          process.env.CLOUDFLARE_API_TOKEN = "test_invalid_token";

          for (const req of [reqStyle, reqColor, reqBoth]) {
            const res = await tryOnHandler(req);
            const data = await res.json();
            // Upstream authentication error should return safe 500/502 without crashing
            assert.equal(data.success, false);
            assert.ok(data.error);
            assert.ok(!JSON.stringify(data).includes("test_invalid_token"));
          }
        } finally {
          process.env.CLOUDFLARE_API_TOKEN = prevTok;
        }
      } finally {
        process.env.AI_PROVIDER = prevAiProvider;
      }
    });
  });
});
