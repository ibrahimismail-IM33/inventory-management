import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { createSupplier } from "@/lib/actions/catalog";

export default async function SuppliersPage() {
  const { company } = await getWorkspace();
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .eq("company_id", company.id)
    .order("name");

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-black/10">
        <h1 className="border-b border-black/10 px-4 py-3 text-lg font-semibold">Suppliers</h1>
        {(suppliers ?? []).length === 0 ? (
          <p className="px-4 py-6 text-sm opacity-60">No suppliers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left opacity-60">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Return terms</th>
              </tr>
            </thead>
            <tbody>
              {(suppliers ?? []).map((s) => (
                <tr key={s.id} className="border-t border-black/5">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.contact ?? "—"}</td>
                  <td className="px-4 py-2">{s.return_terms ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="h-fit rounded-lg border border-black/10 p-4">
        <h2 className="font-semibold">Add supplier</h2>
        <form action={createSupplier} className="mt-3 flex flex-col gap-3 text-sm">
          <input name="name" required placeholder="Supplier name" className="rounded-md border border-black/15 bg-transparent px-3 py-2" />
          <input name="contact" placeholder="Contact (phone/email)" className="rounded-md border border-black/15 bg-transparent px-3 py-2" />
          <textarea name="return_terms" placeholder="Return terms (optional)" className="rounded-md border border-black/15 bg-transparent px-3 py-2" />
          <button className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800">Add supplier</button>
        </form>
      </section>
    </div>
  );
}
