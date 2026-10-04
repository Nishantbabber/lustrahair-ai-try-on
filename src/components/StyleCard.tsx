"use client";

/**
 * StyleCard — catalog tile for one tenant style.
 *
 * Expected style shape (subset of TenantStyle from src/types/tenant.ts):
 *
 *   interface StyleCardStyle {
 *     id: string;
 *     name: string;
 *     category: string;
 *     description: string;
 *     referenceImage: string;  // primary thumbnail URL
 *     previewImage?: string;   // optional alias if referenceImage is omitted
 *   }
 *
 * Onboarding a new tenant catalog is filling that interface per style in
 * tenants/[id].json. No fallback brand copy or image paths live here.
 *
 * Image frame: STYLE_CARD_ASPECT_RATIO (4 / 5). Grid columns are owned by
 * the parent (2-up on small screens, 3-up from lg) so catalogs of any size reflow.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

export const STYLE_CARD_ASPECT_RATIO = "4 / 5";

export interface StyleCardStyle {
  id: string;
  name: string;
  category: string;
  description: string;
  referenceImage: string;
  previewImage?: string;
}

interface StyleCardProps {
  style: StyleCardStyle;
  selected: boolean;
  onSelect: (styleId: string) => void;
}

export function StyleCard({ style, selected, onSelect }: StyleCardProps) {
  const imageSrc = style.referenceImage || style.previewImage || "";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(style.id)}
      className={cn(
        "group overflow-hidden rounded-lg border bg-surface text-left transition-all",
        selected
          ? "border-champagne ring-2 ring-champagne/30 shadow-medium"
          : "border-border hover:border-border-strong hover:shadow-soft"
      )}
    >
      <div
        className="relative overflow-hidden bg-ivory-dark"
        style={{ aspectRatio: STYLE_CARD_ASPECT_RATIO }}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={style.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 220px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-charcoal-muted">
            {style.name}
          </div>
        )}
        {selected && (
          <div className="absolute inset-0 border-2 border-champagne" aria-hidden="true" />
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-sm font-medium text-charcoal sm:text-base">{style.name}</h3>
        <p className="mt-0.5 text-xs text-champagne">{style.category}</p>
        <p className="mt-1 hidden text-xs text-charcoal-muted sm:block">{style.description}</p>
      </div>
    </button>
  );
}
