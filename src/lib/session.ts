import {
  DEFAULT_COLOR_ID,
  DEFAULT_LOOK_ID,
  SESSION_STORAGE_KEY,
  ORIGINAL_IMAGE_STORAGE_KEY,
  CURRENT_GENERATION_IMAGE_STORAGE_KEY,
  type TryOnSession,
  type HairColorId,
  type TransformationMode,
} from "@/types/tryon";

/**
 * Session metadata stored in SESSION_STORAGE_KEY.
 * Does NOT contain originalImage, currentGenerationImage, or resultImage — those are stored separately or handled specifically.
 */
type SessionMetadata = Omit<TryOnSession, "originalImage" | "currentGenerationImage" | "resultImage">;

const DEFAULT_METADATA: SessionMetadata = {
  originalImageName: null,
  selectedLookId: DEFAULT_LOOK_ID,
  selectedColorId: DEFAULT_COLOR_ID,
  saved: false,
  provider: null,
  photoConsentGiven: false,
  mode: "both",
};

const DEFAULT_SESSION: TryOnSession = {
  ...DEFAULT_METADATA,
  originalImage: null,
  currentGenerationImage: null,
  resultImage: null,
};

// ─── Low-level storage helpers ───────────────────────────────────────────────

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return window.sessionStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as { sessionStorage?: Storage }).sessionStorage) {
    return (globalThis as { sessionStorage?: Storage }).sessionStorage || null;
  }
  return null;
}

function readOriginalImage(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(ORIGINAL_IMAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeOriginalImage(dataUrl: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (dataUrl === null) {
      storage.removeItem(ORIGINAL_IMAGE_STORAGE_KEY);
    } else {
      storage.setItem(ORIGINAL_IMAGE_STORAGE_KEY, dataUrl);
    }
  } catch {
    // Quota exceeded — originalImage could not be persisted
  }
}

function readCurrentGenerationImage(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(CURRENT_GENERATION_IMAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCurrentGenerationImage(dataUrl: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (dataUrl === null) {
      storage.removeItem(CURRENT_GENERATION_IMAGE_STORAGE_KEY);
    } else {
      storage.setItem(CURRENT_GENERATION_IMAGE_STORAGE_KEY, dataUrl);
    }
  } catch {
    // Quota exceeded — currentGenerationImage could not be persisted
  }
}

function readResultImage(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const stored = storage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return typeof parsed.resultImage === "string" ? parsed.resultImage : null;
  } catch {
    return null;
  }
}

function readMetadata(): SessionMetadata {
  const storage = getStorage();
  if (!storage) return DEFAULT_METADATA;
  try {
    const stored = storage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return DEFAULT_METADATA;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    // Strip image blobs from metadata before merging with defaults
    const {
      resultImage: _r,
      originalImage: _o,
      currentGenerationImage: _c,
      ...rest
    } = parsed as Record<string, unknown>;
    void _r;
    void _o;
    void _c;
    return { ...DEFAULT_METADATA, ...(rest as Partial<SessionMetadata>) };
  } catch {
    return DEFAULT_METADATA;
  }
}

function writeMetadata(meta: SessionMetadata, resultImage: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ ...meta, resultImage })
    );
  } catch {
    // Quota exceeded — persist metadata without the result image blob
    try {
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(meta));
    } catch {
      // Nothing we can do
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSession(): TryOnSession {
  const storage = getStorage();
  if (!storage) return DEFAULT_SESSION;

  const metadata = readMetadata();
  const originalImage = readOriginalImage();
  const storedCurrent = readCurrentGenerationImage();
  const resultImage = readResultImage();

  // If currentGenerationImage was explicitly saved, use it.
  // Otherwise fallback to resultImage (legacy session after generation) or originalImage.
  const currentGenerationImage = storedCurrent ?? (resultImage ?? originalImage);

  return {
    ...DEFAULT_SESSION,
    ...metadata,
    originalImage,
    currentGenerationImage,
    resultImage,
  };
}

/**
 * Saves a partial session update.
 *
 * - originalImage is stored in its own dedicated sessionStorage key and remains untouched across generations.
 * - currentGenerationImage tracks the latest successful generation image and is stored separately.
 * - resultImage is stored inside the main session JSON blob alongside metadata.
 */
export function saveSession(partial: Partial<TryOnSession>): TryOnSession {
  const current = getSession();
  const effectivePartial = { ...partial };

  // 1. If a new originalImage is uploaded and currentGenerationImage is not explicitly set:
  // reset currentGenerationImage to the new original upload, and clear resultImage if not specified
  if ("originalImage" in partial && !("currentGenerationImage" in partial)) {
    effectivePartial.currentGenerationImage = partial.originalImage;
    if (!("resultImage" in partial)) {
      effectivePartial.resultImage = null;
    }
  }

  // 2. If a new resultImage is provided (successful generation) and currentGenerationImage is not explicitly set:
  // update currentGenerationImage to the newly generated result image while keeping originalImage intact
  if ("resultImage" in partial && partial.resultImage && !("currentGenerationImage" in partial)) {
    effectivePartial.currentGenerationImage = partial.resultImage;
  }

  const updated: TryOnSession = { ...current, ...effectivePartial };

  const storage = getStorage();
  if (storage) {
    // 1. Persist originalImage separately if changed
    if ("originalImage" in effectivePartial) {
      writeOriginalImage(updated.originalImage);
    }

    // 2. Persist currentGenerationImage separately if changed
    if (
      "currentGenerationImage" in effectivePartial ||
      "originalImage" in effectivePartial ||
      "resultImage" in effectivePartial
    ) {
      writeCurrentGenerationImage(updated.currentGenerationImage ?? null);
    }

    // 3. Persist metadata + resultImage together
    const {
      originalImage: _orig,
      currentGenerationImage: _curr,
      resultImage,
      ...rest
    } = updated;
    void _orig;
    void _curr;
    writeMetadata(rest as SessionMetadata, resultImage);
  }

  return updated;
}

export function resetSessionWithNewPhoto(
  newPhotoDataUrl: string,
  fileName: string | null = null
): TryOnSession {
  return saveSession({
    originalImage: newPhotoDataUrl,
    currentGenerationImage: newPhotoDataUrl,
    originalImageName: fileName,
    resultImage: null,
    saved: false,
    provider: null,
  });
}

export function clearSession(): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(SESSION_STORAGE_KEY);
    storage.removeItem(ORIGINAL_IMAGE_STORAGE_KEY);
    storage.removeItem(CURRENT_GENERATION_IMAGE_STORAGE_KEY);
  }
}

export function hasValidResult(session: TryOnSession): boolean {
  const mode = session.mode ?? "both";
  if (!session.originalImage || !session.resultImage) return false;
  if (mode === "color") return Boolean(session.selectedColorId);
  if (mode === "style") return Boolean(session.selectedLookId);
  return Boolean(session.selectedLookId && session.selectedColorId);
}

export function updateLookSelection(
  lookId: string,
  colorId?: HairColorId,
  mode?: TransformationMode
): TryOnSession {
  return saveSession({
    selectedLookId: lookId,
    ...(colorId ? { selectedColorId: colorId } : {}),
    ...(mode ? { mode } : {}),
    saved: false,
    provider: null,
  });
}

export interface BuildTryOnRequestOptions {
  mode?: TransformationMode;
  lookId?: string;
  colorId?: HairColorId;
  currentGenerationImage?: string;
  originalImage?: string;
}

export interface TryOnRequestPayload {
  originalImage: string;
  currentGenerationImage: string;
  mode: TransformationMode;
  lookId?: string;
  colorId?: HairColorId;
  consentGiven: boolean;
}

/**
 * Builds the try-on generation request payload.
 * Strictly uses currentGenerationImage (latest successful generated image, or initial photo)
 * as the generation input, and preserves originalImage as the permanent Before image.
 */
export function buildTryOnRequest(
  session: TryOnSession,
  options?: BuildTryOnRequestOptions
): TryOnRequestPayload {
  const mode: TransformationMode = options?.mode || session.mode || "both";
  const originalImage = options?.originalImage || session.originalImage || "";
  const currentGenerationImage =
    options?.currentGenerationImage || session.currentGenerationImage || session.originalImage || "";

  const requireStyle = mode === "style" || mode === "both";
  const requireColor = mode === "color" || mode === "both";

  const targetLookId = requireStyle ? (options?.lookId || session.selectedLookId) : undefined;
  const targetColorId = requireColor ? (options?.colorId || session.selectedColorId) : undefined;

  return {
    originalImage,
    currentGenerationImage,
    mode,
    ...(targetLookId ? { lookId: targetLookId } : {}),
    ...(targetColorId ? { colorId: targetColorId } : {}),
    consentGiven: Boolean(session.photoConsentGiven),
  };
}
