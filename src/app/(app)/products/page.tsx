import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { createProduct } from "@/lib/actions/catalog";
import { formatMoney } from "@/lib/inventory";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ProductsPage() {
  const { company } = await getWorkspace();
  const supabase = await createClient();

  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase
      .from("products")
      .select("*, suppliers(name)")
      .eq("company_id", company.id)
      .order("name")
      .limit(500),
    supabase.from("suppliers").select("id, name").eq("company_id", company.id).order("name"),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <section className="rounded-lg border border-black/10">
        <h1 className="border-b border-black/10 px-4 py-3 text-lg font-semibold">Products</h1>
        {(products ?? []).length === 0 ? (
          <p className="px-4 py-6 text-sm opacity-60">No products yet. Add one on the right.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-60">
                <tr>
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Supplier</th>
                  <th className="px-4 py-2 font-medium">Cost</th>
                  <th className="px-4 py-2 font-medium">Sell</th>
                  <th className="px-4 py-2 font-medium">Expiry?</th>
                </tr>
              </thead>
              <tbody>
                {(products ?? []).map((p) => {
                  const sup = p.suppliers as unknown as { name: string } | null;
                  return (
                    <tr key={p.id} className="border-t border-black/5">
                      <td className="px-4 py-2 tabular-nums">{p.sku}</td>
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2">{sup?.name ?? "—"}</td>
                      <td className="px-4 py-2 tabular-nums">{formatMoney(Number(p.cost), company.currency)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatMoney(Number(p.sell_price), company.currency)}</td>
                      <td className="px-4 py-2">{p.has_expiry ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="h-fit rounded-lg border border-black/10 p-4">
        <h2 className="font-semibold">Add product</h2>
        <form action={createProduct} className="mt-3 flex flex-col gap-3 text-sm">
          <input name="sku" required placeholder="SKU / item code" className="rounded-md border border-black/15 bg-transparent px-3 py-2" />
          <input name="name" required placeholder="Product name" className="rounded-md border border-black/15 bg-transparent px-3 py-2" />
          <input name="category" placeholder="Category" className="rounded-md border border-black/15 bg-transparent px-3 py-2" />
          <input name="barcode" placeholder="Barcode" className="rounded-md border border-black/15 bg-transparent px-3 py-2" />
          <div className="flex gap-2">
            <input name="cost" type="number" step="0.01" placeholder="Cost" className="w-1/2 rounded-md border border-black/15 bg-transparent px-3 py-2" />
            <input name="sell_price" type="number" step="0.01" placeholder="Sell price" className="w-1/2 rounded-md border border-black/15 bg-transparent px-3 py-2" />
          </div>
          <select name="supplier_id" className="rounded-md border border-black/15 bg-transparent px-3 py-2">
            <option value="">— Supplier (optional) —</option>
            {(suppliers ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="has_expiry" defaultChecked /> Tracks expiry
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="returnable" defaultChecked /> Returnable to supplier
          </label>
          <SubmitButton pendingText="Adding…" className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800">Add product</SubmitButton>
        </form>
      </section>
    </div>
  );
}
