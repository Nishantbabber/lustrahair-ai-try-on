"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowDown, Sparkles, Eye, GitCompare, Heart } from "lucide-react";
import { useTenant } from "@/lib/tenant/context";

export default function HomePage() {
  const { tenant } = useTenant();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="animate-fade-in">
            <p className="mb-4 text-sm uppercase tracking-[0.2em] text-champagne">
              Virtual Try-On · {tenant.brandName}
            </p>
            <h1 className="font-display mb-6 text-4xl leading-tight text-charcoal sm:text-5xl lg:text-[3.25rem]">
              {tenant.copy.headline}
            </h1>
            <p className="mb-8 max-w-md text-lg text-charcoal-muted">
              {tenant.copy.subheadline ||
                `Upload a photo and discover how ${tenant.brandName} styles look on you with AI-powered virtual try-on.`}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/try-on"
                className="inline-flex items-center justify-center rounded-md bg-charcoal px-6 py-3 text-base font-medium text-ivory transition-colors hover:bg-charcoal/90"
              >
                {tenant.copy.ctaText}
              </Link>
              <span className="text-sm text-charcoal-muted">
                No account required
              </span>
            </div>
          </div>

          {/* Hero visual — before/after */}
          <div className="relative animate-fade-in">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg shadow-medium">
              <Image
                src="/images/hero/after.jpg"
                alt="After — styled hair preview"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r-2 border-ivory/80">
                <Image
                  src="/images/hero/before.jpg"
                  alt="Before — original photo"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <span className="absolute left-3 top-3 rounded bg-charcoal/70 px-2.5 py-1 text-xs font-medium text-ivory">
                Before
              </span>
              <span className="absolute right-3 top-3 rounded bg-charcoal/70 px-2.5 py-1 text-xs font-medium text-ivory">
                After
              </span>
            </div>
            <div className="absolute -bottom-4 -right-4 hidden rounded-lg border border-border bg-surface p-4 shadow-soft sm:block">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-champagne" aria-hidden="true" />
                <span className="text-sm font-medium text-charcoal">
                  AI-powered preview
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-8">
          <a
            href="#how-it-works"
            className="flex flex-col items-center gap-1 text-charcoal-muted transition-colors hover:text-charcoal"
            aria-label="Scroll to learn more"
          >
            <ArrowDown className="h-5 w-5 animate-bounce" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* Trust / Value */}
      <section
        id="how-it-works"
        className="border-t border-border bg-surface/50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl text-charcoal sm:text-4xl">
              See it. Compare it. Love it.
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-champagne-light/40">
                <Eye className="h-5 w-5 text-champagne" aria-hidden="true" />
              </div>
              <h3 className="mb-2 font-medium text-charcoal">
                Visualize before you buy
              </h3>
              <p className="text-sm text-charcoal-muted">
                See exactly how a style looks on you before making a commitment.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-champagne-light/40">
                <GitCompare className="h-5 w-5 text-champagne" aria-hidden="true" />
              </div>
              <h3 className="mb-2 font-medium text-charcoal">
                Compare styles effortlessly
              </h3>
              <p className="text-sm text-charcoal-muted">
                Try multiple looks and shades to find your perfect match.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-champagne-light/40">
                <Heart className="h-5 w-5 text-champagne" aria-hidden="true" />
              </div>
              <h3 className="mb-2 font-medium text-charcoal">
                Shop the look you love
              </h3>
              <p className="text-sm text-charcoal-muted">
                Seamlessly connect your preview to the product you want.
              </p>
            </div>
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/try-on"
              className="inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-6 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-ivory-dark"
            >
              {tenant.copy.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="font-display text-lg text-charcoal">{tenant.brandName}</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            {tenant.copy.footerText || "Premium personalized virtual try-on experience."}
          </p>
        </div>
      </footer>
    </>
  );
}
