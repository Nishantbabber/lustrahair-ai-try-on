"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { TenantConfig, TenantStyle } from "@/types/tenant";
import { buildShopUrl, isSafeHttpUrl } from "./deeplink";

interface TenantContextValue {
  tenant: TenantConfig;
  getStyleById: (id: string) => TenantStyle | undefined;
  getShopUrl: (styleId: string, shade?: string) => string;
  isShopConfigured: (styleId: string) => boolean;
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
      getStyleById: (id: string) => tenant.styles?.find((s) => s.id === id),
      getShopUrl: (styleId: string, shade?: string) => {
        const style = tenant.styles?.find((s) => s.id === styleId);
        // Do not fall back to fake or invented URLs like example.com
        const template = style?.productUrlTemplate;
        if (!template) return "";

        return buildShopUrl(template, {
          styleId,
          styleName: style?.name,
          shade,
          tenantId: tenant.id,
        });
      },
      isShopConfigured: (styleId: string) => {
        const style = tenant.styles?.find((s) => s.id === styleId);
        return Boolean(style?.productUrlTemplate && isSafeHttpUrl(style.productUrlTemplate));
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
