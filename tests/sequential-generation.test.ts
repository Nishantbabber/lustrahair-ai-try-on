import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getSession,
  saveSession,
  resetSessionWithNewPhoto,
  clearSession,
  buildTryOnRequest,
} from "../src/lib/session";
import {
  SESSION_STORAGE_KEY,
  ORIGINAL_IMAGE_STORAGE_KEY,
  CURRENT_GENERATION_IMAGE_STORAGE_KEY,
} from "../src/types/tryon";

// Create in-memory mock for sessionStorage
function setupMockSessionStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
  };

  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = mockStorage as Storage;
  return store;
}

describe("Image State & Sequential Generation Flow Verification", () => {
  test.beforeEach(() => {
    setupMockSessionStorage();
    clearSession();
  });

  test("1. Initial upload sets originalImage and currentGenerationImage to photo A", () => {
    const photoA = "data:image/png;base64,PHOTO_A";
    const session = resetSessionWithNewPhoto(photoA, "photoA.png");

    assert.equal(session.originalImage, photoA);
    assert.equal(session.currentGenerationImage, photoA);
    assert.equal(session.resultImage, null);

    // Verify buildTryOnRequest uses A for generation input
    const req1 = buildTryOnRequest(session, { mode: "style", lookId: "signature-waves" });
    assert.equal(req1.originalImage, photoA);
    assert.equal(req1.currentGenerationImage, photoA);
  });

  test("2. Exact sequence: A → B → C → D → E with proper inputs, Before image, and After image", () => {
    const photoA = "data:image/png;base64,PHOTO_A";
    const genB = "data:image/png;base64,RESULT_B_HAIRSTYLE";
    const genC = "data:image/png;base64,RESULT_C_COLOUR";
    const genD = "data:image/png;base64,RESULT_D_HAIRSTYLE";
    const genE = "data:image/png;base64,RESULT_E_COLOUR";

    // Step 0: Upload initial photo A
    resetSessionWithNewPhoto(photoA, "my-photo.png");
    let session = getSession();
    assert.equal(session.originalImage, photoA);
    assert.equal(session.currentGenerationImage, photoA);

    // Generation 1: Uses A -> Generates B
    const req1 = buildTryOnRequest(session, { mode: "style", lookId: "signature-waves" });
    assert.equal(req1.currentGenerationImage, photoA, "1st generation must use photo A as input");
    assert.equal(req1.originalImage, photoA, "Before image must be photo A");

    // Success 1: Result B arrives
    session = saveSession({
      resultImage: genB,
      mode: "style",
      selectedLookId: "signature-waves",
    });
    assert.equal(session.originalImage, photoA, "originalImage must remain photo A");
    assert.equal(session.currentGenerationImage, genB, "currentGenerationImage must now be B");
    assert.equal(session.resultImage, genB, "After image must be B");

    // Generation 2: Uses B -> Generates C
    const req2 = buildTryOnRequest(session, { mode: "color", colorId: "espresso-brown" });
    assert.equal(req2.currentGenerationImage, genB, "2nd generation must use image B as input");
    assert.equal(req2.originalImage, photoA, "Before image must remain photo A");

    // Success 2: Result C arrives
    session = saveSession({
      resultImage: genC,
      mode: "color",
      selectedColorId: "espresso-brown",
    });
    assert.equal(session.originalImage, photoA, "originalImage must remain photo A");
    assert.equal(session.currentGenerationImage, genC, "currentGenerationImage must now be C");
    assert.equal(session.resultImage, genC, "After image must be C");

    // Generation 3: Uses C -> Generates D
    const req3 = buildTryOnRequest(session, { mode: "style", lookId: "modern-bob" });
    assert.equal(req3.currentGenerationImage, genC, "3rd generation must use image C as input");
    assert.equal(req3.originalImage, photoA, "Before image must remain photo A");

    // Success 3: Result D arrives
    session = saveSession({
      resultImage: genD,
      mode: "style",
      selectedLookId: "modern-bob",
    });
    assert.equal(session.originalImage, photoA, "originalImage must remain photo A");
    assert.equal(session.currentGenerationImage, genD, "currentGenerationImage must now be D");
    assert.equal(session.resultImage, genD, "After image must be D");

    // Generation 4: Uses D -> Generates E
    const req4 = buildTryOnRequest(session, { mode: "color", colorId: "honey-blonde" });
    assert.equal(req4.currentGenerationImage, genD, "4th generation must use image D as input");
    assert.equal(req4.originalImage, photoA, "Before image must remain photo A");

    // Success 4: Result E arrives
    session = saveSession({
      resultImage: genE,
      mode: "color",
      selectedColorId: "honey-blonde",
    });
    assert.equal(session.originalImage, photoA, "originalImage must remain photo A");
    assert.equal(session.currentGenerationImage, genE, "currentGenerationImage must now be E");
    assert.equal(session.resultImage, genE, "After image must be latest result E");

    // Check persistence across getSession() simulating refresh
    const refreshed = getSession();
    assert.equal(refreshed.originalImage, photoA, "Refreshed session keeps permanent original A");
    assert.equal(refreshed.currentGenerationImage, genE, "Refreshed session keeps current generation E");
    assert.equal(refreshed.resultImage, genE, "Refreshed session keeps result image E");
  });

  test("3. Failed generation preserves both original and last successful generated image", () => {
    const photoA = "data:image/png;base64,PHOTO_A";
    const genB = "data:image/png;base64,RESULT_B";

    resetSessionWithNewPhoto(photoA, "photoA.png");
    saveSession({ resultImage: genB });

    let current = getSession();
    assert.equal(current.originalImage, photoA);
    assert.equal(current.currentGenerationImage, genB);
    assert.equal(current.resultImage, genB);

    // On failure: UI updates error state, does NOT call saveSession with new resultImage
    // Verify state remains unaffected
    const afterFailedAttempt = getSession();
    assert.equal(afterFailedAttempt.originalImage, photoA);
    assert.equal(afterFailedAttempt.currentGenerationImage, genB);
    assert.equal(afterFailedAttempt.resultImage, genB);
  });

  test("4. Uploading a new photograph resets both fields to new original and clears previous result", () => {
    const photoA = "data:image/png;base64,PHOTO_A";
    const genB = "data:image/png;base64,RESULT_B";
    const photoNew = "data:image/png;base64,PHOTO_NEW";

    resetSessionWithNewPhoto(photoA, "photoA.png");
    saveSession({ resultImage: genB });

    let current = getSession();
    assert.equal(current.originalImage, photoA);
    assert.equal(current.currentGenerationImage, genB);
    assert.equal(current.resultImage, genB);

    // User uploads a new photo
    const reset = resetSessionWithNewPhoto(photoNew, "photoNew.png");
    assert.equal(reset.originalImage, photoNew);
    assert.equal(reset.currentGenerationImage, photoNew);
    assert.equal(reset.resultImage, null);

    // Also test saveSession({ originalImage: photoNew }) directly
    const directUpload = saveSession({ originalImage: "data:image/png;base64,DIRECT_UPLOAD" });
    assert.equal(directUpload.originalImage, "data:image/png;base64,DIRECT_UPLOAD");
    assert.equal(directUpload.currentGenerationImage, "data:image/png;base64,DIRECT_UPLOAD");
    assert.equal(directUpload.resultImage, null);
  });

  test("5. Transformation modes correctly construct payload parameters", () => {
    const photoA = "data:image/png;base64,PHOTO_A";
    const session = resetSessionWithNewPhoto(photoA);
    session.photoConsentGiven = true;

    // Style mode
    const styleReq = buildTryOnRequest(session, {
      mode: "style",
      lookId: "signature-waves",
      colorId: "espresso-brown",
    });
    assert.equal(styleReq.mode, "style");
    assert.equal(styleReq.lookId, "signature-waves");
    assert.equal(styleReq.colorId, undefined, "colorId should be omitted in style mode");

    // Color mode
    const colorReq = buildTryOnRequest(session, {
      mode: "color",
      lookId: "signature-waves",
      colorId: "espresso-brown",
    });
    assert.equal(colorReq.mode, "color");
    assert.equal(colorReq.lookId, undefined, "lookId should be omitted in color mode");
    assert.equal(colorReq.colorId, "espresso-brown");

    // Both mode
    const bothReq = buildTryOnRequest(session, {
      mode: "both",
      lookId: "signature-waves",
      colorId: "espresso-brown",
    });
    assert.equal(bothReq.mode, "both");
    assert.equal(bothReq.lookId, "signature-waves");
    assert.equal(bothReq.colorId, "espresso-brown");
  });

  test("6. Storage keys and isolation: distinct sessionStorage keys used", () => {
    const store = (globalThis as unknown as { sessionStorage: Storage }).sessionStorage;
    const photoA = "data:image/png;base64,PHOTO_A";
    const genB = "data:image/png;base64,RESULT_B";

    resetSessionWithNewPhoto(photoA, "test.png");
    assert.equal(store.getItem(ORIGINAL_IMAGE_STORAGE_KEY), photoA);
    assert.equal(store.getItem(CURRENT_GENERATION_IMAGE_STORAGE_KEY), photoA);

    saveSession({ resultImage: genB });
    assert.equal(store.getItem(ORIGINAL_IMAGE_STORAGE_KEY), photoA, "ORIGINAL_IMAGE_STORAGE_KEY unchanged");
    assert.equal(store.getItem(CURRENT_GENERATION_IMAGE_STORAGE_KEY), genB, "CURRENT_GENERATION_IMAGE_STORAGE_KEY updated");

    const sessionBlob = JSON.parse(store.getItem(SESSION_STORAGE_KEY) || "{}");
    assert.equal(sessionBlob.originalImage, undefined, "Blob does not contain redundant originalImage");
    assert.equal(sessionBlob.currentGenerationImage, undefined, "Blob does not contain redundant currentGenerationImage");
    assert.equal(sessionBlob.resultImage, genB, "Blob contains resultImage");
  });
});
