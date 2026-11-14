import type { TenantConfig, TenantCurrency, TenantShade } from "@/types/tenant";
import fs from "fs";
import path from "path";
import { isKnownTenant, isValidTenantIdentifier } from "./constants";

export { isKnownTenant, isValidTenantIdentifier, KNOWN_TENANTS } from "./constants";

export const DEFAULT_CONSENT_CHECKBOX_TEXT =
  "I consent to my photo being processed by AI to generate this preview. My photo is processed in memory, is not stored on our servers, and is not used by us to train any model.";

export const DEFAULT_PER_IP_PER_HOUR = 5;

export const DEFAULT_TENANT_CURRENCY: TenantCurrency = {
  symbol: "$",
  code: "USD",
  locale: "en-US",
};

export const DEFAULT_TENANT_SHADES: TenantShade[] = [
  { id: "natural-black", name: "Natural Black", hex: "#1a1410" },
  { id: "espresso", name: "Espresso", hex: "#3d2314" },
  { id: "chestnut", name: "Chestnut", hex: "#6b3a2a" },
  { id: "honey-blonde", name: "Honey Blonde", hex: "#c9a66b" },
];

function applyTenantDefaults(config: TenantConfig): TenantConfig {
  const currency = config.currency?.code
    ? config.currency
    : DEFAULT_TENANT_CURRENCY;
  const shades =
    Array.isArray(config.shades) && config.shades.length > 0
      ? config.shades
      : DEFAULT_TENANT_SHADES;

  return {
    ...config,
    copy: {
      ...config.copy,
      consentCheckboxText:
        config.copy.consentCheckboxText?.trim() || DEFAULT_CONSENT_CHECKBOX_TEXT,
    },
    currency,
    shades,
    limits: {
      perIpPerHour:
        config.limits?.perIpPerHour && config.limits.perIpPerHour > 0
          ? config.limits.perIpPerHour
          : DEFAULT_PER_IP_PER_HOUR,
    },
  };
}

// Embedded fallback in case of filesystem issues
import defaultTenantJson from "../../../tenants/default.json" with { type: "json" };

const tenantCache = new Map<string, TenantConfig>();

/**
 * Resolves a tenant identifier from a Host header and optional URL query parameters.
 * Requirements:
 * - Strictly validate tenant IDs against the existing tenant allowlist.
 * - Return null for unknown or invalid tenant IDs (do NOT silently fall back to default).
 * - Do NOT interpret *.vercel.app hostnames as tenant IDs.
 */
export function resolveTenantId(
  hostHeader?: string | null,
  searchParams?: URLSearchParams | null
): string | null {
  // 1. Check query param
  if (searchParams && searchParams.has("tenant")) {
    const fromQuery = searchParams.get("tenant")?.toLowerCase().trim();
    if (fromQuery && isValidTenantIdentifier(fromQuery)) {
      return isKnownTenant(fromQuery) ? fromQuery : null;
    }
    return null;
  }

  // 2. Check host / subdomain
  if (hostHeader) {
    const cleanHost = hostHeader.split(":")[0].toLowerCase().trim();

    // Do NOT interpret vercel.app or any *.vercel.app hostnames as tenant IDs
    if (cleanHost === "vercel.app" || cleanHost.endsWith(".vercel.app")) {
      return "default";
    }

    const parts = cleanHost.split(".");

    // e.g. aurasalon.domain.com -> 3 parts, subdomain is aurasalon
    // e.g. aurasalon.localhost -> 2 parts, subdomain is aurasalon
    if (parts.length >= 2) {
      const candidate = parts[0];
      // Exclude common non-tenant prefixes like 'www', 'app', 'localhost', '127'
      if (
        candidate !== "www" &&
        candidate !== "app" &&
        candidate !== "api" &&
        candidate !== "localhost" &&
        candidate !== "127" &&
        isValidTenantIdentifier(candidate)
      ) {
        return isKnownTenant(candidate) ? candidate : null;
      }
    }
  }

  return "default";
}

/**
 * Loads a tenant config from tenants/[id].json.
 * Returns null if tenant is unknown or file not found (no silent fallback).
 */
export function getTenantConfig(tenantId: string): TenantConfig | null {
  if (!isValidTenantIdentifier(tenantId)) {
    return null;
  }

  const safeId = tenantId.toLowerCase().trim();
  if (!isKnownTenant(safeId)) {
    return null;
  }

  if (tenantCache.has(safeId)) {
    return tenantCache.get(safeId)!;
  }

  const tenantsDir = path.join(process.cwd(), "tenants");
  const targetFile = path.join(tenantsDir, `${safeId}.json`);

  try {
    if (fs.existsSync(targetFile)) {
      let raw = fs.readFileSync(targetFile, "utf-8");
      if (raw.charCodeAt(0) === 0xfeff) {
        raw = raw.slice(1);
      }
      const parsed = applyTenantDefaults(JSON.parse(raw) as TenantConfig);
      tenantCache.set(safeId, parsed);
      return parsed;
    }
  } catch (err) {
    console.error(`[TENANT_LOADER] Failed to load tenant "${safeId}":`, err);
  }

  if (safeId === "default") {
    return applyTenantDefaults(defaultTenantJson as unknown as TenantConfig);
  }

  return null;
}

/**
 * Strips internal and sensitive configuration from TenantConfig before passing to client components.
 * Removes:
 * - aiInstruction from styles and shades
 * - monthlyTryOnLimit
 * - limits
 */
export function sanitizeTenantForClient(tenant: TenantConfig): TenantConfig {
  return {
    id: tenant.id,
    brandName: tenant.brandName,
    logo: tenant.logo,
    theme: tenant.theme,
    copy: tenant.copy,
    currency: tenant.currency,
    featureFlags: tenant.featureFlags,
    shades: tenant.shades.map((shade) => ({
      id: shade.id,
      name: shade.name,
      hex: shade.hex,
      category: shade.category,
      order: shade.order,
      // aiInstruction is omitted
    })),
    styles: tenant.styles.map((style) => ({
      id: style.id,
      name: style.name,
      category: style.category,
      length: style.length,
      description: style.description,
      referenceImage: style.referenceImage,
      previewImage: style.previewImage,
      demoResultImage: style.demoResultImage,
      stylistRecommendation: style.stylistRecommendation,
      productId: style.productId,
      productUrlTemplate: style.productUrlTemplate,
      price: style.price,
      shadeIds: style.shadeIds,
      colorOnly: style.colorOnly,
      // aiInstruction is omitted
    })),
    // monthlyTryOnLimit and limits are omitted
  };
}
