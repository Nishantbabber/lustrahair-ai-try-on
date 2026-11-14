export const KNOWN_TENANTS = ["default", "aurasalon"] as const;

export type KnownTenantId = (typeof KNOWN_TENANTS)[number];

export function isKnownTenant(tenantId: string): boolean {
  const normalized = tenantId.toLowerCase().trim();
  return (KNOWN_TENANTS as readonly string[]).includes(normalized);
}

export function isValidTenantIdentifier(id: string): boolean {
  return /^[a-z0-9_-]+$/i.test(id);
}
