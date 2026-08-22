import { createAdminClient } from "@/lib/supabase/admin";
import { isAlertDue, buildDigest, type AlertCompany, type DigestRow } from "@/lib/alerts";
import { sendEmail } from "@/lib/notify/email";

export interface CompanyAlertOutcome {
  company: string;
  status: "sent" | "skipped" | "error";
  detail?: string;
  recipients?: number;
  batches?: number;
}

/** ISO date string N days from today (UTC). */
function isoDatePlus(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Core alert run, shared by the scheduled cron and the "send test" action.
 * - onlyCompanyId: restrict to one company (test).
 * - force: ignore frequency/once-a-day gating and send even if nothing is due.
 */
export async function runExpiryAlerts(opts: {
  onlyCompanyId?: string;
  force?: boolean;
} = {}): Promise<CompanyAlertOutcome[]> {
  const admin = createAdminClient();
  const now = new Date();

  let query = admin.from("companies").select("*");
  if (opts.onlyCompanyId) query = query.eq("id", opts.onlyCompanyId);
  else query = query.eq("alert_enabled", true);
  const { data: companies, error } = await query;
  if (error) throw new Error(error.message);

  const outcomes: CompanyAlertOutcome[] = [];

  for (const raw of companies ?? []) {
    const c: AlertCompany = {
      id: raw.id,
      name: raw.name,
      currency: raw.currency ?? "MYR",
      alert_enabled: raw.alert_enabled ?? true,
      alert_days_before: raw.alert_days_before ?? 14,
      alert_frequency: raw.alert_frequency ?? "daily",
      alert_weekday: raw.alert_weekday ?? 1,
      alert_last_sent_at: raw.alert_last_sent_at ?? null,
    };

    if (!isAlertDue(c, now, opts.force)) {
      outcomes.push({ company: c.id, status: "skipped", detail: "not due" });
      continue;
    }

    const { data: recipientsData } = await admin.rpc("company_alert_recipients", { cid: c.id });
    const recipients: string[] = (recipientsData as string[] | null) ?? [];
    if (recipients.length === 0) {
      outcomes.push({ company: c.id, status: "skipped", detail: "no recipients" });
      continue;
    }

    // Batches expiring within the window (or already expired), with stock on hand.
    const { data: batches } = await admin
      .from("batches")
      .select("batch_code, expires_at, products(name), stock(qty)")
      .eq("company_id", c.id)
      .neq("status", "written_off")
      .not("expires_at", "is", null)
      .lte("expires_at", isoDatePlus(c.alert_days_before))
      .order("expires_at", { ascending: true });

    const rows: DigestRow[] = (batches ?? [])
      .map((b) => {
        const p = b.products as unknown as { name: string } | null;
        const stock = (b.stock as unknown as { qty: number }[]) ?? [];
        const qty = stock.reduce((s, x) => s + Number(x.qty ?? 0), 0);
        return {
          productName: p?.name ?? "—",
          batchCode: String(b.batch_code),
          expiresAt: b.expires_at as string | null,
          qty,
        };
      })
      .filter((r) => r.qty > 0);

    // On the scheduled run, don't email when there's nothing to report.
    if (rows.length === 0 && !opts.force) {
      outcomes.push({ company: c.id, status: "skipped", detail: "nothing expiring" });
      continue;
    }

    const digest = buildDigest(c, rows, now);
    const result = await sendEmail({
      to: recipients,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    });

    if (!result.ok) {
      outcomes.push({ company: c.id, status: "error", detail: result.error });
      continue;
    }

    await admin
      .from("companies")
      .update({ alert_last_sent_at: now.toISOString() })
      .eq("id", c.id);

    outcomes.push({
      company: c.id,
      status: "sent",
      recipients: recipients.length,
      batches: rows.length,
    });
  }

  return outcomes;
}
