// WAQT core domain logic — pure functions ported from the reference engine
// (statusFromDate, FEFO allocation, expiry bucketing). No DB access here so it
// stays unit-testable; server actions call these and persist via Supabase.

import type { BatchStatus } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse an ISO date (YYYY-MM-DD) as a UTC midnight Date. */
function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Today at UTC midnight (date-only comparisons). */
export function todayUTC(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Whole days from today until `expires` (negative = already past). */
export function daysUntil(expires: string | null, now: Date = new Date()): number | null {
  const d = parseDate(expires);
  if (!d) return null;
  return Math.round((d.getTime() - todayUTC(now).getTime()) / MS_PER_DAY);
}

/**
 * Derive a batch's expiry status. Mirrors public.batch_status() in SQL:
 * expired if past, expiring_soon if within `nearDays`, otherwise ok.
 * (A written_off batch keeps that terminal status and is handled by callers.)
 */
export function statusFromDate(
  expires: string | null,
  nearDays: number,
  now: Date = new Date(),
): Exclude<BatchStatus, "written_off"> {
  const days = daysUntil(expires, now);
  if (days === null) return "ok";
  if (days < 0) return "expired";
  if (days <= nearDays) return "expiring_soon";
  return "ok";
}

export type ExpiryBucket = "expired" | "next7" | "next14" | "later";

/** Which expiry board bucket a date falls into. */
export function expiryBucket(
  expires: string | null,
  now: Date = new Date(),
): ExpiryBucket {
  const days = daysUntil(expires, now);
  if (days === null) return "later";
  if (days < 0) return "expired";
  if (days <= 7) return "next7";
  if (days <= 14) return "next14";
  return "later";
}

export interface AllocatableBatch {
  id: string;
  expires_at: string | null;
  created_at: string;
  status: BatchStatus;
  qty: number;
}

export interface Allocation {
  batch_id: string;
  qty: number;
}

export interface FefoResult {
  allocations: Allocation[];
  shortfall: number; // requested qty that could not be met from sellable stock
}

/**
 * First-Expired-First-Out allocation for outflow (a sale).
 * Ordered by expires_at asc (nulls last), then created_at asc — matching the
 * reference `takeAvailable`. Expired and written-off batches are never sold.
 */
export function allocateFEFO(
  batches: AllocatableBatch[],
  requestedQty: number,
): FefoResult {
  if (requestedQty <= 0) return { allocations: [], shortfall: 0 };

  const sellable = batches
    .filter((b) => b.status !== "expired" && b.status !== "written_off" && b.qty > 0)
    .sort((a, b) => {
      const ax = a.expires_at ?? "9999-12-31";
      const bx = b.expires_at ?? "9999-12-31";
      if (ax !== bx) return ax < bx ? -1 : 1;
      return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    });

  const allocations: Allocation[] = [];
  let remaining = requestedQty;
  for (const b of sellable) {
    if (remaining <= 0) break;
    const take = Math.min(b.qty, remaining);
    if (take > 0) {
      allocations.push({ batch_id: b.id, qty: take });
      remaining -= take;
    }
  }
  return { allocations, shortfall: remaining };
}

/** Format a number as the company's currency (default MYR / RM). */
export function formatMoney(amount: number, currency = "MYR", locale = "ms-MY"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
