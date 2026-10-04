"use client";

import Image from "next/image";
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
}

export function ProductCard({
  product,
  selectedShade,
  saved,
  onShop,
  onConsultation,
  onSave,
}: ProductCardProps) {
  const { tenant } = useTenant();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-square w-full shrink-0 bg-ivory-dark sm:w-48">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="192px"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-champagne">
              {product.description}
            </p>
            <h3 className="font-display mt-1 text-xl text-charcoal">
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
                      "rounded-full border px-3 py-1 text-xs",
                      shade === selectedShade
                        ? "border-champagne bg-champagne-light/30 text-charcoal"
                        : "border-border text-charcoal-muted"
                    )}
                  >
                    {shade}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={onShop} className="sm:flex-1">
              Shop This Look
            </Button>
            <Button variant="secondary" onClick={onConsultation} className="sm:flex-1">
              Request Consultation
            </Button>
            <Button
              variant="ghost"
              onClick={onSave}
              className={cn(saved && "text-success")}
            >
              {saved ? "Look saved ✓" : "Save Look"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
