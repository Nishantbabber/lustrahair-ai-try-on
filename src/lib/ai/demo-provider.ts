import type { TryOnProvider, TryOnInput, TryOnOutput } from "@/types/tryon";
import type { Look, HairColor } from "@/types/tryon";
import { readFile } from "fs/promises";
import path from "path";

const STAGE_DELAYS = [800, 1200, 1500, 1000];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadDemoResultAsDataUrl(relativePath: string): Promise<string> {
  const filePath = path.join(process.cwd(), "public", relativePath.replace(/^\//, ""));

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return relativePath;
  }
}

export const demoProvider: TryOnProvider = {
  name: "demo",

  async generateTryOn(
    _input: TryOnInput,
    look: Look,
    color: HairColor
  ): Promise<TryOnOutput> {
    void color;
    const start = Date.now();

    for (const stageDelay of STAGE_DELAYS) {
      await delay(stageDelay);
    }

    const resultImage = await loadDemoResultAsDataUrl(look.demoResultImage);

    return {
      resultImage,
      provider: "demo",
      processingTimeMs: Date.now() - start,
    };
  },
};
