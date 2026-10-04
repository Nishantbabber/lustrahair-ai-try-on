export type LayoutPreset = "luxury" | "modern" | "editorial";

export interface TenantTheme {
  primaryColor: string; // e.g. "#c4a574"
  primaryColorLight?: string; // e.g. "#e8dcc8"
  backgroundColor: string; // e.g. "#faf8f5"
  backgroundColorDark?: string; // e.g. "#f3efe8"
  textColor?: string; // e.g. "#1a1816"
  surfaceColor?: string; // e.g. "#ffffff"
  font: string; // e.g. '"Georgia", "Times New Roman", serif'
  borderRadius: string; // e.g. "8px"
  layout: LayoutPreset;
}

export interface TenantCopy {
  headline: string;
  subheadline?: string;
  ctaText: string;
  consentText: string;
  /** Affirmative opt-in label shown next to the consent checkbox. */
  consentCheckboxText?: string;
  footerText?: string;
  tryOnHeadline?: string;
  resultHeadline?: string;
}

export interface TenantLimits {
  /** Max try-on requests per client IP per rolling hour. Defaults to 5. */
  perIpPerHour?: number;
}

export interface TenantShade {
  id: string;
  name: string;
  hex: string;
}

export interface TenantCurrency {
  symbol: string;
  code: string;
  locale: string;
}

export interface TenantStyle {
  id: string;
  name: string;
  category: string;
  length: string;
  description: string;
  referenceImage: string; // Thumbnail customers pick from
  previewImage?: string; // Backwards compatible alias
  demoResultImage: string;
  aiInstruction: string;
  stylistRecommendation: string;
  productId: string;
  productUrlTemplate: string;
  price: number;
  /**
   * Optional subset of tenant shade IDs. Omit to offer the full tenant palette.
   * A single ID (or colorOnly) restricts this style without duplicating shade objects.
   */
  shadeIds?: string[];
  /**
   * Color-only treatments (e.g. gloss, espresso finish). When true, the shade
   * picker is hidden and generation uses this style's aiInstruction for color.
   */
  colorOnly?: boolean;
}

export interface TenantFeatureFlags {
  emailCapture: boolean;
  shareButton: boolean;
}

export interface TenantConfig {
  id: string;
  brandName: string;
  logo: {
    path?: string;
    textFallback?: string;
    width?: number;
    height?: number;
  };
  theme: TenantTheme;
  copy: TenantCopy;
  shades: TenantShade[];
  currency: TenantCurrency;
  styles: TenantStyle[];
  featureFlags: TenantFeatureFlags;
  monthlyTryOnLimit: number;
  limits?: TenantLimits;
}
