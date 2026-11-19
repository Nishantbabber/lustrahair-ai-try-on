"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "AI Try-On",
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Shared canvas dimensions in pixels.
   *
   * We load both images and derive a unified canvas aspect ratio:
   *  - If both images share the same aspect ratio (within tolerance),
   *    use that ratio directly — the slider will be pixel-perfect.
   *  - If they differ (e.g. a portrait original paired with a square
   *    generated image from an older generation), we use the original
   *    (before) image's aspect ratio and render the generated image
   *    with object-fit: contain, top-aligned, so faces still align.
   *
   * Both images are rendered with object-fit: contain and
   * object-position: top center to guarantee:
   *  - Neither photograph is cropped or distorted.
   *  - Both are anchored to the same top edge so face/head regions align.
   *  - The slider reveals matching spatial regions.
   */
  const [canvasRatio, setCanvasRatio] = useState<number | null>(null); // height/width × 100

  useEffect(() => {
    if (!beforeImage) return;
    let cancelled = false;

    // Load the before (original) image to derive the canvas aspect ratio.
    // When both images share the same aspect ratio (the normal case after
    // the FLUX dimension-matching fix), the slider is pixel-perfect.
    // When they differ, the before image's ratio is used as reference and
    // the after image is rendered with object-fit: contain (top-aligned).
    const img = new window.Image();
    img.onload = () => {
      if (cancelled || img.naturalWidth === 0) return;
      setCanvasRatio((img.naturalHeight / img.naturalWidth) * 100);
    };
    img.src = beforeImage;

    return () => {
      cancelled = true;
    };
  }, [beforeImage]);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPosition((p) => Math.max(0, p - 2));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPosition((p) => Math.min(100, p + 2));
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => setIsDragging(false);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  // Canvas height as a CSS padding-bottom percentage, capped at 85vh via inline style.
  // Fallback to 125 % (4:5) while the image loads.
  const paddingBottom =
    canvasRatio !== null ? `min(${canvasRatio.toFixed(4)}%, 85vh)` : "125%";

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-full cursor-ew-resize overflow-hidden rounded-lg bg-ivory-dark select-none touch-none"
      style={{ paddingBottom }}
      role="img"
      aria-label={`Before and after comparison. ${beforeLabel} on the left, ${afterLabel} on the right.`}
    >
      {/*
        After image — rendered full-canvas, object-contain + object-top.
        Anchoring to the top edge keeps the face/subject at the same vertical
        position in both panels regardless of aspect-ratio differences.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 h-full w-full object-contain object-top"
        draggable={false}
      />

      {/*
        Before image — clipped by slider position, same sizing as after image.
        Using an identically-sized absolute wrapper for the clip div ensures
        the clip path coordinates are consistent between both layers.
      */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 h-full w-full object-contain object-top"
          draggable={false}
        />
      </div>

      {/* Labels */}
      <span className="absolute left-3 top-3 rounded bg-charcoal/70 px-2.5 py-1 text-xs font-medium text-ivory">
        {beforeLabel}
      </span>
      <span className="absolute right-3 top-3 rounded bg-charcoal/70 px-2.5 py-1 text-xs font-medium text-ivory">
        {afterLabel}
      </span>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="h-full w-0.5 bg-ivory shadow-medium" />
      </div>

      {/* Drag handle */}
      <button
        type="button"
        className={cn(
          "absolute top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ivory bg-charcoal shadow-medium transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2",
          isDragging && "scale-110"
        )}
        style={{ left: `${position}%` }}
        onKeyDown={handleKeyDown}
        aria-label="Drag to compare before and after. Use arrow keys to adjust."
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        role="slider"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="text-ivory"
        >
          <path
            d="M5 4L1 8L5 12M11 4L15 8L11 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
