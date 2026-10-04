import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function resolveTenantFromRequest(request: NextRequest): string {
  // 1. Explicit query parameter (?tenant=...)
  const queryTenant = request.nextUrl.searchParams.get("tenant")?.toLowerCase().trim();
  if (queryTenant && /^[a-z0-9_-]+$/i.test(queryTenant)) {
    return queryTenant;
  }

  // 2. Subdomain check from host header
  const host = request.headers.get("host") || "";
  const cleanHost = host.split(":")[0].toLowerCase().trim();
  const parts = cleanHost.split(".");

  if (parts.length >= 2) {
    const candidate = parts[0];
    if (
      candidate !== "www" &&
      candidate !== "app" &&
      candidate !== "api" &&
      candidate !== "localhost" &&
      candidate !== "127" &&
      /^[a-z0-9_-]+$/i.test(candidate)
    ) {
      return candidate;
    }
  }

  // 3. Cookie fallback (allows navigating around after testing with ?tenant=...)
  const cookieTenant = request.cookies.get("x-tenant-id")?.value;
  if (cookieTenant && /^[a-z0-9_-]+$/i.test(cookieTenant)) {
    return cookieTenant;
  }

  // 4. Default fallback
  return "default";
}

export function middleware(request: NextRequest) {
  // Ignore static assets and Next internals
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/images") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const tenantId = resolveTenantFromRequest(request);

  // Clone the request headers so we can set x-tenant-id
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Keep cookie in sync so multi-page links on the same host preserve tenant selection
  response.cookies.set("x-tenant-id", tenantId, {
    path: "/",
    sameSite: "lax",
    httpOnly: false, // accessible to client if needed
  });

  // Pass down header to response for visibility
  response.headers.set("x-tenant-id", tenantId);

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
