export type HairColorId = string;

export interface HairColor {
  id: string;
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
  colorOnly?: boolean;
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
  photoConsentGiven?: boolean;
}

export const DEFAULT_LOOK_ID = "signature-waves";
export const DEFAULT_COLOR_ID: HairColorId = "";

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
