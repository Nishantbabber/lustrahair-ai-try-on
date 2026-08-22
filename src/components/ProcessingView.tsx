"use client";

import { useEffect, useState } from "react";
import { PROCESSING_STAGES } from "@/types/tryon";
import { cn } from "@/lib/utils";

export function ProcessingView() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) =>
        prev < PROCESSING_STAGES.length - 1 ? prev + 1 : prev
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in mx-auto max-w-md py-16 text-center">
      <div className="relative mx-auto mb-10 h-24 w-24">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-champagne"
          style={{ animationDuration: "1.5s" }}
          aria-hidden="true"
        />
        <div className="absolute inset-3 rounded-full bg-champagne-light/30" />
      </div>

      <h1 className="font-display mb-3 text-3xl text-charcoal">
        Creating your look
      </h1>
      <p className="mb-10 text-charcoal-muted">
        Our AI stylist is working on the details.
      </p>

      <ol className="space-y-4 text-left" aria-label="Processing stages">
        {PROCESSING_STAGES.map((stage, index) => {
          const isActive = index === activeStage;
          const isComplete = index < activeStage;

          return (
            <li
              key={stage}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-500",
                isActive && "bg-surface shadow-soft",
                !isActive && !isComplete && "opacity-50"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                  isComplete && "bg-champagne text-charcoal",
                  isActive && "bg-charcoal text-ivory animate-pulse-subtle",
                  !isActive && !isComplete && "border border-border-strong bg-surface"
                )}
                aria-hidden="true"
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isActive ? "font-medium text-charcoal" : "text-charcoal-muted"
                )}
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
