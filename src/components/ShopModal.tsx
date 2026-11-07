"use client";

import { useEffect, useRef } from "react";
import { X, ExternalLink, AlertCircle, ShoppingBag } from "lucide-react";
import Image from "next/image";
import type { Product } from "@/types/tryon";
import { Button } from "./Button";
import { useTenant } from "@/lib/tenant/context";
import { formatTenantPrice } from "@/lib/tenant/catalog";
import { isSafeHttpUrl } from "@/lib/tenant/deeplink";

interface ShopModalProps {
  product: Product;
  selectedShade: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShopModal({ product, selectedShade, isOpen, onClose }: ShopModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { tenant, getShopUrl } = useTenant();

  const shopUrl = getShopUrl(product.lookId, selectedShade);
  const hasValidShopUrl = isSafeHttpUrl(shopUrl);

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
      className="fixed inset-0 z-50 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-border bg-surface p-0 shadow-medium backdrop:bg-charcoal/40 open:animate-fade-in"
      aria-labelledby="shop-modal-title"
    >
      {/* Scrollable content wrapper — allows the modal body to scroll while the dialog frame stays fixed */}
      <div className="flex flex-col max-h-[90vh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {/* Product image — fixed aspect ratio, shrinks on small screens */}
        <div className="relative aspect-[4/3] w-full shrink-0 bg-ivory-dark">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
          {/* Close button overlaid on image for easy access */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/70 text-ivory hover:bg-charcoal transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body content */}
        <div className="p-6 flex-1">
          <p className="text-xs uppercase tracking-wider text-champagne font-medium">
            {product.description}
          </p>
          <h2 id="shop-modal-title" className="font-display mt-1 text-2xl text-charcoal">
            {product.name}
          </h2>
          <p className="mt-2 text-xl font-medium text-charcoal">
            {formatTenantPrice(product.price, tenant.currency)}
          </p>
          <p className="mt-1 text-sm text-charcoal-muted">
            Shade: <span className="font-medium text-charcoal">{selectedShade}</span>
          </p>

          {hasValidShopUrl ? (
            <>
              <p className="mt-4 text-sm text-charcoal-muted leading-relaxed">
                Ready to make it yours? Continue directly to {tenant.brandName}&apos;s checkout with your selected style and shade pre-selected.
              </p>
              <p className="mt-2 text-xs text-charcoal-muted/70">
                You will be taken to {tenant.brandName}&apos;s official store/booking checkout to complete your transaction.
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors bg-charcoal text-ivory hover:bg-charcoal/90 px-6 py-3 text-base w-full shadow-soft"
                >
                  <ShoppingBag className="h-4 w-4 text-champagne" />
                  <span>Purchase on {tenant.brandName}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Button variant="secondary" fullWidth onClick={onClose}>
                  Continue Browsing
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-lg border border-border bg-ivory-dark/60 p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-champagne shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    Online checkout not configured
                  </p>
                  <p className="mt-1 text-xs text-charcoal-muted leading-relaxed">
                    Direct online ordering for this look is currently managed offline by {tenant.brandName}. Please contact the store directly or visit their salon or boutique to place an order or schedule an appointment.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <Button variant="secondary" fullWidth onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
