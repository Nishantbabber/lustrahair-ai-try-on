import type { HairColor, Look, TransformationMode } from "@/types/tryon";

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

export function buildTryOnPrompt(
  look?: Look | null,
  color?: HairColor | null,
  mode: TransformationMode = "both"
): string {
  if (mode === "style" && look) {
    return buildStyleOnlyPrompt(look);
  }

  if (mode === "color" && color) {
    return buildColorOnlyPrompt(color);
  }

  // mode === "both" or default fallback
  return buildStyleAndColorPrompt(look, color);
}

/**
 * Mode A: Hairstyle only
 * Changes the hairstyle while strictly preserving the person's original hair color.
 */
function buildStyleOnlyPrompt(look: Look): string {
  const styleDescription =
    LOOK_STYLE_DESCRIPTIONS[look.id] ||
    `${look.name} (${look.category}, ${look.length}): ${look.description} ${look.aiInstruction}`;

  return `Edit the provided photograph to create a realistic virtual hairstyle try-on.

Change ONLY the person's haircut and hairstyle according to the selected style below.

CRITICAL INSTRUCTIONS FOR HAIR COLOR AND IDENTITY:
- PRESERVE the person's existing natural hair color as closely as possible. Match the roots, base tones, and natural highlights seen in the input photo. Do NOT dye or alter the hair color.
- PRESERVE the person's exact facial identity, face shape, facial features, eyes, eyebrows, nose, mouth, skin tone, and expression.
- PRESERVE clothing, accessories, background, camera angle, and scene lighting.
- Do NOT replace or generate a new person.
- The output MUST clearly show the SAME PERSON from the input photo wearing the new hairstyle.

The new hairstyle to apply is:
${styleDescription}

Create realistic premium salon hair with natural roots, individual strands, believable density, realistic volume, natural movement, shadows, highlights, and seamless integration with the person's existing head shape and lighting.`;
}

/**
 * Mode B: Hair Colour only
 * Changes ONLY the hair colour while strictly preserving the person's existing hairstyle, length, texture, and haircut.
 */
function buildColorOnlyPrompt(color: HairColor): string {
  const colorInstruction =
    color.aiInstruction ||
    `${color.name} (Hex code: ${color.hex}). Apply this hair color with realistic roots, natural multi-tonal depth, and believable light reflection.`;

  return `Edit the provided photograph to create a realistic virtual hair color try-on.

CRITICAL INSTRUCTIONS — DO NOT CHANGE THE HAIRSTYLE:
- Change ONLY the color of the hair.
- PRESERVE the person's existing hairstyle exactly as it is in the input photograph:
  * Keep the exact same haircut, hair length, and silhouette.
  * Keep the exact same hair texture, wave pattern, or curl pattern.
  * Keep the exact same parting, volume, and hair styling.
  * Do NOT give the person a haircut or a different hairstyle.
- Apply the new hair color ONLY to the hair. Do NOT tint eyebrows, eyelashes, skin, forehead, neck, clothing, or background.
- PRESERVE the person's facial identity, facial features, skin tone, facial expression, body pose, clothing, and background.
- The output MUST clearly be the SAME PERSON from the input photo with their existing haircut recolored.

The target hair color to apply is:
${colorInstruction}
(Shade name: ${color.name}, Target Hex: ${color.hex})

Render the hair color with authentic salon dimension, realistic root shadowing, natural light sheen, and seamless blending across all strands.`;
}

/**
 * Mode C: Hairstyle + Hair Colour
 * Applies both the selected hairstyle and selected hair colour.
 */
function buildStyleAndColorPrompt(look?: Look | null, color?: HairColor | null): string {
  const styleDescription = look
    ? LOOK_STYLE_DESCRIPTIONS[look.id] ||
      `${look.name} (${look.category}, ${look.length}): ${look.description} ${look.aiInstruction}`
    : "Natural salon-styled hair";

  const colorDescription = color
    ? (color.aiInstruction ||
      `${color.name} (Hex code: ${color.hex}). Apply this hair color with realistic roots, natural tonal variation, and believable lighting reflections.`)
    : "Natural dimensional salon hair color";

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
