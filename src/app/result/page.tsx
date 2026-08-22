"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { ProductCard } from "@/components/ProductCard";
import { ShopModal } from "@/components/ShopModal";
import { Button } from "@/components/Button";
import { getLookById, getProductByLookId } from "@/data/looks";
import { HAIR_COLORS } from "@/types/tryon";
import { getSession, saveSession, hasValidResult } from "@/lib/session";
import type { TryOnSession } from "@/types/tryon";

export default function ResultPage() {
  const router = useRouter();
  const [session, setSession] = useState<TryOnSession | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [consultationSent, setConsultationSent] = useState(false);

  useEffect(() => {
    const stored = getSession();
    setSession(stored);

    if (!hasValidResult(stored)) {
      // Graceful — will show empty state
    }
  }, []);

  const look = session ? getLookById(session.selectedLookId) : undefined;
  const product = session ? getProductByLookId(session.selectedLookId) : undefined;
  const color = session
    ? HAIR_COLORS.find((c) => c.id === session.selectedColorId)
    : undefined;

  const handleSave = useCallback(() => {
    const updated = saveSession({ saved: true });
    setSession(updated);
  }, []);

  const handleTryAnother = useCallback(() => {
    saveSession({ resultImage: null, saved: false, provider: null });
    router.push("/try-on");
  }, [router]);

  if (!session || !hasValidResult(session) || !look || !product || !color) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display mb-4 text-3xl text-charcoal">
          No preview found
        </h1>
        <p className="mb-8 text-charcoal-muted">
          Your try-on session may have expired. Start a new try-on to see your
          personalized preview.
        </p>
        <Link href="/try-on">
          <Button size="lg">Start a New Try-On</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="animate-fade-in mb-10 text-center">
        <h1 className="font-display mb-3 text-3xl text-charcoal sm:text-4xl">
          Meet your new look.
        </h1>
        <p className="text-charcoal-muted">
          See how your selected LustraHair style could look on you.
        </p>
      </div>

      {/* Before / After */}
      <div className="animate-fade-in mb-10">
        <BeforeAfterSlider
          beforeImage={session.originalImage!}
          afterImage={session.resultImage!}
        />
      </div>

      {/* Result details */}
      <div className="animate-fade-in mb-10 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-charcoal-muted">
            Selected style
          </p>
          <p className="font-display text-xl text-charcoal">{look.name}</p>
          <p className="text-sm text-charcoal-muted">
            {look.category} · {look.length}
          </p>
        </div>
        <div className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />
        <div>
          <p className="text-xs uppercase tracking-wider text-charcoal-muted">
            Selected shade
          </p>
          <p className="font-display text-xl text-charcoal">{color.name}</p>
        </div>
        <span className="rounded-full border border-champagne/40 bg-champagne-light/20 px-3 py-1 text-xs font-medium text-champagne">
          AI Preview
        </span>
      </div>

      {/* Stylist section */}
      <div className="animate-fade-in mb-10 rounded-lg border border-border bg-surface p-6 shadow-soft">
        <p className="mb-2 text-xs uppercase tracking-wider text-champagne">
          Lustra Stylist says
        </p>
        <p className="font-display text-lg text-charcoal">
          &ldquo;{look.stylistRecommendation}&rdquo;
        </p>
        <div className="mt-4">
          <Button variant="ghost" onClick={handleTryAnother}>
            Explore another look
          </Button>
        </div>
      </div>

      {/* Product */}
      <div className="animate-fade-in mb-10">
        <ProductCard
          product={product}
          selectedShade={color.name}
          saved={session.saved}
          onShop={() => setShopOpen(true)}
          onConsultation={() => setConsultationSent(true)}
          onSave={handleSave}
        />
        {consultationSent && (
          <p className="mt-3 text-center text-sm text-success">
            Consultation request noted. Our team will reach out shortly.
          </p>
        )}
      </div>

      <div className="text-center">
        <Button variant="secondary" size="lg" onClick={handleTryAnother}>
          Try Another Look
        </Button>
      </div>

      <ShopModal
        product={product}
        selectedShade={color.name}
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
      />
    </div>
  );
}
