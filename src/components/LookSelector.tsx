"use client";

import Image from "next/image";
import { LOOKS } from "@/data/looks";
import { HAIR_COLORS, type HairColorId } from "@/types/tryon";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface LookSelectorProps {
  selectedLookId: string;
  selectedColorId: HairColorId;
  onLookSelect: (lookId: string) => void;
  onColorSelect: (colorId: HairColorId) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function LookSelector({
  selectedLookId,
  selectedColorId,
  onLookSelect,
  onColorSelect,
  onContinue,
  onBack,
}: LookSelectorProps) {
  return (
    <div className="animate-fade-in mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="font-display mb-3 text-3xl text-charcoal sm:text-4xl">
          Choose your look.
        </h1>
        <p className="text-charcoal-muted">
          Select a style and we&apos;ll show you how it could look on you.
        </p>
      </div>

      <div
        className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
        role="radiogroup"
        aria-label="Hairstyle options"
      >
        {LOOKS.map((look) => {
          const isSelected = look.id === selectedLookId;
          return (
            <button
              key={look.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onLookSelect(look.id)}
              className={cn(
                "group overflow-hidden rounded-lg border bg-surface text-left transition-all",
                isSelected
                  ? "border-champagne ring-2 ring-champagne/30 shadow-medium"
                  : "border-border hover:border-border-strong hover:shadow-soft"
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-ivory-dark">
                <Image
                  src={look.previewImage}
                  alt={look.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                {isSelected && (
                  <div className="absolute inset-0 border-2 border-champagne" aria-hidden="true" />
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="text-sm font-medium text-charcoal sm:text-base">
                  {look.name}
                </h3>
                <p className="mt-0.5 text-xs text-champagne">{look.category}</p>
                <p className="mt-1 hidden text-xs text-charcoal-muted sm:block">
                  {look.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-10">
        <p className="mb-4 text-sm font-medium text-charcoal">Choose your shade</p>
        <div
          className="flex flex-wrap gap-3"
          role="radiogroup"
          aria-label="Hair color options"
        >
          {HAIR_COLORS.map((color) => {
            const isSelected = color.id === selectedColorId;
            return (
              <button
                key={color.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onColorSelect(color.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                  isSelected
                    ? "border-champagne bg-champagne-light/30 font-medium text-charcoal"
                    : "border-border bg-surface text-charcoal-muted hover:border-border-strong"
                )}
              >
                <span
                  className="h-4 w-4 rounded-full border border-border-strong"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
                {color.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="order-2 sm:order-1">
          Back
        </Button>
        <Button size="lg" onClick={onContinue} className="order-1 sm:order-2 sm:min-w-[200px]">
          Try This Look
        </Button>
      </div>
    </div>
  );
}
