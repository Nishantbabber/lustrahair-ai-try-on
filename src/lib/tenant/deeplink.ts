export interface DeepLinkParams {
  styleId: string;
  styleName?: string;
  shade?: string;
  tenantId: string;
  extraParams?: Record<string, string>;
}

/**
 * Builds an outbound trackable shopping/booking URL for a style.
 * Resolves template variables like {styleId}, {shade}, and {tenantId},
 * and guarantees UTM parameters are present for conversion attribution.
 */
export function buildShopUrl(template: string, params: DeepLinkParams): string {
  if (!template) {
    return "#";
  }

  const encodedStyleId = encodeURIComponent(params.styleId);
  const encodedStyleName = encodeURIComponent(params.styleName || params.styleId);
  const encodedShade = encodeURIComponent(params.shade || "");
  const encodedTenantId = encodeURIComponent(params.tenantId);

  let urlString = template
    .replace(/{styleId}/g, encodedStyleId)
    .replace(/{styleName}/g, encodedStyleName)
    .replace(/{shade}/g, encodedShade)
    .replace(/{tenantId}/g, encodedTenantId);

  try {
    const url = new URL(urlString, "https://example.com");

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

    // If template was relative or didn't have scheme, preserve original format or return full href
    if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
      return url.toString();
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // If URL parsing fails, return interpolated string directly
    return urlString;
  }
}
