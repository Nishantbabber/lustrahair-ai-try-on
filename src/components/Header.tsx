"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useTenant } from "@/lib/tenant/context";

export function Header() {
  const { tenant } = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tryOnHref =
    tenant.id && tenant.id !== "default"
      ? `/try-on?tenant=${encodeURIComponent(tenant.id)}`
      : "/try-on";

  const navLinks = [
    { label: "For Salons", href: "/#for-salons" },
    { label: "For Wig Boutiques", href: "/#for-wig-boutiques" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Explore Looks", href: "/#explore-looks" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-ivory/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 rounded"
          aria-label={`${tenant.brandName} home`}
        >
          {tenant.logo.path ? (
            <Image
              src={tenant.logo.path}
              alt={tenant.brandName}
              width={tenant.logo.width || 130}
              height={tenant.logo.height || 40}
              className="object-contain max-h-10"
              priority
            />
          ) : (
            <span className="font-display text-2xl font-normal tracking-tight text-charcoal transition-colors group-hover:text-charcoal/80">
              {tenant.logo.textFallback || tenant.brandName}
            </span>
          )}
          <span className="hidden sm:inline-block rounded-full bg-champagne-light/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-charcoal-muted">
            B2B Platform
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium tracking-wide text-charcoal-muted transition-colors hover:text-charcoal"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href={tryOnHref}
            className="group inline-flex items-center gap-2 rounded-md bg-charcoal px-5 py-2.5 text-sm font-medium text-ivory shadow-soft transition-all hover:bg-charcoal/90 hover:shadow-medium"
          >
            <span>Try the Experience</span>
            <ArrowUpRight className="h-4 w-4 text-champagne transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-charcoal transition-colors hover:bg-ivory-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-ivory px-4 pb-6 pt-3 shadow-medium md:hidden animate-fade-in">
          <nav className="flex flex-col space-y-3.5" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base font-medium text-charcoal hover:bg-ivory-dark"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border">
              <Link
                href={tryOnHref}
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-charcoal px-5 py-3 text-center text-base font-medium text-ivory shadow-soft transition-all hover:bg-charcoal/90"
              >
                <span>Try the Experience</span>
                <ArrowUpRight className="h-4 w-4 text-champagne" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
