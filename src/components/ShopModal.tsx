"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import type { Product } from "@/types/tryon";
import { Button } from "./Button";

interface ShopModalProps {
  product: Product;
  selectedShade: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShopModal({ product, selectedShade, isOpen, onClose }: ShopModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
      className="fixed inset-0 z-50 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-lg border border-border bg-surface p-0 shadow-medium backdrop:bg-charcoal/40 open:animate-fade-in"
      aria-labelledby="shop-modal-title"
    >
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/70 text-ivory hover:bg-charcoal"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative aspect-[4/3] bg-ivory-dark">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="p-6">
          <p className="text-xs uppercase tracking-wider text-champagne">
            {product.description}
          </p>
          <h2 id="shop-modal-title" className="font-display mt-1 text-2xl text-charcoal">
            {product.name}
          </h2>
          <p className="mt-2 text-xl font-medium text-charcoal">
            {product.currency}
            {product.price.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-sm text-charcoal-muted">
            Shade: <span className="font-medium text-charcoal">{selectedShade}</span>
          </p>

          <p className="mt-4 text-sm text-charcoal-muted">
            This is a preview experience. In production, this would connect to
            your cart and checkout flow.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Button fullWidth onClick={onClose}>
              Continue Exploring
            </Button>
            <Button variant="secondary" fullWidth onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
