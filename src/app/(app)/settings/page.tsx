import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { updateAlertSettings, sendTestAlert } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; test?: string }>;
}) {
  const { company } = await getWorkspace();
  const { saved, test } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select(
      "alert_enabled, alert_days_before, alert_frequency, alert_weekday, alert_include_admins, alert_recipients",
    )
    .eq("id", company.id)
    .single();

  const s = data ?? {
    alert_enabled: true,
    alert_days_before: 14,
    alert_frequency: "daily",
    alert_weekday: 1,
    alert_include_admins: true,
    alert_recipients: [] as string[],
  };
  const recipients = (s.alert_recipients as string[] | null)?.join("\n") ?? "";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings · Expiry alerts</h1>
      <p className="mt-1 text-sm opacity-70">
        Get an email digest of stock that is expired or expiring soon.
      </p>

      {saved === "1" && (
        <p className="mt-3 rounded-md bg-teal-600/10 px-3 py-2 text-sm text-teal-700">Settings saved.</p>
      )}
      {saved === "denied" && (
        <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
          Only admins can change alert settings.
        </p>
      )}
      {test && (
        <p className="mt-3 rounded-md bg-black/5 px-3 py-2 text-sm">{test}</p>
      )}

      <form action={updateAlertSettings} className="mt-5 flex flex-col gap-4 text-sm">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" name="alert_enabled" defaultChecked={s.alert_enabled} />
          Enable expiry alerts
        </label>

        <label className="font-medium">
          Alert me about stock expiring within
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              name="alert_days_before"
              min={1}
              max={365}
              defaultValue={s.alert_days_before}
              className="w-24 rounded-md border border-black/15 bg-transparent px-3 py-2"
            />
            <span className="opacity-70">days (and anything already expired)</span>
          </div>
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="font-medium">
            Frequency
            <select
              name="alert_frequency"
              defaultValue={s.alert_frequency}
              className="mt-1 block rounded-md border border-black/15 bg-transparent px-3 py-2"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label className="font-medium">
            Weekly on
            <select
              name="alert_weekday"
              defaultValue={String(s.alert_weekday)}
              className="mt-1 block rounded-md border border-black/15 bg-transparent px-3 py-2"
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <option key={d} value={i + 1}>{d}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" name="alert_include_admins" defaultChecked={s.alert_include_admins} />
          Send to all admin users
        </label>

        <label className="font-medium">
          Extra recipients (one email per line)
          <textarea
            name="alert_recipients"
            rows={3}
            defaultValue={recipients}
            placeholder={"manager@store.com\npurchasing@store.com"}
            className="mt-1 block w-full rounded-md border border-black/15 bg-transparent px-3 py-2"
          />
        </label>

        <SubmitButton pendingText="Saving…" className="w-fit rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800">
          Save settings
        </SubmitButton>
      </form>

      <form action={sendTestAlert} className="mt-6 border-t border-black/10 pt-4">
        <p className="text-sm opacity-70">
          Send yourself a digest right now to check the email works (ignores schedule).
        </p>
        <SubmitButton pendingText="Sending…" className="mt-2 rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5">
          Send test alert now
        </SubmitButton>
      </form>

      <p className="mt-6 text-xs opacity-50">
        Daily alerts run automatically each morning. Weekly digests send on the chosen day.
      </p>
    </div>
  );
}
