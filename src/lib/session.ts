import {
  DEFAULT_COLOR_ID,
  DEFAULT_LOOK_ID,
  SESSION_STORAGE_KEY,
  ORIGINAL_IMAGE_STORAGE_KEY,
  type TryOnSession,
  type HairColorId,
  type TransformationMode,
} from "@/types/tryon";

/**
 * Session metadata stored in SESSION_STORAGE_KEY.
 * Does NOT contain originalImage or resultImage — those are stored separately.
 */
type SessionMetadata = Omit<TryOnSession, "originalImage" | "resultImage">;

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
  resultImage: null,
};

// ─── Low-level storage helpers ───────────────────────────────────────────────

function readOriginalImage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ORIGINAL_IMAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeOriginalImage(dataUrl: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl === null) {
      sessionStorage.removeItem(ORIGINAL_IMAGE_STORAGE_KEY);
    } else {
      sessionStorage.setItem(ORIGINAL_IMAGE_STORAGE_KEY, dataUrl);
    }
  } catch {
    // Quota exceeded — originalImage could not be persisted
  }
}

function readResultImage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return typeof parsed.resultImage === "string" ? parsed.resultImage : null;
  } catch {
    return null;
  }
}

function readMetadata(): SessionMetadata {
  if (typeof window === "undefined") return DEFAULT_METADATA;
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return DEFAULT_METADATA;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    // Strip image blobs from metadata before merging with defaults
    const { resultImage: _r, originalImage: _o, ...rest } = parsed as Record<string, unknown>;
    void _r;
    void _o;
    return { ...DEFAULT_METADATA, ...(rest as Partial<SessionMetadata>) };
  } catch {
    return DEFAULT_METADATA;
  }
}

function writeMetadata(meta: SessionMetadata, resultImage: string | null): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ ...meta, resultImage })
    );
  } catch {
    // Quota exceeded — persist metadata without the result image blob
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(meta));
    } catch {
      // Nothing we can do
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSession(): TryOnSession {
  if (typeof window === "undefined") return DEFAULT_SESSION;

  const metadata = readMetadata();
  const originalImage = readOriginalImage();
  const resultImage = readResultImage();

  return {
    ...DEFAULT_SESSION,
    ...metadata,
    originalImage,
    resultImage,
  };
}

/**
 * Saves a partial session update.
 *
 * originalImage is stored in its own dedicated sessionStorage key so that it
 * is NEVER evicted by a large resultImage blob overflowing the quota.
 *
 * resultImage is stored inside the main session JSON blob alongside metadata.
 */
export function saveSession(partial: Partial<TryOnSession>): TryOnSession {
  const current = getSession();
  const updated: TryOnSession = { ...current, ...partial };

  if (typeof window !== "undefined") {
    // 1. Persist originalImage separately if it has changed
    if ("originalImage" in partial) {
      writeOriginalImage(updated.originalImage);
    }

    // 2. Persist metadata + resultImage together
    const { originalImage: _orig, resultImage, ...rest } = updated;
    void _orig;
    writeMetadata(rest as SessionMetadata, resultImage);
  }

  return updated;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(ORIGINAL_IMAGE_STORAGE_KEY);
  }
}

export function hasValidResult(session: TryOnSession): boolean {
  const mode = session.mode ?? "both";
  if (!session.originalImage || !session.resultImage) return false;
  if (mode === "color") return Boolean(session.selectedColorId);
  if (mode === "style") return Boolean(session.selectedLookId);
  return Boolean(session.selectedLookId && session.selectedColorId);
}

export function updateLookSelection(lookId: string, colorId?: HairColorId, mode?: TransformationMode): TryOnSession {
  return saveSession({
    selectedLookId: lookId,
    ...(colorId ? { selectedColorId: colorId } : {}),
    ...(mode ? { mode } : {}),
    resultImage: null,
    saved: false,
    provider: null,
  });
}
