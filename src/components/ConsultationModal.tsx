"use client";

import { useEffect, useRef } from "react";
import { X, Calendar, ExternalLink, Scissors } from "lucide-react";
import { Button } from "./Button";
import { useTenant } from "@/lib/tenant/context";
import { isSafeHttpUrl } from "@/lib/tenant/deeplink";

interface ConsultationModalProps {
  styleName: string;
  category: string;
  length?: string;
  shadeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ConsultationModal({
  styleName,
  category,
  length,
  shadeName,
  isOpen,
  onClose,
}: ConsultationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { tenant } = useTenant();

  // If tenant has an appointment/booking link in one of its templates
  const bookingStyle = tenant.styles?.find((s) => s.name === styleName);
  const bookingUrl = bookingStyle?.productUrlTemplate;
  const isBookingConfigured = Boolean(isSafeHttpUrl(bookingUrl) && bookingUrl?.includes("book"));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-xl border border-border bg-surface p-0 shadow-medium backdrop:bg-charcoal/40 open:animate-fade-in text-charcoal"
      aria-labelledby="consultation-modal-title"
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-champagne-light/40 px-3 py-1 text-xs font-semibold text-charcoal">
            <Scissors className="h-3.5 w-3.5 text-champagne" />
            <span>Stylist Consultation Guide</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-charcoal-muted hover:bg-ivory-dark hover:text-charcoal transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 id="consultation-modal-title" className="font-display mt-4 text-2xl text-charcoal">
          Stylist Consultation at {tenant.brandName}
        </h2>

        <p className="mt-3 text-sm text-charcoal-muted leading-relaxed">
          Your virtual try-on preview is an ideal reference point for in-chair consultations with your stylist or wig specialist.
        </p>

        {/* Selected Look Summary */}
        <div className="mt-5 rounded-lg border border-border bg-ivory-dark/60 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-charcoal">Selected Style:</span>
            <span>{styleName} ({category}{length ? ` · ${length}` : ""})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-charcoal">Selected Shade:</span>
            <span>{shadeName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-charcoal">Salon / Boutique:</span>
            <span>{tenant.brandName}</span>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-xs text-charcoal-muted">
          <p className="flex items-start gap-1.5">
            <span className="text-champagne font-bold">1.</span>
            <span>Save or download your preview using the <strong>&ldquo;Save Look&rdquo;</strong> button.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="text-champagne font-bold">2.</span>
            <span>Present your preview during your consultation so your stylist can match cut, length, and undertones.</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {isBookingConfigured && bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors bg-charcoal text-ivory hover:bg-charcoal/90 px-5 py-2.5 text-sm w-full shadow-soft"
            >
              <Calendar className="h-4 w-4 text-champagne" />
              <span>Book Appointment with {tenant.brandName}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <Button variant={isBookingConfigured ? "secondary" : "primary"} fullWidth onClick={onClose}>
            Back to Result
          </Button>
        </div>
      </div>
    </dialog>
  );
}
