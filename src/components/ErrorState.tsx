"use client";

import { AlertCircle, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  errorCode?: string | null;
  errorMessage?: string | null;
  onRetry: () => void;
  onChooseAnother: () => void;
  onUploadDifferent?: () => void;
}

export function ErrorState({
  errorCode,
  errorMessage,
  onRetry,
  onChooseAnother,
  onUploadDifferent,
}: ErrorStateProps) {
  // Customized titles and icons based on error classification
  let title = "Your look couldn't be created";
  let defaultMessage =
    "Something went wrong while creating your preview. Your photo hasn't been changed.";
  let Icon = AlertCircle;
  let iconColorClass = "text-error";
  let iconBgClass = "bg-error/10";

  if (
    errorCode === "TENANT_QUOTA_EXCEEDED" ||
    errorCode === "RATE_LIMIT_EXCEEDED" ||
    errorCode === "IP_RATE_LIMIT_EXCEEDED"
  ) {
    title = "Try-On limit reached";
    defaultMessage =
      errorCode === "IP_RATE_LIMIT_EXCEEDED"
        ? "You've reached the hourly try-on limit from this network. Please try again in a little while."
        : "We've hit today's try-on limit for this store — please try again in a few hours.";
    Icon = Clock;
    iconColorClass = "text-champagne";
    iconBgClass = "bg-champagne-light/30";
  } else if (errorCode === "TIMEOUT") {
    title = "Generation timed out";
    defaultMessage =
      "The styling engine took longer than expected to render your look. Please try again.";
    Icon = Clock;
    iconColorClass = "text-charcoal";
    iconBgClass = "bg-ivory-dark";
  } else if (errorCode === "UNSAFE_IMAGE") {
    title = "Photo couldn't be processed";
    defaultMessage =
      "We couldn't process this photo due to safety or quality guidelines. Please upload a clear portrait with good lighting.";
    Icon = ShieldAlert;
    iconColorClass = "text-error";
    iconBgClass = "bg-error/10";
  }

  const finalMessage = errorMessage || defaultMessage;
  const isQuota =
    errorCode === "TENANT_QUOTA_EXCEEDED" ||
    errorCode === "RATE_LIMIT_EXCEEDED" ||
    errorCode === "IP_RATE_LIMIT_EXCEEDED";
  const isUnsafeImage = errorCode === "UNSAFE_IMAGE";

  return (
    <div className="animate-fade-in mx-auto max-w-md py-16 text-center">
      <div
        className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${iconBgClass}`}
      >
        <Icon className={`h-8 w-8 ${iconColorClass}`} aria-hidden="true" />
      </div>

      <h1 className="font-display mb-3 text-3xl text-charcoal">{title}</h1>
      <p className="mb-8 text-charcoal-muted leading-relaxed">{finalMessage}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {isUnsafeImage && onUploadDifferent ? (
          <Button onClick={onUploadDifferent}>Upload Different Photo</Button>
        ) : !isQuota ? (
          <Button onClick={onRetry}>Try Again</Button>
        ) : null}

        <Button variant={isQuota ? "primary" : "secondary"} onClick={onChooseAnother}>
          Choose Another Look
        </Button>
      </div>

      {isQuota && (
        <div className="mt-8 rounded-lg border border-border bg-surface p-4 text-xs text-charcoal-muted flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-champagne shrink-0" />
          <span>Need higher try-on volumes for your store? Inquire about our Enterprise Tier.</span>
        </div>
      )}
    </div>
  );
}
