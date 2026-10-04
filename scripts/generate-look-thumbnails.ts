/**
 * One-off: regenerate style-card thumbnails by running a neutral portrait
 * through the same generateTryOn() path used by POST /api/try-on.
 *
 * Usage: npx tsx scripts/generate-look-thumbnails.ts
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { generateTryOn } from "../src/lib/ai/provider";
import { getTenantConfig } from "../src/lib/tenant/loader";
import { HAIR_COLORS, type HairColorId, type Look } from "../src/types/tryon";

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function fileToDataUrl(filePath: string): string {
  const buffer = readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext || "jpeg"}`;
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function toJpegFile(resultImage: string, destJpg: string): Promise<void> {
  let dataUrl = resultImage;

  if (resultImage.startsWith("http://") || resultImage.startsWith("https://")) {
    const res = await fetch(resultImage);
    if (!res.ok) {
      throw new Error(`Failed to download generated image: HTTP ${res.status}`);
    }
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Generated image was not a data URL or downloadable HTTP image.");
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const tmpExt = mime.includes("png") ? ".png" : mime.includes("webp") ? ".webp" : ".jpg";
  const tmpPath = destJpg.replace(/\.jpg$/i, `.tmp${tmpExt}`);
  writeFileSync(tmpPath, buffer);

  if (tmpExt === ".jpg") {
    writeFileSync(destJpg, buffer);
    return;
  }

  const converted = spawnSync("sips", ["-s", "format", "jpeg", tmpPath, "--out", destJpg], {
    encoding: "utf-8",
  });
  if (converted.status !== 0) {
    // Keep the original bytes under the .jpg name if sips is unavailable
    writeFileSync(destJpg, buffer);
    console.warn(`sips conversion failed for ${destJpg}; wrote original bytes. ${converted.stderr}`);
  }
}

async function main() {
  loadDotEnvLocal();

  const referencePath = path.join(
    process.cwd(),
    "public/images/demo-results/signature-waves.jpg"
  );
  if (!existsSync(referencePath)) {
    throw new Error(`Neutral reference photo missing: ${referencePath}`);
  }

  const originalImage = fileToDataUrl(referencePath);
  const colorId: HairColorId = "espresso";
  const color = HAIR_COLORS.find((c) => c.id === colorId)!;
  const looksDir = path.join(process.cwd(), "public/images/looks");

  const tenant = getTenantConfig("default");
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const style of tenant.styles) {
    const look: Look = {
      id: style.id,
      name: style.name,
      category: style.category,
      length: style.length,
      description: style.description,
      previewImage: style.referenceImage || style.previewImage || "",
      demoResultImage: style.demoResultImage,
      aiInstruction: style.aiInstruction,
      stylistRecommendation: style.stylistRecommendation,
      productId: style.productId,
    };

    const dest = path.join(looksDir, `${style.id}.jpg`);
    console.log(`[THUMB] Generating ${style.id} via production generateTryOn()...`);

    try {
      const output = await generateTryOn(
        { originalImage, lookId: style.id, colorId },
        look,
        color
      );
      await toJpegFile(output.resultImage, dest);
      console.log(`[THUMB] Wrote ${dest} (provider=${output.provider})`);
      results.push({ id: style.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[THUMB] FAILED ${style.id}: ${message}`);
      results.push({ id: style.id, ok: false, error: message });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log("[THUMB] Summary:", JSON.stringify(results, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
