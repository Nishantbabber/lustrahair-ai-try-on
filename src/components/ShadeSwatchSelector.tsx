"use client";

import type { TenantShade } from "@/types/tenant";
import { cn } from "@/lib/utils";

interface ShadeSwatchSelectorProps {
  shades: TenantShade[];
  selectedId: string;
  onSelect: (shadeId: string) => void;
  label?: string;
}

/**
 * Renders 1–N tenant shades as wrapping swatch chips. Layout does not assume
 * a fixed count; hex comes from each shade object.
 */
export function ShadeSwatchSelector({
  shades,
  selectedId,
  onSelect,
  label = "Choose your shade",
}: ShadeSwatchSelectorProps) {
  if (!shades.length) return null;

  return (
    <div className="mb-10">
      <p className="mb-4 text-sm font-medium text-charcoal">{label}</p>
      <div
        className="flex flex-wrap gap-3"
        role="radiogroup"
        aria-label="Hair color options"
      >
        {shades.map((color) => {
          const isSelected = color.id === selectedId;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(color.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                isSelected
                  ? "border-champagne bg-champagne-light/30 font-medium text-charcoal"
                  : "border-border bg-surface text-charcoal-muted hover:border-border-strong"
              )}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-border-strong"
                style={{ backgroundColor: color.hex }}
                aria-hidden="true"
              />
              {color.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
