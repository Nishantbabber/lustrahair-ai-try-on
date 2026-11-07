"use client";

import { useTenant } from "@/lib/tenant/context";
import type { HairColorId, TransformationMode } from "@/types/tryon";
import { Button } from "./Button";
import { StyleCard } from "./StyleCard";
import { ShadeSwatchSelector } from "./ShadeSwatchSelector";
import {
  isShadePickerHidden,
  resolveShadesForStyle,
} from "@/lib/tenant/catalog";
import { Sparkles, Palette, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface LookSelectorProps {
  mode: TransformationMode;
  onModeChange: (mode: TransformationMode) => void;
  selectedLookId: string;
  selectedColorId: HairColorId;
  photoConsentGiven: boolean;
  onLookSelect: (lookId: string) => void;
  onColorSelect: (colorId: HairColorId) => void;
  onContinue: () => void;
  onBack: () => void;
}

const MODES: Array<{
  id: TransformationMode;
  label: string;
  shortDesc: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "style",
    label: "Hairstyle Only",
    shortDesc: "Change hairstyle · Keep original hair colour",
    icon: Scissors,
  },
  {
    id: "color",
    label: "Hair Colour Only",
    shortDesc: "Change hair colour · Keep existing haircut",
    icon: Palette,
  },
  {
    id: "both",
    label: "Hairstyle + Colour",
    shortDesc: "Transform both hairstyle and hair colour",
    icon: Sparkles,
  },
];

export function LookSelector({
  mode,
  onModeChange,
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
  const hideShadePicker = isShadePickerHidden(selectedStyle);

  // Available shades depends on mode: in color-only mode, full palette is available
  // In "both" mode, if style restricts shades, use resolved shades
  const availableShades =
    mode === "color"
      ? tenant.shades ?? []
      : resolveShadesForStyle(tenant, selectedStyle);

  const showStyles = mode === "style" || mode === "both";
  const showColors =
    (mode === "color" || mode === "both") && !(mode === "both" && hideShadePicker);

  const canContinue =
    photoConsentGiven &&
    ((mode === "style" && Boolean(selectedLookId)) ||
      (mode === "color" && Boolean(selectedColorId)) ||
      (mode === "both" && Boolean(selectedLookId) && (hideShadePicker || Boolean(selectedColorId))));

  return (
    <div className="animate-fade-in mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-display mb-3 text-3xl text-charcoal sm:text-4xl">
          Personalize your transformation
        </h1>
        <p className="text-charcoal-muted">
          Choose whether to try a new hairstyle, a new colour, or both together.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wider text-charcoal-muted font-medium mb-3 text-center sm:text-left">
          Select Transformation Mode
        </p>
        <div
          role="radiogroup"
          aria-label="Transformation mode"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {MODES.map((item) => {
            const Icon = item.icon;
            const isSelected = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onModeChange(item.id)}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border text-left transition-all",
                  isSelected
                    ? "border-champagne bg-champagne-light/35 shadow-soft ring-1 ring-champagne"
                    : "border-border bg-surface hover:border-champagne/50 hover:bg-ivory-dark/40"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-xs",
                      isSelected
                        ? "bg-charcoal text-champagne"
                        : "bg-ivory-dark text-charcoal-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-display text-base font-medium text-charcoal">
                    {item.label}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  {item.shortDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode explanation banner */}
      <div className="mb-8 rounded-lg border border-border bg-ivory-dark/40 p-4 text-xs text-charcoal leading-relaxed flex items-center justify-between">
        <div>
          {mode === "style" && (
            <span>
              ✦ <strong>Hairstyle Only:</strong> The AI will render the chosen hairstyle while preserving your existing natural hair colour.
            </span>
          )}
          {mode === "color" && (
            <span>
              ✦ <strong>Hair Colour Only:</strong> The AI will recolour your hair with salon finish while keeping your exact haircut, length, and texture.
            </span>
          )}
          {mode === "both" && (
            <span>
              ✦ <strong>Hairstyle + Colour:</strong> The AI will render both the selected hairstyle cut and the selected salon shade together.
            </span>
          )}
        </div>
      </div>

      {/* Hairstyle Selection Grid (Mode: style or both) */}
      {showStyles && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-charcoal">
              Choose Hairstyle
            </h2>
            <span className="text-xs text-charcoal-muted">
              {styles.length} styles available
            </span>
          </div>

          <div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
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
            <p className="mb-6 text-center text-sm text-charcoal-muted">
              No styles are configured for this store yet.
            </p>
          )}
        </div>
      )}

      {/* Colour / Shade Swatch Selector (Mode: color or both) */}
      {showColors && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl text-charcoal">
              {mode === "color" ? "Choose Hair Colour" : "Choose Shade"}
            </h2>
            <span className="text-xs text-charcoal-muted">
              {availableShades.length} shades available
            </span>
          </div>

          <ShadeSwatchSelector
            shades={availableShades}
            selectedId={selectedColorId}
            onSelect={onColorSelect}
            label={
              mode === "color"
                ? "Select the salon shade you want to preview on your current haircut:"
                : "Select the shade for your new hairstyle:"
            }
          />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={onBack} className="order-2 sm:order-1">
          Back
        </Button>
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!canContinue}
          className="order-1 sm:order-2 sm:min-w-[220px]"
        >
          {mode === "style" && "Try This Hairstyle"}
          {mode === "color" && "Try This Colour"}
          {mode === "both" && "Try This Look"}
        </Button>
      </div>
    </div>
  );
}
