import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { getTenantConfig, sanitizeTenantForClient } from "@/lib/tenant/loader";
import { TenantProvider } from "@/lib/tenant/context";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") || "default";
  const tenant = getTenantConfig(tenantId);

  if (!tenant) {
    return {
      title: "LustraHair — AI Virtual Hair Try-On",
    };
  }

  return {
    title: `${tenant.brandName} — AI Virtual Hair Try-On`,
    description:
      tenant.copy.subheadline ||
      `Upload a photo and discover how ${tenant.brandName} styles look on you with AI-powered virtual try-on.`,
    openGraph: {
      title: `${tenant.brandName} — AI Virtual Hair Try-On`,
      description: tenant.copy.headline,
      siteName: tenant.brandName,
      locale: "en_US",
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id") || "default";
  const tenant = getTenantConfig(tenantId);

  if (!tenant) {
    notFound();
  }

  const dynamicCss = `
    :root {
      --color-champagne: ${tenant.theme.primaryColor};
      --color-champagne-light: ${tenant.theme.primaryColorLight || tenant.theme.primaryColor + "33"};
      --color-ivory: ${tenant.theme.backgroundColor};
      --color-ivory-dark: ${tenant.theme.backgroundColorDark || tenant.theme.backgroundColor};
      --color-charcoal: ${tenant.theme.textColor || "#1a1816"};
      --color-surface: ${tenant.theme.surfaceColor || "#ffffff"};
      --radius-md: ${tenant.theme.borderRadius || "8px"};
      --font-display: ${tenant.theme.font};
    }
  `;

  // Provide only public sanitized configuration to client React tree
  const publicTenant = sanitizeTenantForClient(tenant);

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: dynamicCss }} />
      </head>
      <body className="min-h-screen antialiased">
        <TenantProvider tenant={publicTenant}>
          <Header />
          <main>{children}</main>
        </TenantProvider>
      </body>
    </html>
  );
}
