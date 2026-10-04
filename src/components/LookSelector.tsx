"use client";

import { useTenant } from "@/lib/tenant/context";
import type { HairColorId } from "@/types/tryon";
import { Button } from "./Button";
import { StyleCard } from "./StyleCard";
import { ShadeSwatchSelector } from "./ShadeSwatchSelector";
import {
  isShadePickerHidden,
  resolveShadesForStyle,
} from "@/lib/tenant/catalog";

interface LookSelectorProps {
  selectedLookId: string;
  selectedColorId: HairColorId;
  photoConsentGiven: boolean;
  onLookSelect: (lookId: string) => void;
  onColorSelect: (colorId: HairColorId) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function LookSelector({
  selectedLookId,
  selectedColorId,
  photoConsentGiven,
  onLookSelect,
  onColorSelect,
  onContinue,
  onBack,
}: LookSelectorProps) {
  const { tenant } = useTenant();
  const styles = tenant.styles ?? [];
  const selectedStyle = styles.find((s) => s.id === selectedLookId);
  const availableShades = resolveShadesForStyle(tenant, selectedStyle);
  const hideShadePicker = isShadePickerHidden(selectedStyle);

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
        className="mb-10 grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3 sm:gap-4"
        role="radiogroup"
        aria-label="Hairstyle options"
      >
        {styles.map((look) => (
          <StyleCard
            key={look.id}
            style={look}
            selected={look.id === selectedLookId}
            onSelect={onLookSelect}
          />
        ))}
      </div>

      {styles.length === 0 && (
        <p className="mb-10 text-center text-sm text-charcoal-muted">
          No styles are configured for this store yet.
        </p>
      )}

      <p className="mb-8 text-center text-xs text-charcoal-muted">
        ✦ Style cards represent aesthetic inspiration. Your virtual try-on dynamically renders hair volume, texture, and length to blend with your personal photo and lighting.
      </p>

      {!hideShadePicker && (
        <ShadeSwatchSelector
          shades={availableShades}
          selectedId={selectedColorId}
          onSelect={onColorSelect}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="order-2 sm:order-1">
          Back
        </Button>
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!photoConsentGiven || styles.length === 0}
          className="order-1 sm:order-2 sm:min-w-[200px]"
        >
          Try This Look
        </Button>
      </div>
    </div>
  );
}
