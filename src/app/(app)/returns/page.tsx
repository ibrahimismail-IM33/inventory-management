import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { updateReturnStatus } from "@/lib/actions/returns";
import { formatMoney } from "@/lib/inventory";
import { SubmitButton } from "@/components/SubmitButton";

const STATUSES = ["draft", "submitted", "shipped", "credited", "rejected"] as const;

export default async function ReturnsPage() {
  const { company } = await getWorkspace();
  const supabase = await createClient();

  const { data: returns } = await supabase
    .from("supplier_returns")
    .select("id, rma_number, status, credit_amount, created_at, suppliers(name), supplier_return_lines(qty)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const totalRecovered = (returns ?? [])
    .filter((r) => r.status === "credited")
    .reduce((s, r) => s + Number(r.credit_amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Supplier Returns</h1>
        <p className="text-sm">
          Recovered:{" "}
          <span className="font-semibold text-teal-700">
            {formatMoney(totalRecovered, company.currency)}
          </span>
        </p>
      </div>

      <p className="text-sm opacity-70">
        Create returns from the{" "}
        <a href="/expiry" className="text-teal-700 underline">Expiry board</a>. Update status and
        record the credit you recover here.
      </p>

      <section className="rounded-lg border border-black/10">
        {(returns ?? []).length === 0 ? (
          <p className="px-4 py-6 text-sm opacity-60">No supplier returns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-60">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Supplier</th>
                  <th className="px-4 py-2 font-medium">RMA</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {(returns ?? []).map((r) => {
                  const sup = r.suppliers as unknown as { name: string } | null;
                  const lines = (r.supplier_return_lines as unknown as { qty: number }[]) ?? [];
                  const qty = lines.reduce((s, l) => s + Number(l.qty ?? 0), 0);
                  return (
                    <tr key={r.id} className="border-t border-black/5 align-middle">
                      <td className="px-4 py-2 tabular-nums">
                        {new Date(r.created_at as string).toLocaleDateString("ms-MY")}
                      </td>
                      <td className="px-4 py-2">{sup?.name ?? "—"}</td>
                      <td className="px-4 py-2">{r.rma_number ?? "—"}</td>
                      <td className="px-4 py-2 tabular-nums">{qty}</td>
                      <td className="px-4 py-2">
                        {r.status as string}
                        {r.status === "credited" && (
                          <span className="ml-1 text-teal-700">
                            ({formatMoney(Number(r.credit_amount), company.currency)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <form action={updateReturnStatus} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={r.id} />
                          <select name="status" defaultValue={r.status as string} className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-xs">
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <input name="credit_amount" type="number" step="0.01" placeholder="Credit" className="w-24 rounded-md border border-black/15 bg-transparent px-2 py-1 text-xs" />
                          <SubmitButton pendingText="…" className="rounded-md bg-teal-700 px-2 py-1 text-xs font-medium text-white hover:bg-teal-800">Save</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
