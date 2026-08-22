"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/workspace";
import { runExpiryAlerts } from "@/lib/alerts-run";

function parseRecipients(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes("@")),
    ),
  );
}

export async function updateAlertSettings(formData: FormData) {
  const { company, role } = await getActor();
  if (role !== "admin") redirect("/settings?saved=denied");
  const supabase = await createClient();

  const days = Math.max(1, Math.min(365, Math.trunc(Number(formData.get("alert_days_before") ?? 14))));
  const weekday = Math.max(1, Math.min(7, Math.trunc(Number(formData.get("alert_weekday") ?? 1))));
  const frequency = formData.get("alert_frequency") === "weekly" ? "weekly" : "daily";

  await supabase
    .from("companies")
    .update({
      alert_enabled: formData.get("alert_enabled") !== null,
      alert_days_before: days,
      alert_frequency: frequency,
      alert_weekday: weekday,
      alert_include_admins: formData.get("alert_include_admins") !== null,
      alert_recipients: parseRecipients(String(formData.get("alert_recipients") ?? "")),
    })
    .eq("id", company.id);

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function sendTestAlert() {
  const { company } = await getActor();
  let msg: string;
  try {
    const outcomes = await runExpiryAlerts({ onlyCompanyId: company.id, force: true });
    const o = outcomes[0];
    if (o?.status === "sent") msg = `Test alert sent to ${o.recipients} recipient(s).`;
    else msg = `Not sent — ${o?.detail ?? "unknown reason"}.`;
  } catch (e) {
    msg = `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
  redirect(`/settings?test=${encodeURIComponent(msg)}`);
}
