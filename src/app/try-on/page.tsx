"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { PhotoUpload } from "@/components/PhotoUpload";
import { LookSelector } from "@/components/LookSelector";
import { ProcessingView } from "@/components/ProcessingView";
import { ErrorState } from "@/components/ErrorState";
import { getSession, saveSession } from "@/lib/session";
import type { TryOnSession, HairColorId } from "@/types/tryon";

type Step = "upload" | "choose" | "processing" | "error";

export default function TryOnPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [session, setSession] = useState<TryOnSession>(() => getSession());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const stored = getSession();
    setSession(stored);
    if (stored.originalImage && !stored.resultImage) {
      setStep("choose");
    }
  }, []);

  const progressStep = step === "upload" ? 1 : step === "choose" || step === "error" ? 2 : 3;

  const handleImageSelect = useCallback((dataUrl: string, fileName: string) => {
    const updated = saveSession({
      originalImage: dataUrl,
      originalImageName: fileName,
      resultImage: null,
      saved: false,
      provider: null,
    });
    setSession(updated);
  }, []);

  const handleClearImage = useCallback(() => {
    const updated = saveSession({
      originalImage: null,
      originalImageName: null,
      resultImage: null,
    });
    setSession(updated);
  }, []);

  const handleContinueToLooks = useCallback(() => {
    if (session.originalImage) {
      setStep("choose");
    }
  }, [session.originalImage]);

  const handleLookSelect = useCallback((lookId: string) => {
    const updated = saveSession({ selectedLookId: lookId, resultImage: null, saved: false });
    setSession(updated);
  }, []);

  const handleColorSelect = useCallback((colorId: HairColorId) => {
    const updated = saveSession({ selectedColorId: colorId });
    setSession(updated);
  }, []);

  const generateTryOn = useCallback(async () => {
    if (!session.originalImage) return;

    setStep("processing");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImage: session.originalImage,
          lookId: session.selectedLookId,
          colorId: session.selectedColorId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.resultImage) {
        throw new Error(data.error || data.details || "Generation failed");
      }

      const updated = saveSession({
        resultImage: data.resultImage,
        provider: data.provider,
      });
      setSession(updated);
      router.push("/result");
    } catch {
      setStep("error");
    } finally {
      setIsGenerating(false);
    }
  }, [session.originalImage, session.selectedLookId, session.selectedColorId, router]);

  const handleTryLook = useCallback(() => {
    if (!isGenerating) {
      void generateTryOn();
    }
  }, [generateTryOn, isGenerating]);

  const handleRetry = useCallback(() => {
    void generateTryOn();
  }, [generateTryOn]);

  const handleChooseAnother = useCallback(() => {
    setStep("choose");
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <ProgressIndicator currentStep={progressStep as 1 | 2 | 3} />

      {step === "upload" && (
        <PhotoUpload
          image={session.originalImage}
          fileName={session.originalImageName}
          onImageSelect={handleImageSelect}
          onClear={handleClearImage}
          onContinue={handleContinueToLooks}
        />
      )}

      {step === "choose" && (
        <LookSelector
          selectedLookId={session.selectedLookId}
          selectedColorId={session.selectedColorId}
          onLookSelect={handleLookSelect}
          onColorSelect={handleColorSelect}
          onContinue={handleTryLook}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "processing" && <ProcessingView />}

      {step === "error" && (
        <ErrorState onRetry={handleRetry} onChooseAnother={handleChooseAnother} />
      )}
    </div>
  );
}
