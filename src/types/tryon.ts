export type HairColorId =
  | "natural-black"
  | "espresso"
  | "chestnut"
  | "honey-blonde";

export interface HairColor {
  id: HairColorId;
  name: string;
  hex: string;
}

export interface Look {
  id: string;
  name: string;
  category: string;
  length: string;
  description: string;
  previewImage: string;
  demoResultImage: string;
  aiInstruction: string;
  stylistRecommendation: string;
  productId: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  shades: string[];
  image: string;
  lookId: string;
}

export interface TryOnInput {
  originalImage: string;
  lookId: string;
  colorId: HairColorId;
}

export interface TryOnOutput {
  resultImage: string;
  provider: string;
  processingTimeMs?: number;
}

export interface TryOnProvider {
  name: string;
  generateTryOn(input: TryOnInput, look: Look, color: HairColor): Promise<TryOnOutput>;
}

export type TryOnStep = "upload" | "choose" | "processing" | "error";

export interface TryOnSession {
  originalImage: string | null;
  originalImageName: string | null;
  selectedLookId: string;
  selectedColorId: HairColorId;
  resultImage: string | null;
  saved: boolean;
  provider: string | null;
}

export const HAIR_COLORS: HairColor[] = [
  { id: "natural-black", name: "Natural Black", hex: "#1a1410" },
  { id: "espresso", name: "Espresso", hex: "#3d2314" },
  { id: "chestnut", name: "Chestnut", hex: "#6b3a2a" },
  { id: "honey-blonde", name: "Honey Blonde", hex: "#c9a66b" },
];

export const DEFAULT_LOOK_ID = "signature-waves";
export const DEFAULT_COLOR_ID: HairColorId = "espresso";

export const SESSION_STORAGE_KEY = "lustra-hair-session";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PROCESSING_STAGES = [
  "Analyze your photo",
  "Map your hair",
  "Apply selected style",
  "Refine the finish",
] as const;
