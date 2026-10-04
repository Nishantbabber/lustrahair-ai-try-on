import fs from "fs";
import path from "path";

const CONSENT_EVENTS_KEY = "_consentEvents";
const RATE_LIMIT_EVENTS_KEY = "_rateLimitHits";

interface ConsentAuditEvent {
  tenantId: string;
  timestamp: string;
  consentGiven: true;
}

interface RateLimitHitEvent {
  tenantId: string;
  ip: string;
  timestamp: string;
}

interface UsageData {
  [key: string]: number | ConsentAuditEvent[] | RateLimitHitEvent[] | undefined;
}

const memoryUsageStore: UsageData = {};
const USAGE_FILE_DIR = path.join(process.cwd(), ".data");
const USAGE_FILE_PATH = path.join(USAGE_FILE_DIR, "tenant-usage.json");

function getYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getUsageKey(tenantId: string): string {
  return `${tenantId.toLowerCase()}:${getYearMonth()}`;
}

function loadUsageFile(): UsageData {
  try {
    if (fs.existsSync(USAGE_FILE_PATH)) {
      const content = fs.readFileSync(USAGE_FILE_PATH, "utf-8");
      return { ...memoryUsageStore, ...JSON.parse(content) };
    }
  } catch (err) {
    console.warn("[TENANT_USAGE] Could not read usage file, using in-memory store:", err);
  }
  return memoryUsageStore;
}

function persistUsageFile(data: UsageData): void {
  try {
    if (!fs.existsSync(USAGE_FILE_DIR)) {
      fs.mkdirSync(USAGE_FILE_DIR, { recursive: true });
    }
    fs.writeFileSync(USAGE_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[TENANT_USAGE] Could not write usage file, keeping in-memory:", err);
  }
}

/**
 * Returns current monthly usage count for a tenant.
 */
export function getTenantMonthlyUsage(tenantId: string): number {
  const key = getUsageKey(tenantId);
  const data = loadUsageFile();
  const value = data[key];
  return typeof value === "number" ? value : 0;
}

/**
 * Checks whether a tenant is within their monthly try-on quota limit.
 */
export function checkTenantQuota(
  tenantId: string,
  limit: number
): { allowed: boolean; currentUsage: number; limit: number } {
  const currentUsage = getTenantMonthlyUsage(tenantId);
  const allowed = limit <= 0 ? false : currentUsage < limit;

  return {
    allowed,
    currentUsage,
    limit,
  };
}

/**
 * Increments the monthly usage count for a tenant.
 */
export function incrementTenantUsage(tenantId: string): number {
  const key = getUsageKey(tenantId);
  const data = loadUsageFile();
  const existing = data[key];
  const current = (typeof existing === "number" ? existing : 0) + 1;
  data[key] = current;
  memoryUsageStore[key] = current;
  persistUsageFile(data);
  return current;
}

/**
 * Records an affirmative photo-processing consent event alongside usage data
 * (tenant ID, ISO timestamp, consentGiven) for audit purposes.
 */
export function recordConsentEvent(tenantId: string): ConsentAuditEvent {
  const event: ConsentAuditEvent = {
    tenantId: tenantId.toLowerCase(),
    timestamp: new Date().toISOString(),
    consentGiven: true,
  };

  const data = loadUsageFile();
  const existing = data[CONSENT_EVENTS_KEY];
  const events: ConsentAuditEvent[] = Array.isArray(existing) ? existing : [];
  events.push(event);
  data[CONSENT_EVENTS_KEY] = events;
  memoryUsageStore[CONSENT_EVENTS_KEY] = events;
  persistUsageFile(data);

  console.log(
    `[TRYON_CONSENT] tenant: ${event.tenantId}, time: ${event.timestamp}, consentGiven: true`
  );

  return event;
}

/**
 * Records a per-IP rate-limit rejection (IP, tenant, timestamp) in the usage file
 * so later review can separate abuse from genuine demand.
 */
export function recordRateLimitHit(tenantId: string, ip: string): RateLimitHitEvent {
  const event: RateLimitHitEvent = {
    tenantId: tenantId.toLowerCase(),
    ip,
    timestamp: new Date().toISOString(),
  };

  const data = loadUsageFile();
  const existing = data[RATE_LIMIT_EVENTS_KEY];
  const events: RateLimitHitEvent[] = Array.isArray(existing)
    ? (existing as RateLimitHitEvent[])
    : [];
  events.push(event);
  data[RATE_LIMIT_EVENTS_KEY] = events;
  memoryUsageStore[RATE_LIMIT_EVENTS_KEY] = events;
  persistUsageFile(data);

  console.log(
    `[TRYON_RATE_LIMIT] ip: ${event.ip}, tenant: ${event.tenantId}, time: ${event.timestamp}`
  );

  return event;
}
