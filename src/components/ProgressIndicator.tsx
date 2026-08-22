import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Your Photo" },
  { id: 2, label: "Choose Look" },
  { id: 3, label: "Your Result" },
] as const;

interface ProgressIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <nav aria-label="Try-on progress" className="mb-10">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isComplete = step.id < currentStep;

          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isActive && "bg-charcoal text-ivory",
                    isComplete && "bg-champagne text-charcoal",
                    !isActive && !isComplete && "border border-border-strong bg-surface text-charcoal-muted"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isComplete ? "✓" : step.id}
                </div>
                <span
                  className={cn(
                    "hidden text-xs sm:block",
                    isActive ? "font-medium text-charcoal" : "text-charcoal-muted"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-5 h-px w-8 sm:w-16",
                    isComplete ? "bg-champagne" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
