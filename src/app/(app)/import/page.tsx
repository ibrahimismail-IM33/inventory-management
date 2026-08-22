import { getWorkspace } from "@/lib/workspace";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  await getWorkspace(); // guard: requires an authenticated workspace

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Import products</h1>
      <p className="mt-1 text-sm opacity-70">
        Bulk-load your catalog from a CSV export of your existing system. Suppliers
        are created automatically from the supplier column.
      </p>

      <section className="mt-4 rounded-lg border border-black/10 p-4 text-sm">
        <h2 className="font-semibold">Columns</h2>
        <p className="mt-1 opacity-70">
          A header row is required. <strong>sku</strong> and <strong>name</strong> are
          mandatory; the rest are optional. Common aliases are accepted (e.g.
          <code className="mx-1">item code</code>→sku,
          <code className="mx-1">description</code>→name,
          <code className="mx-1">main supplier</code>→supplier).
        </p>
        <div className="mt-2 overflow-x-auto">
          <code className="whitespace-pre text-xs opacity-80">
            sku, name, category, barcode, unit, cost, sell_price, supplier, has_expiry
          </code>
        </div>
        <p className="mt-2 opacity-70">
          Rows are matched by SKU — re-importing updates existing products. Rows missing
          SKU or name are skipped and reported.
        </p>
      </section>

      <div className="mt-6">
        <ImportForm />
      </div>
    </div>
  );
}
