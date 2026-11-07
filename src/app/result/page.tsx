"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, RefreshCw, Download, SlidersHorizontal, Sparkles, Scissors, Palette } from "lucide-react";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { ProductCard } from "@/components/ProductCard";
import { ShopModal } from "@/components/ShopModal";
import { ConsultationModal } from "@/components/ConsultationModal";
import { Button } from "@/components/Button";
import { getLookById as getStaticLookById, getProductByLookId } from "@/data/looks";
import { type Product, type Look, type TransformationMode } from "@/types/tryon";
import { getSession, saveSession, hasValidResult } from "@/lib/session";
import type { TryOnSession } from "@/types/tryon";
import { useTenant } from "@/lib/tenant/context";
import { resolveShadesForStyle } from "@/lib/tenant/catalog";

interface SavedLookRecord {
  id: string;
  mode?: TransformationMode;
  lookId?: string;
  lookName?: string;
  shadeId?: string;
  shadeName?: string;
  tenantId: string;
  savedAt: string;
}

export default function ResultPage() {
  const { tenant, getStyleById } = useTenant();
  const [session, setSession] = useState<TryOnSession | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // In-page try another look & generation limit state
  const [tryAnotherOpen, setTryAnotherOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TransformationMode>("both");
  const [newSelectedLookId, setNewSelectedLookId] = useState<string>("");
  const [newSelectedColorId, setNewSelectedColorId] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [limitError, setLimitError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    const stored = getSession();
    setSession(stored);
    setModalMode(stored.mode || "both");
    setNewSelectedLookId(stored.selectedLookId);
    setNewSelectedColorId(stored.selectedColorId);
  }, []);

  const mode: TransformationMode = session?.mode || "both";
  const isStyleMode = mode === "style";
  const isColorMode = mode === "color";
  const isBothMode = mode === "both";

  // Look resolution: check tenant catalog first, fallback to static catalog
  const tenantStyle = session && session.selectedLookId ? getStyleById(session.selectedLookId) : undefined;
  const staticLook = session && session.selectedLookId ? getStaticLookById(session.selectedLookId) : undefined;

  const look: Look | undefined = useMemo(() => {
    if (isColorMode) return undefined;
    return tenantStyle
      ? {
          id: tenantStyle.id,
          name: tenantStyle.name,
          category: tenantStyle.category,
          length: tenantStyle.length,
          description: tenantStyle.description,
          previewImage: tenantStyle.referenceImage || tenantStyle.previewImage || "",
          demoResultImage: tenantStyle.demoResultImage,
          aiInstruction: tenantStyle.aiInstruction,
          stylistRecommendation: tenantStyle.stylistRecommendation,
          productId: tenantStyle.productId,
          colorOnly: tenantStyle.colorOnly,
        }
      : staticLook;
  }, [tenantStyle, staticLook, isColorMode]);

  // Color resolution
  const color = useMemo(() => {
    if (isStyleMode || !session) return undefined;
    const allowed = tenantStyle ? resolveShadesForStyle(tenant, tenantStyle) : tenant.shades;
    return allowed.find((c) => c.id === session.selectedColorId) ||
      tenant.shades.find((c) => c.id === session.selectedColorId);
  }, [session, tenant, tenantStyle, isStyleMode]);

  // Product resolution
  const product: Product | undefined = useMemo(() => {
    if (isColorMode) {
      // In color-only mode, create a colour-treatment product if not linked to a specific hairstyle
      return {
        id: `color-${color?.id || "custom"}`,
        name: `${tenant.brandName} ${color?.name || "Salon Gloss"} Colour Treatment`,
        description: `Professional salon colour gloss and tone in ${color?.name || "custom shade"}.`,
        price: 120,
        currency: tenant.currency.symbol,
        shades: tenant.shades.map((s) => s.name),
        image: tenant.styles?.[0]?.referenceImage || "/images/hero/lustrahair-after.jpg",
        lookId: "color-service",
      };
    }

    if (tenantStyle) {
      return {
        id: tenantStyle.productId || `product-${tenantStyle.id}`,
        name: `${tenant.brandName} ${tenantStyle.name}`,
        description: tenantStyle.description || `${tenant.brandName} Signature Style`,
        price: tenantStyle.price,
        currency: tenant.currency.symbol,
        shades: resolveShadesForStyle(tenant, tenantStyle).map((s) => s.name),
        image: tenantStyle.referenceImage || tenantStyle.previewImage || "",
        lookId: tenantStyle.id,
      };
    }

    return session?.selectedLookId ? getProductByLookId(session.selectedLookId) : undefined;
  }, [tenantStyle, tenant, session, isColorMode, color]);

  // Save look handler: persists metadata in localStorage and triggers device download
  const handleSave = useCallback(() => {
    if (!session) return;

    // 1. Persist session state
    const updated = saveSession({ saved: true });
    setSession(updated);

    // 2. Persist to anonymous client-side localStorage history
    try {
      const storageKey = "lustra_saved_looks";
      const existing: SavedLookRecord[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const record: SavedLookRecord = {
        id: `${session.selectedLookId || "color"}-${session.selectedColorId || "style"}-${Date.now()}`,
        mode,
        lookId: look?.id,
        lookName: look?.name,
        shadeId: color?.id,
        shadeName: color?.name,
        tenantId: tenant.id,
        savedAt: new Date().toISOString(),
      };
      // Keep up to 20 recent saved looks
      const filtered = existing.filter(
        (item) => !(item.lookId === record.lookId && item.shadeId === record.shadeId && item.mode === record.mode)
      );
      localStorage.setItem(storageKey, JSON.stringify([record, ...filtered].slice(0, 20)));
    } catch {
      // Local storage quota or security error ignored
    }

    setSaveNotice("Look saved to your device history ✓");
    setTimeout(() => setSaveNotice(null), 4000);
  }, [session, look, color, tenant.id, mode]);

  // Direct download of the generated result image
  const handleDownload = useCallback(() => {
    if (!session?.resultImage) return;
    try {
      const link = document.createElement("a");
      link.href = session.resultImage;
      const safeTenant = tenant.brandName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const safeLook = look ? look.name.toLowerCase().replace(/[^a-z0-9]/g, "-") : "original-haircut";
      const safeColor = color ? color.name.toLowerCase().replace(/[^a-z0-9]/g, "-") : "original-shade";
      link.download = `${safeTenant}-${safeLook}-${safeColor}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Fallback
    }
  }, [session?.resultImage, look, color, tenant.brandName]);

  // Attempt generation of another look directly from ResultPage without destroying current result!
  const handleGenerateAnother = async () => {
    if (!session?.originalImage) return;

    const requireStyle = modalMode === "style" || modalMode === "both";
    const requireColor = modalMode === "color" || modalMode === "both";

    if (requireStyle && !newSelectedLookId) return;
    if (requireColor && !newSelectedColorId) return;

    setIsRegenerating(true);
    setLimitError(null);

    try {
      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenant.id,
        },
        body: JSON.stringify({
          originalImage: session.originalImage,
          mode: modalMode,
          lookId: requireStyle ? newSelectedLookId : undefined,
          colorId: requireColor ? newSelectedColorId : undefined,
          consentGiven: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.resultImage) {
        setLimitError({
          code: data.code || (response.status === 429 ? "RATE_LIMIT_EXCEEDED" : "SERVER_ERROR"),
          message: data.error || data.details || "Generation limit reached for this session.",
        });
        return;
      }

      // Success: update resultImage and close modal
      const updated = saveSession({
        resultImage: data.resultImage,
        provider: data.provider,
        mode: modalMode,
        ...(requireStyle ? { selectedLookId: newSelectedLookId } : {}),
        ...(requireColor ? { selectedColorId: newSelectedColorId } : {}),
        saved: false,
      });
      setSession(updated);
      setTryAnotherOpen(false);
    } catch (err) {
      setLimitError({
        code: "SERVER_ERROR",
        message: err instanceof Error ? err.message : "Network error. Please try again.",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!session || !hasValidResult(session)) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display mb-4 text-3xl text-charcoal">
          No preview found
        </h1>
        <p className="mb-8 text-charcoal-muted leading-relaxed">
          Your try-on session may have expired. Start a new try-on to see your
          personalized preview.
        </p>
        <Link href="/try-on">
          <Button size="lg">Start a New Try-On</Button>
        </Link>
      </div>
    );
  }

  const styles = tenant.styles || [];
  const selectedStyleForModal = styles.find((s) => s.id === newSelectedLookId) || styles[0];
  const shadesForModal =
    modalMode === "color"
      ? tenant.shades || []
      : resolveShadesForStyle(tenant, selectedStyleForModal);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Limit Error Banner (stays on page, never redirects!) */}
      {limitError && (
        <div className="mb-8 rounded-xl border border-champagne bg-champagne-light/30 p-5 shadow-medium animate-fade-in text-charcoal">
          <div className="flex items-start gap-3">
            <Clock className="h-6 w-6 text-champagne shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display text-lg font-bold text-charcoal">
                Try-On Limit Reached
              </h2>
              <p className="mt-1 text-sm text-charcoal-muted leading-relaxed">
                {limitError.message}
              </p>
              <p className="mt-2 text-xs text-charcoal-muted/80">
                Your previous generated look is preserved below. No additional previews can be created during this session.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button size="sm" onClick={() => setLimitError(null)}>
                  Go Back to Current Result
                </Button>
                <Link href="/try-on">
                  <Button variant="ghost" size="sm" className="text-charcoal-muted hover:text-charcoal">
                    Start Again
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Header */}
      <div className="animate-fade-in mb-10 text-center">
        <h1 className="font-display mb-3 text-3xl text-charcoal sm:text-4xl">
          {tenant.copy.resultHeadline || "Meet your new look."}
        </h1>
        <p className="text-charcoal-muted">
          See how your selected {tenant.brandName} transformation looks on you.
        </p>
      </div>

      {/* Before / After Slider */}
      <div className="animate-fade-in mb-10">
        <BeforeAfterSlider
          beforeImage={session.originalImage!}
          afterImage={session.resultImage!}
        />
      </div>

      {/* Transformation Mode Badge & Result Details */}
      <div className="animate-fade-in mb-10 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-6">
        {/* Mode pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-champagne/50 bg-champagne-light/30 px-3.5 py-1 text-xs font-semibold text-charcoal">
          {isStyleMode && <Scissors className="h-3.5 w-3.5 text-champagne" />}
          {isColorMode && <Palette className="h-3.5 w-3.5 text-champagne" />}
          {isBothMode && <Sparkles className="h-3.5 w-3.5 text-champagne" />}
          <span>
            {isStyleMode && "Hairstyle Transformation"}
            {isColorMode && "Colour Transformation"}
            {isBothMode && "Hairstyle + Colour Transformation"}
          </span>
        </div>

        {/* Selected style if applicable */}
        {(isStyleMode || isBothMode) && look && (
          <div>
            <p className="text-xs uppercase tracking-wider text-charcoal-muted">
              Selected style
            </p>
            <p className="font-display text-xl text-charcoal">{look.name}</p>
            <p className="text-sm text-charcoal-muted">
              {look.category} {look.length ? `· ${look.length}` : ""}
            </p>
          </div>
        )}

        {(isStyleMode && !isColorMode) && (
          <div>
            <p className="text-xs uppercase tracking-wider text-charcoal-muted">
              Hair colour
            </p>
            <p className="font-display text-base text-charcoal italic">Preserved Original</p>
          </div>
        )}

        {/* Divider */}
        <div className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />

        {/* Selected shade if applicable */}
        {(isColorMode || isBothMode) && color && (
          <div>
            <p className="text-xs uppercase tracking-wider text-charcoal-muted">
              Selected shade
            </p>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span
                className="h-3.5 w-3.5 rounded-full border border-border shrink-0"
                style={{ backgroundColor: color.hex }}
                aria-hidden="true"
              />
              <p className="font-display text-xl text-charcoal">{color.name}</p>
            </div>
          </div>
        )}

        {isColorMode && (
          <div>
            <p className="text-xs uppercase tracking-wider text-charcoal-muted">
              Hairstyle
            </p>
            <p className="font-display text-base text-charcoal italic">Preserved Original Cut</p>
          </div>
        )}
      </div>

      {/* Stylist recommendation note if available */}
      {look?.stylistRecommendation && (
        <div className="animate-fade-in mb-10 rounded-xl border border-border bg-surface p-6 shadow-soft">
          <p className="mb-2 text-xs uppercase tracking-wider text-champagne font-medium">
            {tenant.brandName} Stylist Note
          </p>
          <p className="font-display text-lg text-charcoal">
            &ldquo;{look.stylistRecommendation}&rdquo;
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setTryAnotherOpen(true)}>
              <SlidersHorizontal className="h-3.5 w-3.5 text-champagne mr-1.5" />
              <span>Try Another Style or Shade</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5 text-charcoal-muted mr-1.5" />
              <span>Download Image</span>
            </Button>
          </div>
        </div>
      )}

      {/* Product Card */}
      {product && (
        <div className="animate-fade-in mb-10">
          <ProductCard
            product={product}
            selectedShade={color?.name || (look ? "Natural Base" : "Salon Gloss")}
            saved={session.saved}
            onShop={() => setShopOpen(true)}
            onConsultation={() => setConsultationOpen(true)}
            onSave={handleSave}
            onDownload={handleDownload}
          />
          {saveNotice && (
            <p className="mt-3 text-center text-xs font-medium text-success animate-fade-in">
              {saveNotice}
            </p>
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="text-center">
        <Button variant="secondary" size="lg" onClick={() => setTryAnotherOpen(true)}>
          Try Another Transformation
        </Button>
      </div>

      {/* Shop Modal with safe URL validation */}
      {product && (
        <ShopModal
          product={product}
          selectedShade={color?.name || "Natural Base"}
          isOpen={shopOpen}
          onClose={() => setShopOpen(false)}
        />
      )}

      {/* Consultation Modal */}
      <ConsultationModal
        styleName={look?.name || "Custom Salon Haircut"}
        category={look?.category || "Salon Service"}
        length={look?.length}
        shadeName={color?.name || "Natural Base"}
        isOpen={consultationOpen}
        onClose={() => setConsultationOpen(false)}
      />

      {/* Try Another Style Modal */}
      {tryAnotherOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="try-another-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 sm:p-8 text-charcoal shadow-medium max-h-[90vh] overflow-y-auto">
            <h2 id="try-another-modal-title" className="font-display text-2xl text-charcoal">
              Explore Another Transformation
            </h2>
            <p className="mt-1 text-sm text-charcoal-muted">
              Choose your mode, hairstyle, or hair colour to preview on your photo.
            </p>

            {/* Mode selection buttons */}
            <div className="mt-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-muted mb-2">
                Transformation Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "style" as const, label: "Hairstyle" },
                  { id: "color" as const, label: "Colour" },
                  { id: "both" as const, label: "Both" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModalMode(item.id)}
                    className={`rounded-lg border py-2 px-2 text-xs font-medium text-center transition-all ${
                      modalMode === item.id
                        ? "border-champagne bg-champagne-light/35 font-semibold text-charcoal"
                        : "border-border bg-surface text-charcoal-muted hover:border-border-strong"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector if mode requires it */}
            {(modalMode === "style" || modalMode === "both") && (
              <div className="mt-4">
                <label htmlFor="style-select-modal" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-muted mb-2">
                  Choose Hairstyle
                </label>
                <select
                  id="style-select-modal"
                  value={newSelectedLookId}
                  onChange={(e) => {
                    const styleId = e.target.value;
                    setNewSelectedLookId(styleId);
                    const st = styles.find((s) => s.id === styleId);
                    const sh = resolveShadesForStyle(tenant, st);
                    if (sh.length > 0) setNewSelectedColorId(sh[0].id);
                  }}
                  className="w-full rounded-md border border-border bg-surface p-2.5 text-sm text-charcoal focus:border-champagne focus:outline-none"
                >
                  {styles.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Shade Selector if mode requires it */}
            {(modalMode === "color" || modalMode === "both") && shadesForModal.length > 0 && (
              <div className="mt-4">
                <label htmlFor="shade-select-modal" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-muted mb-2">
                  Choose Hair Colour
                </label>
                <select
                  id="shade-select-modal"
                  value={newSelectedColorId}
                  onChange={(e) => setNewSelectedColorId(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface p-2.5 text-sm text-charcoal focus:border-champagne focus:outline-none"
                >
                  {shadesForModal.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {limitError && (
              <div className="mt-4 rounded-md border border-champagne bg-champagne-light/30 p-3 text-xs text-charcoal">
                <p className="font-semibold">{limitError.message}</p>
                <p className="mt-1 text-charcoal-muted">Hourly network limit reached. Your current result is preserved.</p>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                fullWidth
                disabled={isRegenerating}
                onClick={handleGenerateAnother}
                className="flex items-center justify-center gap-2"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-champagne" />
                    <span>Rendering Look...</span>
                  </>
                ) : (
                  <span>Generate New Look</span>
                )}
              </Button>
              <Button
                variant="secondary"
                disabled={isRegenerating}
                onClick={() => {
                  setTryAnotherOpen(false);
                  setLimitError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
