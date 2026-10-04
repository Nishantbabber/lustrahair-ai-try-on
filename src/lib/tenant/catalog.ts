import type { TenantConfig, TenantCurrency, TenantShade, TenantStyle } from "@/types/tenant";
import type { HairColor } from "@/types/tryon";

export function resolveShadesForStyle(
  tenant: TenantConfig,
  style?: TenantStyle | null
): TenantShade[] {
  const catalog = tenant.shades ?? [];
  if (!style?.shadeIds || style.shadeIds.length === 0) {
    return catalog;
  }
  const allowed = new Set(style.shadeIds);
  return catalog.filter((shade) => allowed.has(shade.id));
}

export function isShadePickerHidden(style?: TenantStyle | null): boolean {
  return Boolean(style?.colorOnly) || (style?.shadeIds?.length === 1);
}

export function shadeToHairColor(shade: TenantShade): HairColor {
  return { id: shade.id, name: shade.name, hex: shade.hex };
}

export function formatTenantPrice(amount: number, currency: TenantCurrency): string {
  try {
    return new Intl.NumberFormat(currency.locale || "en-US", {
      style: "currency",
      currency: currency.code || "USD",
    }).format(amount);
  } catch {
    return `${currency.symbol ?? "$"}${amount}`;
  }
}
