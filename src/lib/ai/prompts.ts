import type { HairColor, Look } from "@/types/tryon";

const LOOK_STYLE_DESCRIPTIONS: Record<string, string> = {
  "signature-waves":
    "Signature Waves: Long approximately 22-inch hair with soft, cascading loose waves, natural effortless movement, healthy volume, and premium human hair texture.",
  "silk-straight":
    "Silk Straight: Long approximately 24-inch sleek straight hair with a pin-straight, ultra-smooth glass-hair finish, realistic density, and high-shine salon gloss.",
  "soft-layers":
    "Soft Layers: Approximately 20-inch layered hair with subtle face-framing layers, natural movement, feathered texture, and weightless volume.",
  "modern-bob":
    "Modern Bob: Approximately 12-inch contemporary bob haircut with a clean blunt-to-angled shape, sleek texture, natural volume, and refined jawline framing.",
  "defined-curls":
    "Defined Curls: Approximately 20-inch curly hair featuring bouncy, full, well-defined spiral curls, soft natural volume, realistic curl density, and radiant shine.",
  "rich-brunette":
    "Rich Brunette: Long approximately 22-inch hair with a luxurious dimensional espresso-brunette finish, subtle multi-tonal highlights, and natural color depth.",
};

export function buildTryOnPrompt(look: Look, color: HairColor): string {
  const styleDescription =
    LOOK_STYLE_DESCRIPTIONS[look.id] ||
    `${look.name} (${look.category}, ${look.length}): ${look.description} ${look.aiInstruction}`;

  const colorDescription = look.colorOnly
    ? `Use the color finish described in the hairstyle instructions (this is a color-only treatment). Do not apply a different shade from a picker.`
    : `${color.name} (Hex code: ${color.hex}). Apply this hair color with realistic roots, natural tonal variation, and believable lighting reflections.`;

  return `Edit the provided photograph to create a realistic virtual hair try-on.

Change only the person's hair.

Preserve the person's identity, facial structure, facial features, eyes, nose, mouth, skin tone, expression, body proportions, pose, clothing, accessories, background, camera perspective and overall lighting.

Do not replace the person with another person.
Do not create a new person.
Do not change the background.
Do not alter clothing.
Do not alter facial features.

Only transform the hairstyle and hair characteristics.

Create realistic premium human hair with natural roots, individual strands, believable density, realistic volume, shadows, highlights and natural integration with the person's existing head shape and lighting.

The selected hairstyle is:
${styleDescription}

The selected color is:
${colorDescription}

Make the final image photorealistic and suitable for a premium hair-commerce virtual try-on experience.

The output should clearly be the SAME PERSON from the provided input photograph with the requested hairstyle/color applied.`;
}
