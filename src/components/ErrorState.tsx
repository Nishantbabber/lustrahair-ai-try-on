"use client";

import { AlertCircle, Clock, ShieldAlert, ArrowLeft, RefreshCw, Eye } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  errorCode?: string | null;
  errorMessage?: string | null;
  onRetry: () => void;
  onChooseAnother: () => void;
  onUploadDifferent?: () => void;
  onGoBack?: () => void;
  onStartAgain?: () => void;
  onViewPreviousResult?: () => void;
  hasPreviousResult?: boolean;
}

export function ErrorState({
  errorCode,
  errorMessage,
  onRetry,
  onChooseAnother,
  onUploadDifferent,
  onGoBack,
  onStartAgain,
  onViewPreviousResult,
  hasPreviousResult = false,
}: ErrorStateProps) {
  const isQuota =
    errorCode === "TENANT_QUOTA_EXCEEDED" ||
    errorCode === "RATE_LIMIT_EXCEEDED" ||
    errorCode === "IP_RATE_LIMIT_EXCEEDED";
  const isUnsafeImage = errorCode === "UNSAFE_IMAGE";

  let title = "Your look couldn't be created";
  let defaultMessage =
    "Something went wrong while creating your preview. Your photo hasn't been changed.";
  let Icon = AlertCircle;
  let iconColorClass = "text-error";
  let iconBgClass = "bg-error/10";

  if (errorCode === "IP_RATE_LIMIT_EXCEEDED") {
    title = "Try-On limit reached for this session";
    defaultMessage =
      "You've reached the rolling hourly try-on limit from this network. No additional previews can be generated right now. Please check back in a little while.";
    Icon = Clock;
    iconColorClass = "text-champagne";
    iconBgClass = "bg-champagne-light/30";
  } else if (errorCode === "TENANT_QUOTA_EXCEEDED") {
    title = "Store try-on limit reached";
    defaultMessage =
      "This store has reached its monthly virtual try-on quota. Please contact the salon or wig boutique directly for consultation.";
    Icon = Clock;
    iconColorClass = "text-champagne";
    iconBgClass = "bg-champagne-light/30";
  } else if (errorCode === "RATE_LIMIT_EXCEEDED") {
    title = "Styling engine capacity reached";
    defaultMessage =
      "The styling engine is currently experiencing high demand. No more generations are available in this session. Please try again shortly.";
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
  } else if (isUnsafeImage) {
    title = "Photo couldn't be processed";
    defaultMessage =
      "We couldn't process this photo due to safety or quality guidelines. Please upload a clear portrait with good lighting.";
    Icon = ShieldAlert;
    iconColorClass = "text-error";
    iconBgClass = "bg-error/10";
  }

  const finalMessage = errorMessage || defaultMessage;

  return (
    <div className="animate-fade-in mx-auto max-w-lg py-12 px-4 text-center">
      <div
        className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${iconBgClass}`}
      >
        <Icon className={`h-8 w-8 ${iconColorClass}`} aria-hidden="true" />
      </div>

      <h1 className="font-display mb-3 text-2xl sm:text-3xl text-charcoal">{title}</h1>
      <p className="mb-8 text-sm sm:text-base text-charcoal-muted leading-relaxed">
        {finalMessage}
      </p>

      {/* Quota limit explicit actions */}
      {isQuota ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {hasPreviousResult && onViewPreviousResult && (
              <Button onClick={onViewPreviousResult} className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4 text-champagne" />
                <span>View Current Result</span>
              </Button>
            )}

            {onGoBack ? (
              <Button
                variant={hasPreviousResult ? "secondary" : "primary"}
                onClick={onGoBack}
                className="flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go Back</span>
              </Button>
            ) : (
              <Button onClick={onChooseAnother}>Go to Style Selection</Button>
            )}

            {onStartAgain && (
              <Button
                variant="ghost"
                onClick={onStartAgain}
                className="flex items-center justify-center gap-2 text-charcoal-muted hover:text-charcoal"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Start Again</span>
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 text-xs text-charcoal-muted text-center">
            <span>
              Note: Network and store try-on limits protect server availability. Starting over does not bypass active hourly network limits.
            </span>
          </div>
        </div>
      ) : (
        /* Non-quota errors (unsafe image, network timeout, etc.) */
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isUnsafeImage && onUploadDifferent ? (
            <Button onClick={onUploadDifferent}>Upload Different Photo</Button>
          ) : (
            <Button onClick={onRetry}>Try Again</Button>
          )}

          <Button variant="secondary" onClick={onChooseAnother}>
            Choose Another Look
          </Button>
        </div>
      )}
    </div>
  );
}
