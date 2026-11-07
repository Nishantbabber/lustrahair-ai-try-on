"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { PhotoUpload } from "@/components/PhotoUpload";
import { LookSelector } from "@/components/LookSelector";
import { ProcessingView } from "@/components/ProcessingView";
import { ErrorState } from "@/components/ErrorState";
import { getSession, saveSession } from "@/lib/session";
import type { TryOnSession, HairColorId, TransformationMode } from "@/types/tryon";
import { useTenant } from "@/lib/tenant/context";
import { resolveShadesForStyle } from "@/lib/tenant/catalog";
import type { TenantStyle } from "@/types/tenant";

type Step = "upload" | "choose" | "processing" | "error";

function TryOnWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenant();

  const [step, setStep] = useState<Step>("upload");
  const [previousStep, setPreviousStep] = useState<Step>("upload");
  const [session, setSession] = useState<TryOnSession>(() => getSession());
  const [mode, setMode] = useState<TransformationMode>(() => {
    // If arriving from a style card (?style=...), default mode is "style" per requirements
    // Otherwise fallback to stored session mode or "both"
    const styleParam = searchParams.get("style");
    if (styleParam) return "style";
    return getSession().mode || "both";
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ code: string; message: string } | null>(null);

  // Validate preselected style from URL parameter (?style=...)
  const styleQueryParam = searchParams.get("style");
  const [preselectedStyle, setPreselectedStyle] = useState<TenantStyle | null>(() => {
    if (!styleQueryParam || !tenant.styles) return null;
    const match = tenant.styles.find(
      (s) => s.id.toLowerCase() === styleQueryParam.toLowerCase().trim()
    );
    return match || null;
  });

  // Keep preselected style and initial session in sync with tenant catalog
  useEffect(() => {
    const stored = getSession();
    const styles = tenant.styles ?? [];

    let lookId = stored.selectedLookId;

    // Check if URL style is valid and belongs to active tenant
    if (styleQueryParam && styles.length > 0) {
      const match = styles.find(
        (s) => s.id.toLowerCase() === styleQueryParam.toLowerCase().trim()
      );
      if (match) {
        lookId = match.id;
        setPreselectedStyle(match);
        setMode("style"); // Set transformation mode to Hairstyle per prompt requirement
      } else {
        setPreselectedStyle(null);
      }
    }

    if (styles.length > 0 && !styles.some((s) => s.id === lookId)) {
      lookId = styles[0].id;
    }

    const style = styles.find((s) => s.id === lookId);
    const shades = resolveShadesForStyle(tenant, style);
    let colorId = stored.selectedColorId;
    if (shades.length > 0 && !shades.some((s) => s.id === colorId)) {
      colorId = shades[0].id;
    }

    const currentMode = styleQueryParam ? "style" : stored.mode || "both";
    const patched = saveSession({
      selectedLookId: lookId,
      selectedColorId: colorId,
      mode: currentMode,
    });
    setSession(patched);

    // If customer already has photo & consent and NO preselected style, jump to style choice
    // But if preselected style was passed, keep on upload step so they see their photo and preselected style
    if (patched.originalImage && patched.photoConsentGiven && !patched.resultImage && !styleQueryParam) {
      setStep("choose");
    }
  }, [tenant, styleQueryParam]);

  const progressStep = step === "upload" ? 1 : step === "choose" || step === "error" ? 2 : 3;

  const handleImageSelect = useCallback((dataUrl: string, fileName: string) => {
    const updated = saveSession({
      originalImage: dataUrl,
      originalImageName: fileName,
      saved: false,
      provider: null,
    });
    setSession(updated);
  }, []);

  const handleClearImage = useCallback(() => {
    const updated = saveSession({
      originalImage: null,
      originalImageName: null,
    });
    setSession(updated);
  }, []);

  const handleConsentChange = useCallback((given: boolean) => {
    const updated = saveSession({ photoConsentGiven: given });
    setSession(updated);
  }, []);

  const handleModeChange = useCallback((newMode: TransformationMode) => {
    setMode(newMode);
    const updated = saveSession({ mode: newMode });
    setSession(updated);
  }, []);

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

  const generateTryOn = useCallback(
    async (overrideLookId?: string, overrideMode?: TransformationMode) => {
      if (!session.originalImage || !session.photoConsentGiven) return;

      const activeMode = overrideMode || mode;
      const targetLookId = activeMode === "color" ? undefined : overrideLookId || session.selectedLookId;
      const targetColorId = activeMode === "style" ? undefined : session.selectedColorId;

      setPreviousStep(step);
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
            mode: activeMode,
            lookId: targetLookId,
            colorId: targetColorId,
            consentGiven: true,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.resultImage) {
          setErrorDetails({
            code: data.code || (response.status === 429 ? "RATE_LIMIT_EXCEEDED" : "SERVER_ERROR"),
            message: data.error || data.details || "Generation failed",
          });
          setStep("error");
          return;
        }

        const updated = saveSession({
          resultImage: data.resultImage,
          provider: data.provider,
          mode: activeMode,
          ...(targetLookId ? { selectedLookId: targetLookId } : {}),
          ...(targetColorId ? { selectedColorId: targetColorId } : {}),
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
    },
    [session.originalImage, session.selectedLookId, session.selectedColorId, session.photoConsentGiven, tenant.id, step, mode, router]
  );

  // Triggered when clicking the primary action on the upload step
  const handleUploadContinue = useCallback(() => {
    if (!session.originalImage || !session.photoConsentGiven) return;

    if (preselectedStyle) {
      // Customer arrived with a validated preselected style — generate in "style" mode directly!
      void generateTryOn(preselectedStyle.id, "style");
    } else {
      // Normal flow without preselection — proceed to mode & style selection
      setStep("choose");
    }
  }, [session.originalImage, session.photoConsentGiven, preselectedStyle, generateTryOn]);

  const handleTryLook = useCallback(() => {
    if (!isGenerating) {
      void generateTryOn();
    }
  }, [generateTryOn, isGenerating]);

  const handleRetry = useCallback(() => {
    void generateTryOn();
  }, [generateTryOn]);

  const handleChooseAnother = useCallback(() => {
    setPreselectedStyle(null);
    setStep("choose");
  }, []);

  const handleGoBack = useCallback(() => {
    setStep(previousStep === "processing" ? "choose" : previousStep);
  }, [previousStep]);

  const handleStartAgain = useCallback(() => {
    handleClearImage();
    setPreselectedStyle(null);
    setStep("upload");
  }, [handleClearImage]);

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
          onContinue={handleUploadContinue}
          continueLabel={
            preselectedStyle
              ? `Try ${preselectedStyle.name}`
              : "Choose Transformation"
          }
          preselectedStyleName={preselectedStyle ? preselectedStyle.name : undefined}
          onClearPreselectedStyle={() => {
            setPreselectedStyle(null);
            setStep("choose");
          }}
        />
      )}

      {step === "choose" && (
        <LookSelector
          mode={mode}
          onModeChange={handleModeChange}
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
          onGoBack={handleGoBack}
          onStartAgain={handleStartAgain}
          hasPreviousResult={Boolean(session.resultImage)}
          onViewPreviousResult={() => router.push("/result")}
        />
      )}
    </div>
  );
}

export default function TryOnPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="text-sm font-medium text-charcoal-muted">
            Loading virtual try-on experience...
          </p>
        </div>
      }
    >
      <TryOnWizard />
    </Suspense>
  );
}
