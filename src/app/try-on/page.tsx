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
import { useTenant } from "@/lib/tenant/context";
import { resolveShadesForStyle } from "@/lib/tenant/catalog";

type Step = "upload" | "choose" | "processing" | "error";

export default function TryOnPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const [step, setStep] = useState<Step>("upload");
  const [session, setSession] = useState<TryOnSession>(() => getSession());
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    const stored = getSession();
    const styles = tenant.styles ?? [];
    let lookId = stored.selectedLookId;
    if (styles.length > 0 && !styles.some((s) => s.id === lookId)) {
      lookId = styles[0].id;
    }
    const style = styles.find((s) => s.id === lookId);
    const shades = resolveShadesForStyle(tenant, style);
    let colorId = stored.selectedColorId;
    if (shades.length > 0 && !shades.some((s) => s.id === colorId)) {
      colorId = shades[0].id;
    }
    const patched = saveSession({ selectedLookId: lookId, selectedColorId: colorId });
    setSession(patched);
    if (patched.originalImage && patched.photoConsentGiven && !patched.resultImage) {
      setStep("choose");
    }
  }, [tenant]);

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

  const handleConsentChange = useCallback((given: boolean) => {
    const updated = saveSession({ photoConsentGiven: given });
    setSession(updated);
  }, []);

  const handleContinueToLooks = useCallback(() => {
    if (session.originalImage && session.photoConsentGiven) {
      setStep("choose");
    }
  }, [session.originalImage, session.photoConsentGiven]);

  const handleLookSelect = useCallback(
    (lookId: string) => {
      const style = tenant.styles.find((s) => s.id === lookId);
      const shades = resolveShadesForStyle(tenant, style);
      const colorStillValid = shades.some((s) => s.id === session.selectedColorId);
      const selectedColorId = colorStillValid
        ? session.selectedColorId
        : shades[0]?.id || session.selectedColorId;
      const updated = saveSession({
        selectedLookId: lookId,
        selectedColorId,
        resultImage: null,
        saved: false,
      });
      setSession(updated);
    },
    [tenant, session.selectedColorId]
  );

  const handleColorSelect = useCallback((colorId: HairColorId) => {
    const updated = saveSession({ selectedColorId: colorId });
    setSession(updated);
  }, []);

  const generateTryOn = useCallback(async () => {
    if (!session.originalImage || !session.photoConsentGiven) return;

    setStep("processing");
    setIsGenerating(true);
    setErrorDetails(null);

    try {
      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenant.id,
        },
        body: JSON.stringify({
          originalImage: session.originalImage,
          lookId: session.selectedLookId,
          colorId: session.selectedColorId,
          consentGiven: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.resultImage) {
        setErrorDetails({
          code: data.code || "SERVER_ERROR",
          message: data.error || data.details || "Generation failed",
        });
        setStep("error");
        return;
      }

      const updated = saveSession({
        resultImage: data.resultImage,
        provider: data.provider,
      });
      setSession(updated);
      router.push("/result");
    } catch (err) {
      setErrorDetails({
        code: "SERVER_ERROR",
        message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
      setStep("error");
    } finally {
      setIsGenerating(false);
    }
  }, [session.originalImage, session.selectedLookId, session.selectedColorId, session.photoConsentGiven, tenant.id, router]);

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
          consentGiven={Boolean(session.photoConsentGiven)}
          onConsentChange={handleConsentChange}
          onImageSelect={handleImageSelect}
          onClear={handleClearImage}
          onContinue={handleContinueToLooks}
        />
      )}

      {step === "choose" && (
        <LookSelector
          selectedLookId={session.selectedLookId}
          selectedColorId={session.selectedColorId}
          photoConsentGiven={Boolean(session.photoConsentGiven)}
          onLookSelect={handleLookSelect}
          onColorSelect={handleColorSelect}
          onContinue={handleTryLook}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "processing" && <ProcessingView />}

      {step === "error" && (
        <ErrorState
          errorCode={errorDetails?.code}
          errorMessage={errorDetails?.message}
          onRetry={handleRetry}
          onChooseAnother={handleChooseAnother}
          onUploadDifferent={() => setStep("upload")}
        />
      )}
    </div>
  );
}
