import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { daysUntil, formatMoney } from "@/lib/inventory";

export default async function DashboardPage() {
  const { company } = await getWorkspace();
  const supabase = await createClient();

  const [{ count: skuCount }, { data: batches }, { data: returns }] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("batches")
      .select("id, expires_at, status, products(name, sku)")
      .eq("company_id", company.id)
      .neq("status", "written_off")
      .order("expires_at", { ascending: true, nullsFirst: false })
      .limit(500),
    supabase
      .from("supplier_returns")
      .select("credit_amount, status, created_at")
      .eq("company_id", company.id),
  ]);

  const rows = batches ?? [];
  const expired = rows.filter((b) => b.status === "expired").length;
  const expiringSoon = rows.filter((b) => {
    const d = daysUntil(b.expires_at as string | null);
    return d !== null && d >= 0 && d <= 14;
  }).length;

  const recovered = (returns ?? [])
    .filter((r) => r.status === "credited")
    .reduce((sum, r) => sum + Number(r.credit_amount ?? 0), 0);
  const openReturns = (returns ?? []).filter(
    (r) => r.status !== "credited" && r.status !== "rejected",
  ).length;

  const soonest = rows
    .filter((b) => b.expires_at)
    .slice(0, 8);

  const tiles = [
    { label: "Products (SKUs)", value: skuCount ?? 0 },
    { label: "Expiring ≤14 days", value: expiringSoon, tone: "warn" },
    { label: "Expired", value: expired, tone: "bad" },
    { label: "Open returns", value: openReturns },
    { label: "Recovered (credited)", value: formatMoney(recovered, company.currency) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link
          href="/receive"
          className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          Receive stock
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-black/10 p-4">
            <p className="text-xs uppercase tracking-wide opacity-60">{t.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold tabular-nums ${
                t.tone === "bad"
                  ? "text-red-600"
                  : t.tone === "warn"
                    ? "text-amber-600"
                    : ""
              }`}
            >
              {t.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-black/10">
        <h2 className="border-b border-black/10 px-4 py-3 font-semibold">Soonest to expire</h2>
        {soonest.length === 0 ? (
          <p className="px-4 py-6 text-sm opacity-60">
            No batches yet. <Link className="text-teal-700 underline" href="/receive">Receive stock</Link> to start tracking expiry.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left opacity-60">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Expires</th>
                <th className="px-4 py-2 font-medium">Days left</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {soonest.map((b) => {
                const p = b.products as unknown as { name: string; sku: string } | null;
                const d = daysUntil(b.expires_at as string | null);
                return (
                  <tr key={b.id} className="border-t border-black/5">
                    <td className="px-4 py-2">{p?.name ?? "—"}</td>
                    <td className="px-4 py-2 tabular-nums">{b.expires_at as string}</td>
                    <td className="px-4 py-2 tabular-nums">{d}</td>
                    <td className="px-4 py-2">{b.status as string}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
