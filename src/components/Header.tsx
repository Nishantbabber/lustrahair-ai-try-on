"use client";

import Link from "next/link";
import Image from "next/image";
import { useTenant } from "@/lib/tenant/context";

export function Header() {
  const { tenant } = useTenant();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-ivory/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl tracking-tight text-charcoal flex items-center gap-2">
          {tenant.logo.path ? (
            <Image
              src={tenant.logo.path}
              alt={tenant.brandName}
              width={tenant.logo.width || 120}
              height={tenant.logo.height || 36}
              className="object-contain max-h-9"
            />
          ) : (
            <span>{tenant.logo.textFallback || tenant.brandName}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-8 sm:flex" aria-label="Main navigation">
          <Link
            href="/try-on"
            className="text-sm text-charcoal-muted transition-colors hover:text-charcoal"
          >
            Try-On
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm text-charcoal-muted transition-colors hover:text-charcoal"
          >
            How It Works
          </Link>
        </nav>

        <Link
          href="/try-on"
          className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-ivory transition-colors hover:bg-charcoal/90"
        >
          {tenant.copy.ctaText || "Try Your Look"}
        </Link>
      </div>
    </header>
  );
}
