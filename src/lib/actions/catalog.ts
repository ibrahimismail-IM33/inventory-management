"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/workspace";

export async function createSupplier(formData: FormData) {
  const { company } = await getActor();
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("suppliers").insert({
    company_id: company.id,
    name,
    contact: String(formData.get("contact") ?? "") || null,
    return_terms: String(formData.get("return_terms") ?? "") || null,
  });
  revalidatePath("/suppliers");
}

export async function createProduct(formData: FormData) {
  const { company } = await getActor();
  const supabase = await createClient();
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!sku || !name) return;
  await supabase.from("products").insert({
    company_id: company.id,
    sku,
    name,
    category: String(formData.get("category") ?? "") || null,
    barcode: String(formData.get("barcode") ?? "") || null,
    unit: String(formData.get("unit") ?? "PCS") || "PCS",
    cost: Number(formData.get("cost") ?? 0) || 0,
    sell_price: Number(formData.get("sell_price") ?? 0) || 0,
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    has_expiry: formData.get("has_expiry") !== null,
    returnable: formData.get("returnable") !== null,
  });
  revalidatePath("/products");
}
