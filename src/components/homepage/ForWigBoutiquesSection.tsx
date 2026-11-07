"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { useTenant } from "@/lib/tenant/context";

export function ForWigBoutiquesSection() {
  const { tenant } = useTenant();

  const tryOnHref =
    tenant.id && tenant.id !== "default"
      ? `/try-on?tenant=${encodeURIComponent(tenant.id)}`
      : "/try-on";

  const features = [
    "Showcase different hair looks.",
    "Help customers compare styles.",
    "Create a branded shopping experience.",
    "Let customers explore from anywhere.",
  ];

  return (
    <section id="for-wig-boutiques" className="py-20 lg:py-28 bg-surface/50 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column — Editorial Wig Boutique Visual */}
          <div className="order-2 lg:order-1 lg:col-span-6">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-2.5 shadow-medium">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-ivory-dark">
                  <Image
                    src="/images/products/silk-straight.jpg"
                    alt="Premium wig boutique collection and hairpiece preview"
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />

                  {/* Overlaid Boutique Card */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border/80 bg-surface/95 p-4 shadow-medium backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-semibold text-champagne">
                        Boutique Catalogue Integration
                      </span>
                      <span className="rounded-full bg-champagne-light/50 px-2 py-0.5 text-[10px] font-semibold text-charcoal">
                        Hairpieces & Wigs
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-charcoal">
                      Enable shoppers to preview lengths, lace textures and shades from their home or store
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative accent card */}
              <div className="absolute -bottom-4 -left-4 hidden sm:block rounded-lg border border-border bg-surface px-4 py-2.5 shadow-soft">
                <span className="text-xs font-semibold text-charcoal">
                  Reduced Return Rates
                </span>
              </div>
            </div>
          </div>

          {/* Right Column — Copy & Features */}
          <div className="order-1 lg:order-2 lg:col-span-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-champagne" />
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-charcoal-muted">
                For Wig Boutiques & Extension Brands
              </span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-charcoal">
              Help customers find a look that feels like them.
            </h2>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-charcoal-muted">
              Let customers visualise different hairstyles, lengths and colours as
              they explore their next wig or hairpiece.
            </p>

            {/* Feature Points Checklist */}
            <div className="mt-8 space-y-4">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-champagne-light/60 text-champagne">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-sm sm:text-base font-medium text-charcoal">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Link
                href={tryOnHref}
                className="group inline-flex items-center justify-center gap-2.5 rounded-md bg-charcoal px-7 py-3.5 text-base font-medium text-ivory shadow-soft transition-all hover:bg-charcoal/90 hover:shadow-medium"
              >
                <span>Explore the Experience</span>
                <ArrowRight className="h-4 w-4 text-champagne transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
