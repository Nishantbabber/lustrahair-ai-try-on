import { NextRequest, NextResponse } from "next/server";
import { generateTryOn, resolveProviderName } from "@/lib/ai/provider";
import { getLookById } from "@/data/looks";
import { HAIR_COLORS, type HairColorId } from "@/types/tryon";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const VALID_COLOR_IDS = new Set(HAIR_COLORS.map((c) => c.id));

interface TryOnRequestBody {
  originalImage?: string;
  lookId?: string;
  colorId?: HairColorId;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TryOnRequestBody;
    const providerName = resolveProviderName();

    console.log(`[TRYON] API route called`);
    console.log(`[TRYON] lookId = ${body.lookId}`);
    console.log(`[TRYON] colorId = ${body.colorId}`);
    console.log(`[TRYON] originalImage provided = ${Boolean(body.originalImage)}`);
    console.log(`[TRYON] provider = ${providerName}`);

    if (!body.originalImage || typeof body.originalImage !== "string") {
      return NextResponse.json(
        { error: "Original image is required" },
        { status: 400 }
      );
    }

    if (!body.originalImage.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image format. Expected a base64 data URL." },
        { status: 400 }
      );
    }

    if (!body.lookId || typeof body.lookId !== "string") {
      return NextResponse.json({ error: "Look ID is required" }, { status: 400 });
    }

    const look = getLookById(body.lookId);
    if (!look) {
      return NextResponse.json({ error: "Invalid look ID" }, { status: 404 });
    }

    const colorId = body.colorId ?? "espresso";
    if (!VALID_COLOR_IDS.has(colorId)) {
      return NextResponse.json({ error: "Invalid color ID" }, { status: 400 });
    }

    const color = HAIR_COLORS.find((c) => c.id === colorId)!;

    const result = await generateTryOn(
      {
        originalImage: body.originalImage,
        lookId: body.lookId,
        colorId,
      },
      look,
      color
    );

    return NextResponse.json({
      success: true,
      resultImage: result.resultImage,
      provider: result.provider,
      processingTimeMs: result.processingTimeMs,
      configuredProvider: providerName,
    });
  } catch (error) {
    console.error("[TRYON] Try-on generation failed:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      { error: "Failed to generate try-on result", details: message },
      { status: 500 }
    );
  }
}
