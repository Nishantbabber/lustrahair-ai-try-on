"use client";

import { Button } from "./Button";

interface ErrorStateProps {
  onRetry: () => void;
  onChooseAnother: () => void;
}

export function ErrorState({ onRetry, onChooseAnother }: ErrorStateProps) {
  return (
    <div className="animate-fade-in mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
        <span className="text-2xl text-error" aria-hidden="true">
          !
        </span>
      </div>

      <h1 className="font-display mb-3 text-3xl text-charcoal">
        Your look couldn&apos;t be created
      </h1>
      <p className="mb-8 text-charcoal-muted">
        Something went wrong while creating your preview. Your photo hasn&apos;t
        been changed.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={onRetry}>Try Again</Button>
        <Button variant="secondary" onClick={onChooseAnother}>
          Choose Another Look
        </Button>
      </div>
    </div>
  );
}
