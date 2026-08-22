import type { TryOnProvider, TryOnInput, TryOnOutput } from "@/types/tryon";
import type { Look, HairColor } from "@/types/tryon";

export async function createProvider(name: string): Promise<TryOnProvider> {
  switch (name) {
    case "openrouter":
      return (await import("./openrouter-provider")).openrouterProvider;
    case "gemini":
      return (await import("./gemini-provider")).geminiProvider;
    case "demo":
    default:
      return (await import("./demo-provider")).demoProvider;
  }
}

export function resolveProviderName(): string {
  const rawProvider = process.env.AI_PROVIDER;
  const configured = rawProvider?.toLowerCase().trim().replace(/['"]/g, "");

  const hasOpenRouterKey = Boolean(
    process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim()?.startsWith("sk-or-")
  );
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

  const model =
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "google/gemini-3.1-flash-image";

  console.log(`[TRYON] AI_PROVIDER = ${rawProvider ?? "undefined"}`);
  console.log(`[TRYON] OPENROUTER_API_KEY configured = ${hasOpenRouterKey}`);
  console.log(`[TRYON] GEMINI_API_KEY configured = ${hasGeminiKey}`);
  console.log(`[TRYON] MODEL = ${model}`);

  // If explicitly openrouter, or if an OpenRouter key/model is detected
  if (
    configured === "openrouter" ||
    (configured === "gemini" && (hasOpenRouterKey || model.includes("/")))
  ) {
    console.log(`[TRYON] selected provider = openrouter`);
    return "openrouter";
  }

  if (configured === "gemini") {
    console.log(`[TRYON] selected provider = gemini`);
    return "gemini";
  }

  console.log(`[TRYON] selected provider = demo`);
  return "demo";
}

export async function generateTryOn(
  input: TryOnInput,
  look: Look,
  color: HairColor
): Promise<TryOnOutput> {
  const providerName = resolveProviderName();
  const provider = await createProvider(providerName);
  return provider.generateTryOn(input, look, color);
}
