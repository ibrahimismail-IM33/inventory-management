"use client";

import { useActionState } from "react";
import { importProducts, type ImportResult } from "@/lib/actions/import";

const initialState: ImportResult = {
  ok: false,
  message: "",
  imported: 0,
  suppliersCreated: 0,
  skipped: 0,
  errors: [],
};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importProducts, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 text-sm">
      <div>
        <label className="font-medium">Upload a CSV file</label>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="mt-1 block w-full rounded-md border border-black/15 bg-transparent px-3 py-2"
        />
      </div>

      <div className="text-center text-xs opacity-50">— or paste rows below —</div>

      <div>
        <label className="font-medium">Paste CSV</label>
        <textarea
          name="csv"
          rows={6}
          placeholder={"sku,name,category,barcode,unit,cost,sell_price,supplier,has_expiry\n9551,IVE'S BODY SHAMPOO 1L,SOAP,9551234,PCS,6.50,9.90,IVE'S,yes"}
          className="mt-1 block w-full rounded-md border border-black/15 bg-transparent px-3 py-2 font-mono text-xs"
        />
      </div>

      <button
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Importing…" : "Import products"}
      </button>

      {state.message && (
        <div
          className={`rounded-md px-3 py-2 ${
            state.ok ? "bg-teal-600/10 text-teal-700" : "bg-red-500/10 text-red-600"
          }`}
        >
          {state.message}
        </div>
      )}

      {state.errors.length > 0 && (
        <details className="rounded-md border border-black/10 p-3">
          <summary className="cursor-pointer font-medium">
            {state.errors.length} row issue{state.errors.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 list-disc pl-5 opacity-80">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </form>
  );
}
