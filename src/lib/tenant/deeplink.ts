export interface DeepLinkParams {
  styleId: string;
  styleName?: string;
  shade?: string;
  tenantId: string;
  extraParams?: Record<string, string>;
}

/**
 * Validates that an external URL has a safe http or https protocol.
 */
export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Builds an outbound trackable shopping/booking URL for a style.
 * Resolves template variables like {styleId}, {shade}, and {tenantId},
 * and guarantees UTM parameters are present for conversion attribution.
 *
 * If template is empty or invalid, returns empty string rather than an invented destination.
 */
export function buildShopUrl(template: string | undefined | null, params: DeepLinkParams): string {
  if (!template || !template.trim()) {
    return "";
  }

  const encodedStyleId = encodeURIComponent(params.styleId);
  const encodedStyleName = encodeURIComponent(params.styleName || params.styleId);
  const encodedShade = encodeURIComponent(params.shade || "");
  const encodedTenantId = encodeURIComponent(params.tenantId);

  const urlString = template
    .replace(/{styleId}/g, encodedStyleId)
    .replace(/{styleName}/g, encodedStyleName)
    .replace(/{shade}/g, encodedShade)
    .replace(/{tenantId}/g, encodedTenantId);

  try {
    const url = new URL(urlString);

    // Only allow http: and https: protocols
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    // Ensure standard UTM tags are present if not already in template
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", "hair_tryon");
    }
    if (!url.searchParams.has("utm_medium")) {
      url.searchParams.set("utm_medium", "ai_tool");
    }
    if (!url.searchParams.has("utm_campaign")) {
      url.searchParams.set("utm_campaign", `${params.tenantId}_tryon`);
    }
    if (params.shade && !url.searchParams.has("utm_content")) {
      url.searchParams.set("utm_content", params.shade.toLowerCase().replace(/\s+/g, "_"));
    }

    if (params.extraParams) {
      for (const [key, value] of Object.entries(params.extraParams)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  } catch {
    // If URL parsing fails, check if valid safe URL string
    return isSafeHttpUrl(urlString) ? urlString : "";
  }
}
