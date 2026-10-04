"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { TenantConfig, TenantStyle } from "@/types/tenant";
import { buildShopUrl, type DeepLinkParams } from "./deeplink";

interface TenantContextValue {
  tenant: TenantConfig;
  getStyleById: (id: string) => TenantStyle | undefined;
  getShopUrl: (styleId: string, shade?: string) => string;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantConfig;
  children: React.ReactNode;
}) {
  const value = useMemo<TenantContextValue>(() => {
    return {
      tenant,
      getStyleById: (id: string) => tenant.styles.find((s) => s.id === id),
      getShopUrl: (styleId: string, shade?: string) => {
        const style = tenant.styles.find((s) => s.id === styleId);
        const template =
          style?.productUrlTemplate ||
          `https://example.com/products/${styleId}?shade={shade}&utm_source=hair_tryon&utm_medium=ai_tool&utm_campaign={tenantId}_tryon`;

        return buildShopUrl(template, {
          styleId,
          styleName: style?.name,
          shade,
          tenantId: tenant.id,
        });
      },
    };
  }, [tenant]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return ctx;
}
