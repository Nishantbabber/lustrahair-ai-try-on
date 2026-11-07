"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X, CheckCircle2, Mail } from "lucide-react";
import { useTenant } from "@/lib/tenant/context";

/**
 * To configure a business contact email, set the following in your .env.local:
 *   NEXT_PUBLIC_CONTACT_EMAIL=hello@yourdomain.com
 *
 * Leave unset (or empty) and the dialog will show a "not yet configured" message.
 * Never invent or hard-code an email address here.
 */
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export function FinalCtaSection() {
  const { tenant } = useTenant();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const tryOnHref =
    tenant.id && tenant.id !== "default"
      ? `/try-on?tenant=${encodeURIComponent(tenant.id)}`
      : "/try-on";

  return (
    <section className="relative overflow-hidden py-20 lg:py-28 bg-charcoal text-ivory">
      {/* Subtle luxury ambient lighting */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-champagne/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-ivory/15 bg-ivory/5 px-3.5 py-1 text-xs uppercase tracking-widest text-champagne backdrop-blur-sm mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Elevate Your Brand</span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-ivory">
          Every great hair transformation starts with a vision.
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-ivory/70">
          Discover how {tenant.brandName} can bring virtual hairstyle try-on to
          your salon or hair business.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={tryOnHref}
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-md bg-champagne px-8 py-4 text-base font-medium text-charcoal shadow-medium transition-all hover:bg-champagne-light hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory"
          >
            <span>Try the Experience</span>
            <ArrowRight className="h-4 w-4 text-charcoal transition-transform group-hover:translate-x-1" />
          </Link>

          <button
            type="button"
            onClick={() => setContactModalOpen(true)}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md border border-ivory/30 bg-ivory/5 px-7 py-4 text-base font-medium text-ivory transition-all hover:bg-ivory/15 hover:border-ivory/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          >
            <span>Get in Touch</span>
          </button>
        </div>

        {/* Subtle reassurance points */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-ivory/50">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-champagne" /> In-browser try-on
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-champagne" /> No customer download
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-champagne" /> Custom tenant catalogue
          </span>
        </div>
      </div>

      {/* B2B Onboarding / Contact Dialog */}
      {contactModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 sm:p-8 text-left text-charcoal shadow-medium">
            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-ivory-dark hover:text-charcoal"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-champagne-light/50 px-3 py-1 text-xs font-semibold text-charcoal">
              <Sparkles className="h-3.5 w-3.5 text-champagne" />
              <span>Salon & Boutique Onboarding</span>
            </div>

            <h3 id="contact-modal-title" className="font-display text-2xl text-charcoal">
              Bring Virtual Try-On to Your Business
            </h3>

            <p className="mt-3 text-sm text-charcoal-muted leading-relaxed">
              LustraHair is an AI-powered virtual hairstyle try-on platform built for salons, wig boutiques, and hair extension businesses.
              It runs directly in the browser — no app download required for your clients.
            </p>

            {/* What's included */}
            <ul className="mt-5 space-y-2 text-sm text-charcoal-muted">
              {[
                "Branded experience with your own catalogue of styles and shades",
                "AI-generated previews on your client's own photo",
                "Direct purchase or booking links per style",
                "No customer account or download required",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-champagne" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* Contact section */}
            <div className="mt-6 rounded-lg border border-border bg-ivory-dark/60 p-4">
              {CONTACT_EMAIL ? (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-champagne mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-charcoal">Get in touch</p>
                    <p className="mt-1 text-xs text-charcoal-muted leading-relaxed">
                      To discuss onboarding for your business, email us at:
                    </p>
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="mt-2 inline-block text-sm font-medium text-charcoal underline underline-offset-2 hover:text-champagne transition-colors"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-charcoal mb-1">Direct enquiries</p>
                  <p className="text-xs text-charcoal-muted leading-relaxed">
                    A direct contact address for onboarding enquiries has not yet been configured.
                    In the meantime, you can evaluate the full working experience below using your own photos.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={tryOnHref}
                onClick={() => setContactModalOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-charcoal px-5 py-3 text-sm font-medium text-ivory hover:bg-charcoal/90"
              >
                <span>Try the Experience</span>
                <ArrowRight className="h-4 w-4 text-champagne" />
              </Link>
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="rounded-md border border-border px-4 py-3 text-sm font-medium text-charcoal-muted hover:bg-ivory-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
