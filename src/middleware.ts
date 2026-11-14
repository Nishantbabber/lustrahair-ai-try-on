import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isKnownTenant, isValidTenantIdentifier } from "@/lib/tenant/constants";
import { getSecurityHeaders } from "@/lib/security-headers";

/**
 * Resolves tenant ID purely from trusted server-side inputs:
 * 1. Query parameter ?tenant=... (strictly validated against known tenant list)
 * 2. Subdomain (excluding vercel.app, www, app, localhost, etc.)
 * 3. Cookie (validated against known tenant list)
 * 
 * Never trusts incoming client-supplied x-tenant-id header.
 * Rejects unknown tenant candidates instead of silently falling back.
 */
function resolveTenantFromRequest(request: NextRequest): { tenantId: string | null; invalid: boolean } {
  // 1. Explicit query parameter (?tenant=...)
  if (request.nextUrl.searchParams.has("tenant")) {
    const queryTenant = request.nextUrl.searchParams.get("tenant")?.toLowerCase().trim();
    if (queryTenant && isValidTenantIdentifier(queryTenant) && isKnownTenant(queryTenant)) {
      return { tenantId: queryTenant, invalid: false };
    }
    return { tenantId: null, invalid: true };
  }

  // 2. Subdomain check from host header
  const host = request.headers.get("host") || "";
  const cleanHost = host.split(":")[0].toLowerCase().trim();

  // Do NOT interpret vercel.app or any *.vercel.app hostnames as tenant IDs
  if (cleanHost === "vercel.app" || cleanHost.endsWith(".vercel.app")) {
    return { tenantId: "default", invalid: false };
  }

  const parts = cleanHost.split(".");
  if (parts.length >= 2) {
    const candidate = parts[0];
    if (
      candidate !== "www" &&
      candidate !== "app" &&
      candidate !== "api" &&
      candidate !== "localhost" &&
      candidate !== "127"
    ) {
      if (isValidTenantIdentifier(candidate)) {
        if (isKnownTenant(candidate)) {
          return { tenantId: candidate, invalid: false };
        }
        return { tenantId: null, invalid: true };
      }
    }
  }

  // 3. Cookie fallback (allows navigating around after testing with ?tenant=...)
  const cookieTenant = request.cookies.get("x-tenant-id")?.value;
  if (cookieTenant && isValidTenantIdentifier(cookieTenant)) {
    if (isKnownTenant(cookieTenant)) {
      return { tenantId: cookieTenant, invalid: false };
    }
    // If cookie holds an unknown tenant, treat as invalid
    return { tenantId: null, invalid: true };
  }

  // 4. Default fallback
  return { tenantId: "default", invalid: false };
}

/**
 * Applies production-grade security headers to all responses.
 */
function applySecurityHeaders(response: NextResponse, isProduction: boolean): void {
  const headers = getSecurityHeaders(isProduction);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}

export function middleware(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";

  // Ignore static assets and Next internals
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/images") ||
    request.nextUrl.pathname.includes(".")
  ) {
    const res = NextResponse.next();
    applySecurityHeaders(res, isProduction);
    return res;
  }

  const { tenantId, invalid } = resolveTenantFromRequest(request);

  if (invalid || !tenantId) {
    // If an unknown or invalid tenant was requested on an API route, return 404 JSON
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const errResponse = NextResponse.json(
        {
          success: false,
          code: "NOT_FOUND",
          error: "Tenant not found or invalid tenant identifier.",
        },
        { status: 404 }
      );
      applySecurityHeaders(errResponse, isProduction);
      return errResponse;
    }

    // For web pages, return a 404 Not Found response
    const notFoundResponse = new NextResponse(
      "Tenant not found. Please verify the requested boutique or salon identifier.",
      {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
    applySecurityHeaders(notFoundResponse, isProduction);
    return notFoundResponse;
  }

  // Override / set trusted x-tenant-id request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Keep cookie in sync so navigation preserves tenant selection
  response.cookies.set("x-tenant-id", tenantId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  // Pass down header to response for visibility
  response.headers.set("x-tenant-id", tenantId);

  // Apply security headers
  applySecurityHeaders(response, isProduction);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/* (public images)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
