// Expiry-alert logic: scheduling decision + digest rendering. Kept free of DB
// and network so it can be unit-tested; the run script supplies the data.

import { daysUntil } from "./inventory.ts";

export interface AlertCompany {
  id: string;
  name: string;
  currency: string;
  alert_enabled: boolean;
  alert_days_before: number;
  alert_frequency: "daily" | "weekly";
  alert_weekday: number; // 1=Mon..7=Sun (ISO)
  alert_last_sent_at: string | null;
}

export interface DigestRow {
  productName: string;
  batchCode: string;
  expiresAt: string | null;
  qty: number;
}

/** ISO day-of-week (1=Mon..7=Sun) for the given instant, in Malaysia time (UTC+8). */
export function isoWeekdayMYT(now: Date = new Date()): number {
  const myt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const dow = myt.getUTCDay(); // 0=Sun..6=Sat
  return dow === 0 ? 7 : dow;
}

function sameMytDate(aIso: string, now: Date): boolean {
  const a = new Date(new Date(aIso).getTime() + 8 * 60 * 60 * 1000);
  const b = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Whether a company's alert should fire now (respects frequency + once-a-day). */
export function isAlertDue(
  c: AlertCompany,
  now: Date = new Date(),
  force = false,
): boolean {
  if (force) return true;
  if (!c.alert_enabled) return false;
  if (c.alert_frequency === "weekly" && isoWeekdayMYT(now) !== c.alert_weekday) return false;
  if (c.alert_last_sent_at && sameMytDate(c.alert_last_sent_at, now)) return false;
  return true;
}

export interface Digest {
  subject: string;
  html: string;
  text: string;
  expiredCount: number;
  soonCount: number;
}

/** Build the email digest for a company from its at-risk batches. */
export function buildDigest(
  c: AlertCompany,
  rows: DigestRow[],
  now: Date = new Date(),
): Digest {
  const enriched = rows
    .map((r) => ({ ...r, days: daysUntil(r.expiresAt, now) }))
    .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));

  const expired = enriched.filter((r) => (r.days ?? 0) < 0);
  const soon = enriched.filter((r) => (r.days ?? 0) >= 0);

  const subject =
    enriched.length === 0
      ? `WAQT — no stock expiring within ${c.alert_days_before} days`
      : `WAQT — ${expired.length} expired, ${soon.length} expiring within ${c.alert_days_before} days`;

  const rowHtml = (r: (typeof enriched)[number], bad: boolean) => `
    <tr>
      <td style="padding:6px 10px;border-top:1px solid #eee">${escapeHtml(r.productName)}</td>
      <td style="padding:6px 10px;border-top:1px solid #eee">${escapeHtml(r.batchCode)}</td>
      <td style="padding:6px 10px;border-top:1px solid #eee">${r.expiresAt ?? "—"}</td>
      <td style="padding:6px 10px;border-top:1px solid #eee;color:${bad ? "#c0392b" : "#b9770e"};font-weight:600">${r.days}</td>
      <td style="padding:6px 10px;border-top:1px solid #eee;text-align:right">${r.qty}</td>
    </tr>`;

  const section = (title: string, list: typeof enriched, bad: boolean) =>
    list.length === 0
      ? ""
      : `<h3 style="margin:18px 0 6px;color:${bad ? "#c0392b" : "#b9770e"}">${title} (${list.length})</h3>
         <table style="border-collapse:collapse;width:100%;font-size:14px">
           <thead><tr style="text-align:left;color:#666">
             <th style="padding:6px 10px">Product</th><th style="padding:6px 10px">Batch</th>
             <th style="padding:6px 10px">Expires</th><th style="padding:6px 10px">Days</th>
             <th style="padding:6px 10px;text-align:right">Qty</th>
           </tr></thead>
           <tbody>${list.map((r) => rowHtml(r, bad)).join("")}</tbody>
         </table>`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;color:#15191b">
      <h2 style="margin:0 0 4px;color:#0f5c57">WAQT expiry alert</h2>
      <p style="margin:0 0 4px;color:#666">${escapeHtml(c.name)} · window: ${c.alert_days_before} days</p>
      ${
        enriched.length === 0
          ? `<p style="margin:16px 0;padding:12px;background:#e9f6f1;border-radius:8px">✅ Nothing expiring within ${c.alert_days_before} days. All good.</p>`
          : section("Expired — act now", expired, true) + section("Expiring soon", soon, false)
      }
      <p style="margin-top:20px;font-size:12px;color:#999">Sent by WAQT. Manage this alert in Settings.</p>
    </div>`;

  const text =
    enriched.length === 0
      ? `WAQT: nothing expiring within ${c.alert_days_before} days for ${c.name}.`
      : `WAQT expiry alert for ${c.name}:\n` +
        enriched
          .map((r) => `- ${r.productName} [${r.batchCode}] exp ${r.expiresAt} (${r.days}d) x${r.qty}`)
          .join("\n");

  return { subject, html, text, expiredCount: expired.length, soonCount: soon.length };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}
