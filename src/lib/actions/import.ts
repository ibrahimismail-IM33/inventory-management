"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/workspace";
import { parseCsvTable, pick } from "@/lib/csv";

export interface ImportResult {
  ok: boolean;
  message: string;
  imported: number;
  suppliersCreated: number;
  skipped: number;
  errors: string[];
}

const EMPTY: ImportResult = {
  ok: false,
  message: "",
  imported: 0,
  suppliersCreated: 0,
  skipped: 0,
  errors: [],
};

function toNumber(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toBool(v: string, dflt: boolean): boolean {
  if (v === "") return dflt;
  return /^(y|yes|true|1)$/i.test(v.trim());
}

/**
 * Import products (and auto-create suppliers) from a CSV file or pasted text.
 * Designed for useActionState: (prevState, formData) => ImportResult.
 */
export async function importProducts(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const { company } = await getActor();
  const supabase = await createClient();

  // Read from an uploaded file, or fall back to pasted text.
  const file = formData.get("file");
  let text = "";
  if (file instanceof File && file.size > 0) {
    text = await file.text();
  } else {
    text = String(formData.get("csv") ?? "");
  }
  if (!text.trim()) {
    return { ...EMPTY, message: "Nothing to import — attach a CSV file or paste rows." };
  }

  const { records } = parseCsvTable(text);
  if (records.length === 0) {
    return { ...EMPTY, message: "No data rows found. Include a header row plus at least one row." };
  }

  // Existing suppliers, keyed by lowercased name.
  const { data: existingSuppliers } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("company_id", company.id);
  const supplierMap = new Map<string, string>();
  for (const s of existingSuppliers ?? []) {
    supplierMap.set(String(s.name).trim().toLowerCase(), s.id as string);
  }

  const errors: string[] = [];
  let suppliersCreated = 0;
  let skipped = 0;
  const seenSku = new Set<string>();
  const products: Record<string, unknown>[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const lineNo = i + 2; // +1 header, +1 to 1-index

    const sku = pick(rec, "sku", "code", "item_code", "itemcode", "item_no");
    const name = pick(rec, "name", "description", "product", "item_name", "product_name");
    if (!sku || !name) {
      skipped++;
      if (errors.length < 20) errors.push(`Row ${lineNo}: missing SKU or name — skipped.`);
      continue;
    }
    if (seenSku.has(sku.toLowerCase())) {
      skipped++;
      if (errors.length < 20) errors.push(`Row ${lineNo}: duplicate SKU "${sku}" in file — skipped.`);
      continue;
    }
    seenSku.add(sku.toLowerCase());

    // Resolve / create supplier by name.
    const supplierName = pick(rec, "supplier", "main_supplier", "vendor", "supplier_name");
    let supplierId: string | null = null;
    if (supplierName) {
      const key = supplierName.toLowerCase();
      const found = supplierMap.get(key);
      if (found) {
        supplierId = found;
      } else {
        const { data: created, error } = await supabase
          .from("suppliers")
          .insert({ company_id: company.id, name: supplierName })
          .select("id")
          .single();
        if (created) {
          supplierId = created.id as string;
          supplierMap.set(key, supplierId);
          suppliersCreated++;
        } else if (error && errors.length < 20) {
          errors.push(`Row ${lineNo}: could not create supplier "${supplierName}".`);
        }
      }
    }

    products.push({
      company_id: company.id,
      sku,
      name,
      category: pick(rec, "category", "item_category", "item_group", "group") || null,
      barcode: pick(rec, "barcode", "ean", "upc") || null,
      unit: pick(rec, "unit", "uom", "base_uom") || "PCS",
      cost: toNumber(pick(rec, "cost", "cost_price", "unit_cost")),
      sell_price: toNumber(pick(rec, "sell_price", "price", "sell", "selling_price")),
      supplier_id: supplierId,
      has_expiry: toBool(pick(rec, "has_expiry", "expiry", "tracks_expiry"), true),
      returnable: toBool(pick(rec, "returnable", "return_to_supplier"), true),
      status: "active",
    });
  }

  let imported = 0;
  if (products.length > 0) {
    const { error, count } = await supabase
      .from("products")
      .upsert(products, { onConflict: "company_id,sku", count: "exact" });
    if (error) {
      return {
        ...EMPTY,
        message: `Import failed: ${error.message}`,
        suppliersCreated,
        skipped,
        errors,
      };
    }
    imported = count ?? products.length;
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Imported ${imported} product${imported === 1 ? "" : "s"}` +
      (suppliersCreated ? `, created ${suppliersCreated} supplier${suppliersCreated === 1 ? "" : "s"}` : "") +
      (skipped ? `, skipped ${skipped}` : "") + ".",
    imported,
    suppliersCreated,
    skipped,
    errors,
  };
}
