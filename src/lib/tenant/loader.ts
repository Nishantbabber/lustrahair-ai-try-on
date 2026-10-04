import type { TenantConfig, TenantCurrency, TenantShade } from "@/types/tenant";
import fs from "fs";
import path from "path";

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
import defaultTenantJson from "../../../tenants/default.json";

const tenantCache = new Map<string, TenantConfig>();

/**
 * Resolves a tenant identifier from a Host header and optional URL query parameters.
 * Priority:
 * 1. Explicit query parameter (?tenant=brand-a)
 * 2. Subdomain (e.g. brand-a.localhost:3000 or brand-a.domain.com)
 * 3. Default fallback ("default")
 */
export function resolveTenantId(
  hostHeader?: string | null,
  searchParams?: URLSearchParams | null
): string {
  // 1. Check query param
  if (searchParams) {
    const fromQuery = searchParams.get("tenant")?.toLowerCase().trim();
    if (fromQuery && isValidTenantIdentifier(fromQuery)) {
      return fromQuery;
    }
  }

  // 2. Check host / subdomain
  if (hostHeader) {
    const cleanHost = hostHeader.split(":")[0].toLowerCase().trim();
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
        return candidate;
      }
    }
  }

  return "default";
}

function isValidTenantIdentifier(id: string): boolean {
  return /^[a-z0-9_-]+$/i.test(id);
}

/**
 * Loads a tenant config from tenants/[id].json.
 * Falls back to tenants/default.json if tenant config file does not exist.
 */
export function getTenantConfig(tenantId: string = "default"): TenantConfig {
  const safeId = isValidTenantIdentifier(tenantId) ? tenantId.toLowerCase() : "default";

  if (tenantCache.has(safeId)) {
    return tenantCache.get(safeId)!;
  }

  const tenantsDir = path.join(process.cwd(), "tenants");
  const targetFile = path.join(tenantsDir, `${safeId}.json`);

  try {
    if (fs.existsSync(targetFile)) {
      const raw = fs.readFileSync(targetFile, "utf-8");
      const parsed = applyTenantDefaults(JSON.parse(raw) as TenantConfig);
      tenantCache.set(safeId, parsed);
      return parsed;
    }
  } catch (err) {
    console.error(`[TENANT_LOADER] Failed to load tenant "${safeId}":`, err);
  }

  // Fallback to default
  if (safeId !== "default") {
    return getTenantConfig("default");
  }

  // Absolute fallback to imported json
  return applyTenantDefaults(defaultTenantJson as unknown as TenantConfig);
}
