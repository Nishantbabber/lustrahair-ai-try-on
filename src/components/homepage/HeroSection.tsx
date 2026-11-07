"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ShieldCheck, UserCheck, ArrowRight, ArrowDown } from "lucide-react";
import { useTenant } from "@/lib/tenant/context";

export function HeroSection() {
  const { tenant } = useTenant();
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const tryOnHref =
    tenant.id && tenant.id !== "default"
      ? `/try-on?tenant=${encodeURIComponent(tenant.id)}`
      : "/try-on";

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => setIsDragging(false);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  return (
    <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-border/60">
      {/* Subtle decorative luxury ambient glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-champagne-light/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column — Editorial Copy & CTAs */}
          <div className="lg:col-span-7 xl:col-span-6 animate-fade-in">
            {/* Editorial Eyebrow */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 shadow-soft backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-champagne" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-charcoal-muted">
                B2B Virtual Try-On · {tenant.brandName}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl leading-[1.12] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
              See the look. <br />
              <span className="italic font-normal text-champagne">Love the result.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="mt-6 text-lg leading-relaxed text-charcoal-muted sm:text-xl">
              Give every client the confidence to explore a new look before making
              the change. LustraHair brings AI-powered virtual hairstyle and
              hair-colour try-on to modern salons and wig boutiques.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={tryOnHref}
                className="group inline-flex items-center justify-center gap-2.5 rounded-md bg-charcoal px-7 py-3.5 text-base font-medium text-ivory shadow-medium transition-all hover:bg-charcoal/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                <span>Try the Experience</span>
                <ArrowRight className="h-4 w-4 text-champagne transition-transform group-hover:translate-x-1" />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface/80 px-6 py-3.5 text-base font-medium text-charcoal shadow-soft transition-all hover:bg-ivory-dark hover:border-charcoal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                <span>Explore How It Works</span>
                <ArrowDown className="h-4 w-4 text-charcoal-muted" />
              </a>
            </div>

            {/* Three Value Points */}
            <div className="mt-10 border-t border-border/80 pt-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-champagne-light/50 text-champagne">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-medium leading-snug text-charcoal">
                    Personalised hairstyle previews
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-champagne-light/50 text-champagne">
                    <ShieldCheck className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-medium leading-snug text-charcoal">
                    Your brand, your experience
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-champagne-light/50 text-champagne">
                    <UserCheck className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-medium leading-snug text-charcoal">
                    No customer account required
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Large Editorial Photography with Interactive Split */}
          <div className="lg:col-span-5 xl:col-span-6 animate-fade-in">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Outer Luxury Frame */}
              <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface p-2 shadow-medium">
                <div
                  ref={containerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative aspect-[4/5] w-full overflow-hidden rounded-xl select-none cursor-ew-resize bg-ivory-dark touch-none"
                  role="img"
                  aria-label="Interactive before and after comparison of client photo and LustraHair virtual try-on preview"
                >
                  {/* After Image (Full background) */}
                  <Image
                    src="/images/hero/lustrahair-after.jpg"
                    alt="LustraHair virtual hairstyle transformation preview - After"
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover object-center pointer-events-none"
                    priority
                  />

                  {/* Before Image (Clipped overlay via clipPath) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                  >
                    <Image
                      src="/images/hero/lustrahair-before.jpg"
                      alt="Original client portrait before virtual try-on - Before"
                      fill
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-cover object-center pointer-events-none"
                      priority
                    />
                  </div>

                  {/* Split Divider Line */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-ivory shadow-[0_0_12px_rgba(0,0,0,0.4)] pointer-events-none"
                    style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-champagne bg-ivory text-charcoal shadow-medium">
                      <div className="flex gap-0.5">
                        <span className="h-3 w-0.5 rounded-full bg-champagne" />
                        <span className="h-3 w-0.5 rounded-full bg-champagne" />
                      </div>
                    </div>
                  </div>

                  {/* Corner Badges */}
                  <div className="absolute left-3.5 top-3.5 rounded-md bg-charcoal/80 px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase text-ivory backdrop-blur-sm pointer-events-none">
                    Before
                  </div>
                  <div className="absolute right-3.5 top-3.5 rounded-md bg-charcoal/80 px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase text-champagne backdrop-blur-sm pointer-events-none">
                    After · Virtual Try-On
                  </div>

                  {/* Bottom Drag Instruction */}
                  <div className="absolute bottom-3.5 inset-x-0 flex justify-center pointer-events-none">
                    <span className="rounded-full bg-charcoal/70 px-3 py-1 text-[11px] font-medium text-ivory/90 backdrop-blur-sm">
                      Drag to compare transformation
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Technology Badge */}
              <div className="absolute -bottom-5 -left-4 hidden sm:flex items-center gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-medium backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-champagne-light/50 text-champagne">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-charcoal">
                    High-Fidelity AI Rendering
                  </p>
                  <p className="text-[11px] text-charcoal-muted">
                    Preserves natural facial identity & lighting
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
