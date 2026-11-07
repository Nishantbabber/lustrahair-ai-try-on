"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTenant } from "@/lib/tenant/context";

export function ExploreHairstylesSection() {
  const { tenant } = useTenant();

  const tryOnHref =
    tenant.id && tenant.id !== "default"
      ? `/try-on?tenant=${encodeURIComponent(tenant.id)}`
      : "/try-on";

  const buildStyleTryOnHref = (styleId: string) => {
    const params = new URLSearchParams();
    if (tenant.id && tenant.id !== "default") {
      params.set("tenant", tenant.id);
    }
    params.set("style", styleId);
    return `/try-on?${params.toString()}`;
  };

  const styles = tenant.styles || [];

  return (
    <section id="explore-looks" className="py-20 lg:py-28 bg-surface/50 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-medium text-champagne mb-3">
            Curated Business Catalogue
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-charcoal">
            Discover the possibilities.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-charcoal-muted leading-relaxed">
            From timeless styles to modern transformations, explore looks that
            inspire your next decision.
          </p>
        </div>

        {/* Hairstyle Grid — Consistent 4:5 ratios */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((style) => {
            const imageSrc =
              style.referenceImage || style.previewImage || "/images/hero/after.jpg";
            const cardTryOnHref = buildStyleTryOnHref(style.id);

            return (
              <div
                key={style.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:border-champagne/70 hover:shadow-medium"
              >
                {/* 4:5 Aspect Ratio Image Container */}
                <Link
                  href={cardTryOnHref}
                  className="relative aspect-[4/5] w-full overflow-hidden bg-ivory-dark block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                  aria-label={`Try ${style.name}`}
                >
                  <Image
                    src={imageSrc}
                    alt={`${style.name} hairstyle preview`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* Top Category Badge */}
                  <div className="absolute left-3.5 top-3.5 rounded-full bg-charcoal/70 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ivory backdrop-blur-sm">
                    {style.category}
                  </div>

                  {style.length && (
                    <div className="absolute right-3.5 top-3.5 rounded-full bg-ivory/90 px-2.5 py-0.5 text-[10px] font-medium text-charcoal shadow-xs backdrop-blur-sm">
                      {style.length}
                    </div>
                  )}

                  {/* Hover Prompt */}
                  <div className="absolute bottom-3.5 inset-x-3.5 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="flex items-center justify-center gap-1.5 rounded-md bg-ivory py-2 text-xs font-medium text-charcoal shadow-soft">
                      <Sparkles className="h-3.5 w-3.5 text-champagne" /> Try this look
                    </span>
                  </div>
                </Link>

                {/* Card Content */}
                <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                  <div>
                    <h3 className="font-display text-xl text-charcoal group-hover:text-charcoal/90 transition-colors">
                      {style.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal-muted line-clamp-2">
                      {style.description}
                    </p>

                    {style.stylistRecommendation && (
                      <p className="mt-3 text-xs italic text-charcoal-muted/80">
                        Stylist note: &ldquo;{style.stylistRecommendation}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Explicit Action Button for mobile & desktop */}
                  <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-charcoal-muted">
                      {style.category}
                    </span>
                    <Link
                      href={cardTryOnHref}
                      className="inline-flex items-center gap-1.5 rounded-md bg-charcoal px-3.5 py-1.5 text-xs font-medium text-ivory shadow-soft transition-all hover:bg-charcoal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                    >
                      <span>Try This Look</span>
                      <ArrowRight className="h-3.5 w-3.5 text-champagne" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Bottom CTA */}
        <div className="mt-14 text-center">
          <Link
            href={tryOnHref}
            className="group inline-flex items-center justify-center gap-2.5 rounded-md bg-charcoal px-8 py-3.5 text-base font-medium text-ivory shadow-medium transition-all hover:bg-charcoal/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          >
            <span>Try These Looks</span>
            <ArrowRight className="h-4 w-4 text-champagne transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-3 text-xs text-charcoal-muted">
            Instant AI try-on on your own photo · Zero account setup
          </p>
        </div>
      </div>
    </section>
  );
}
