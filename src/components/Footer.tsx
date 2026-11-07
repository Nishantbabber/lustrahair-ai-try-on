"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShieldCheck, FileText, ArrowUpRight } from "lucide-react";
import { useTenant } from "@/lib/tenant/context";

export function Footer() {
  const { tenant } = useTenant();
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const tryOnHref =
    tenant.id && tenant.id !== "default"
      ? `/try-on?tenant=${encodeURIComponent(tenant.id)}`
      : "/try-on";

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-ivory text-charcoal">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand & Description */}
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne rounded"
            >
              {tenant.logo.path ? (
                <Image
                  src={tenant.logo.path}
                  alt={tenant.brandName}
                  width={tenant.logo.width || 130}
                  height={tenant.logo.height || 40}
                  className="object-contain max-h-10"
                />
              ) : (
                <span className="font-display text-2xl font-normal tracking-tight text-charcoal">
                  {tenant.logo.textFallback || tenant.brandName}
                </span>
              )}
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-charcoal-muted">
              AI-powered virtual hairstyle and hair-colour try-on platform
              tailored for premium hair salons, wig boutiques, and hair
              extension businesses.
            </p>

            <p className="mt-4 text-xs text-charcoal-muted/80">
              {tenant.copy.footerText || "Premium personalized virtual try-on experience."}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:col-span-7">
            {/* Platform Sections */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                Platform
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="/#for-salons"
                    className="text-charcoal-muted transition-colors hover:text-charcoal"
                  >
                    For Salons
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#for-wig-boutiques"
                    className="text-charcoal-muted transition-colors hover:text-charcoal"
                  >
                    For Wig Boutiques
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#how-it-works"
                    className="text-charcoal-muted transition-colors hover:text-charcoal"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#explore-looks"
                    className="text-charcoal-muted transition-colors hover:text-charcoal"
                  >
                    Explore Looks
                  </Link>
                </li>
              </ul>
            </div>

            {/* Experience & Trust */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                Experience & Trust
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href={tryOnHref}
                    className="inline-flex items-center gap-1 font-medium text-charcoal hover:text-champagne transition-colors"
                  >
                    <span>Try the Experience</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-champagne" />
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(true)}
                    className="text-left text-charcoal-muted transition-colors hover:text-charcoal"
                  >
                    Privacy & Photo Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="text-left text-charcoal-muted transition-colors hover:text-charcoal"
                  >
                    Terms of Use
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-charcoal-muted">
          <p>© {currentYear} {tenant.brandName}. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success inline-block" />
            <span>Virtual Try-On Engine Active</span>
          </p>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {privacyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-medium text-charcoal">
            {/* Fixed header */}
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-ivory-dark hover:text-charcoal"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-champagne-light/50 px-3 py-1 text-xs font-semibold text-charcoal">
                <ShieldCheck className="h-3.5 w-3.5 text-champagne" />
                <span>Photo & Privacy Information</span>
              </div>

              <h3 id="privacy-modal-title" className="font-display text-2xl text-charcoal">
                Privacy & Photo Processing
              </h3>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] flex-1 px-6 py-4 space-y-4 text-sm text-charcoal-muted leading-relaxed">

              <div>
                <p className="font-semibold text-charcoal text-xs uppercase tracking-wider mb-1">Photo Processing</p>
                <p>
                  Your photo is sent to our third-party AI provider to generate your virtual hairstyle preview.
                  {tenant.brandName} does not intentionally store your uploaded photo on its own servers after processing.
                  Your photo is held in your browser&apos;s session storage during your visit and is cleared when you close the tab.
                </p>
              </div>

              <div>
                <p className="font-semibold text-charcoal text-xs uppercase tracking-wider mb-1">Third-Party AI Processing</p>
                <p>
                  Image generation is performed by an external AI provider (OpenRouter, routing to Google&apos;s Gemini image model).
                  Your photo is transmitted to that provider, and its own privacy, data-retention and model-training policies apply.
                  Please review the provider&apos;s applicable policies before uploading a personal photo.
                </p>
              </div>

              <div>
                <p className="font-semibold text-charcoal text-xs uppercase tracking-wider mb-1">Model Training</p>
                <p>
                  {tenant.brandName} does not use customer photos to train its own AI models.
                  We cannot make a blanket guarantee about third-party provider training or retention unless the provider&apos;s applicable terms and settings explicitly support that guarantee.
                </p>
              </div>

              <div>
                <p className="font-semibold text-charcoal text-xs uppercase tracking-wider mb-1">Accounts and Sessions</p>
                <p>
                  No customer account is required to use the virtual try-on experience.
                  Session data (including your uploaded photo and generated result) is stored in your browser&apos;s session storage, which is cleared when you close the tab.
                  If you use &quot;Save Look&quot;, the style and shade name (not your photo) are saved in your browser&apos;s local storage.
                </p>
              </div>

              <div className="rounded-lg border border-champagne/30 bg-champagne-light/20 p-3 text-xs text-charcoal">
                <p className="font-semibold mb-1">Important</p>
                <p>
                  This service processes facial images via an external AI provider. By uploading a photo you consent to that processing.
                  If you have questions about data handling, we recommend reviewing the applicable provider policies before proceeding.
                </p>
              </div>
            </div>

            {/* Fixed footer */}
            <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="rounded-md bg-charcoal px-5 py-2.5 text-sm font-medium text-ivory hover:bg-charcoal/90"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Use Modal */}
      {termsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 sm:p-8 text-charcoal shadow-medium">
            <button
              type="button"
              onClick={() => setTermsModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-ivory-dark hover:text-charcoal"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-champagne-light/50 px-3 py-1 text-xs font-semibold text-charcoal">
              <FileText className="h-3.5 w-3.5 text-champagne" />
              <span>Terms of Service</span>
            </div>

            <h3 id="terms-modal-title" className="font-display text-2xl text-charcoal">
              Terms of Use
            </h3>

            <div className="mt-4 space-y-3 text-sm text-charcoal-muted leading-relaxed">
              <p>
                The {tenant.brandName} Virtual Try-On tool provides AI-assisted visual previews of hairstyles and hair colours for consultation and informational purposes.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  Previews are illustrative simulations. Actual salon results may vary based on hair texture, density, existing color base, and natural growth patterns.
                </li>
                <li>
                  Users must have appropriate rights to the portrait photos they upload.
                </li>
                <li>
                  Usage is subject to fair-use rate limiting to prevent automated abuse and preserve service quality.
                </li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="rounded-md bg-charcoal px-5 py-2.5 text-sm font-medium text-ivory hover:bg-charcoal/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
