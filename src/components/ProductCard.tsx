"use client";

import Image from "next/image";
import { Download, ShoppingBag, Scissors } from "lucide-react";
import type { Product } from "@/types/tryon";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant/context";
import { formatTenantPrice } from "@/lib/tenant/catalog";

interface ProductCardProps {
  product: Product;
  selectedShade: string;
  saved: boolean;
  onShop: () => void;
  onConsultation: () => void;
  onSave: () => void;
  onDownload?: () => void;
}

export function ProductCard({
  product,
  selectedShade,
  saved,
  onShop,
  onConsultation,
  onSave,
  onDownload,
}: ProductCardProps) {
  const { tenant } = useTenant();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-square w-full shrink-0 bg-ivory-dark sm:w-52">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 208px"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-champagne font-medium">
              {product.description}
            </p>
            <h3 className="font-display mt-1 text-xl sm:text-2xl text-charcoal">
              {product.name}
            </h3>
            <p className="mt-2 text-2xl font-medium text-charcoal">
              {formatTenantPrice(product.price, tenant.currency)}
            </p>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-charcoal-muted">
                Available shades
              </p>
              <div className="flex flex-wrap gap-2">
                {product.shades.map((shade) => (
                  <span
                    key={shade}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      shade === selectedShade
                        ? "border-champagne bg-champagne-light/35 font-medium text-charcoal"
                        : "border-border text-charcoal-muted"
                    )}
                  >
                    {shade}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Button onClick={onShop} className="sm:flex-1 flex items-center justify-center gap-2">
              <ShoppingBag className="h-4 w-4 text-champagne" />
              <span>Buy This Look</span>
            </Button>

            <Button variant="secondary" onClick={onConsultation} className="sm:flex-1 flex items-center justify-center gap-2">
              <Scissors className="h-4 w-4 text-champagne" />
              <span>Consultation Info</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={onSave}
                className={cn(
                  "transition-colors",
                  saved ? "text-success font-medium" : "text-charcoal-muted"
                )}
              >
                {saved ? "Look saved ✓" : "Save Look"}
              </Button>

              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  title="Download AI preview to device"
                  className="inline-flex items-center justify-center p-2.5 rounded-md border border-border text-charcoal-muted hover:text-charcoal hover:bg-ivory-dark transition-colors"
                  aria-label="Download generated hairstyle image to your device"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
