import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { daysUntil, expiryBucket, type ExpiryBucket } from "@/lib/inventory";
import { scrapBatch } from "@/lib/actions/movements";
import { createSupplierReturn } from "@/lib/actions/returns";
import { SubmitButton } from "@/components/SubmitButton";

const BUCKET_META: Record<ExpiryBucket, { title: string; tone: string }> = {
  expired: { title: "Expired", tone: "text-red-600" },
  next7: { title: "Next 7 days", tone: "text-amber-600" },
  next14: { title: "8–14 days", tone: "text-yellow-600" },
  later: { title: "Later", tone: "opacity-70" },
};

interface Row {
  id: string;
  batch_code: string;
  expires_at: string | null;
  status: string;
  qty: number;
  productName: string;
  returnable: boolean;
}

export default async function ExpiryPage() {
  const { company } = await getWorkspace();
  const supabase = await createClient();

  const [{ data: batches }, { data: suppliers }] = await Promise.all([
    supabase
      .from("batches")
      .select("id, batch_code, expires_at, status, products(name, returnable), stock(qty)")
      .eq("company_id", company.id)
      .neq("status", "written_off")
      .order("expires_at", { ascending: true, nullsFirst: false })
      .limit(1000),
    supabase.from("suppliers").select("id, name").eq("company_id", company.id).order("name"),
  ]);

  const rows: Row[] = (batches ?? [])
    .map((b) => {
      const p = b.products as unknown as { name: string; returnable: boolean } | null;
      const stock = (b.stock as unknown as { qty: number }[]) ?? [];
      const qty = stock.reduce((s, x) => s + Number(x.qty ?? 0), 0);
      return {
        id: b.id as string,
        batch_code: b.batch_code as string,
        expires_at: b.expires_at as string | null,
        status: b.status as string,
        qty,
        productName: p?.name ?? "—",
        returnable: p?.returnable ?? true,
      };
    })
    .filter((r) => r.qty > 0);

  const groups: Record<ExpiryBucket, Row[]> = { expired: [], next7: [], next14: [], later: [] };
  for (const r of rows) groups[expiryBucket(r.expires_at)].push(r);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Expiry board</h1>

      {(Object.keys(BUCKET_META) as ExpiryBucket[]).map((bucket) => {
        const meta = BUCKET_META[bucket];
        const items = groups[bucket];
        return (
          <section key={bucket} className="rounded-lg border border-black/10">
            <h2 className={`border-b border-black/10 px-4 py-3 font-semibold ${meta.tone}`}>
              {meta.title} <span className="opacity-60">({items.length})</span>
            </h2>
            {items.length === 0 ? (
              <p className="px-4 py-4 text-sm opacity-50">Nothing here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left opacity-60">
                    <tr>
                      <th className="px-4 py-2 font-medium">Product</th>
                      <th className="px-4 py-2 font-medium">Batch</th>
                      <th className="px-4 py-2 font-medium">Expires</th>
                      <th className="px-4 py-2 font-medium">Days</th>
                      <th className="px-4 py-2 font-medium">Qty</th>
                      <th className="px-4 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id} className="border-t border-black/5 align-top">
                        <td className="px-4 py-2">{r.productName}</td>
                        <td className="px-4 py-2">{r.batch_code}</td>
                        <td className="px-4 py-2 tabular-nums">{r.expires_at ?? "—"}</td>
                        <td className="px-4 py-2 tabular-nums">{daysUntil(r.expires_at) ?? "—"}</td>
                        <td className="px-4 py-2 tabular-nums">{r.qty}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-end gap-2">
                            {r.returnable && (
                              <form action={createSupplierReturn} className="flex items-end gap-1">
                                <input type="hidden" name="batch_id" value={r.id} />
                                <select name="supplier_id" className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-xs">
                                  <option value="">Supplier…</option>
                                  {(suppliers ?? []).map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                                <SubmitButton pendingText="…" className="rounded-md bg-teal-700 px-2 py-1 text-xs font-medium text-white hover:bg-teal-800">
                                  Return
                                </SubmitButton>
                              </form>
                            )}
                            <form action={scrapBatch}>
                              <input type="hidden" name="batch_id" value={r.id} />
                              <SubmitButton pendingText="…" className="rounded-md border border-black/15 px-2 py-1 text-xs hover:bg-black/5">
                                Scrap
                              </SubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
