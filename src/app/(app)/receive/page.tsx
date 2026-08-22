import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { receiveStock } from "@/lib/actions/receive";

export default async function ReceivePage() {
  const { company, stores } = await getWorkspace();
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("name")
    .limit(1000);

  const hasProducts = (products ?? []).length > 0;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Receive stock</h1>
      <p className="mt-1 text-sm opacity-70">
        Record a new batch with its expiry date. Stock is added immediately.
      </p>

      {!hasProducts ? (
        <p className="mt-6 rounded-md border border-black/10 p-4 text-sm opacity-70">
          Add a product first on the{" "}
          <Link href="/products" className="text-teal-700 underline">Products</Link> page.
        </p>
      ) : (
        <form action={receiveStock} className="mt-6 flex flex-col gap-3 text-sm">
          <label className="font-medium">
            Product
            <select name="product_id" required className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2">
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </label>
          <label className="font-medium">
            Store
            <select name="store_id" required className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2">
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="font-medium">
            Batch code
            <input name="batch_code" required placeholder="e.g. LOT-2026-08" className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2" />
          </label>
          <label className="font-medium">
            Expiry date
            <input name="expires_at" type="date" className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2" />
          </label>
          <label className="font-medium">
            Quantity
            <input name="qty" type="number" min={1} required className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2" />
          </label>
          <button className="mt-2 rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800">
            Receive into stock
          </button>
        </form>
      )}
    </div>
  );
}
