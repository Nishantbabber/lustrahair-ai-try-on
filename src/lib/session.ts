import {
  DEFAULT_COLOR_ID,
  DEFAULT_LOOK_ID,
  SESSION_STORAGE_KEY,
  type TryOnSession,
  type HairColorId,
} from "@/types/tryon";

const DEFAULT_SESSION: TryOnSession = {
  originalImage: null,
  originalImageName: null,
  selectedLookId: DEFAULT_LOOK_ID,
  selectedColorId: DEFAULT_COLOR_ID,
  resultImage: null,
  saved: false,
  provider: null,
};

export function getSession(): TryOnSession {
  if (typeof window === "undefined") return DEFAULT_SESSION;

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return DEFAULT_SESSION;
    return { ...DEFAULT_SESSION, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SESSION;
  }
}

export function saveSession(partial: Partial<TryOnSession>): TryOnSession {
  const current = getSession();
  const updated = { ...current, ...partial };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // sessionStorage may be full with large images — persist metadata only
      const { originalImage, resultImage, ...metadata } = updated;
      void originalImage;
      void resultImage;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(metadata));
    }
  }

  return updated;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function hasValidResult(session: TryOnSession): boolean {
  return Boolean(session.originalImage && session.resultImage && session.selectedLookId);
}

export function updateLookSelection(lookId: string, colorId?: HairColorId): TryOnSession {
  return saveSession({
    selectedLookId: lookId,
    ...(colorId ? { selectedColorId: colorId } : {}),
    resultImage: null,
    saved: false,
    provider: null,
  });
}
