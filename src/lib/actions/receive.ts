"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { statusFromDate } from "@/lib/inventory";

/**
 * Receive stock into a batch at a store: create/find the batch, add to stock,
 * and log a `receive` movement.
 */
export async function receiveStock(formData: FormData) {
  const { company, userId } = await getWorkspace();
  const supabase = await createClient();

  const productId = String(formData.get("product_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const batchCode = String(formData.get("batch_code") ?? "").trim();
  const expiresAt = String(formData.get("expires_at") ?? "") || null;
  const qty = Math.trunc(Number(formData.get("qty") ?? 0));
  if (!productId || !storeId || !batchCode || qty <= 0) return;

  // Find or create the batch.
  const { data: existing } = await supabase
    .from("batches")
    .select("id")
    .eq("company_id", company.id)
    .eq("product_id", productId)
    .eq("batch_code", batchCode)
    .maybeSingle();

  let batchId = existing?.id as string | undefined;
  if (!batchId) {
    const { data: created } = await supabase
      .from("batches")
      .insert({
        company_id: company.id,
        product_id: productId,
        batch_code: batchCode,
        expires_at: expiresAt,
        status: statusFromDate(expiresAt, company.near_expiry_days),
      })
      .select("id")
      .single();
    batchId = created?.id;
  }
  if (!batchId) return;

  // Upsert stock (batch_id, store_id).
  const { data: stockRow } = await supabase
    .from("stock")
    .select("qty")
    .eq("batch_id", batchId)
    .eq("store_id", storeId)
    .maybeSingle();

  await supabase.from("stock").upsert(
    {
      company_id: company.id,
      batch_id: batchId,
      store_id: storeId,
      qty: (stockRow?.qty ?? 0) + qty,
    },
    { onConflict: "batch_id,store_id" },
  );

  await supabase.from("stock_movements").insert({
    company_id: company.id,
    product_id: productId,
    batch_id: batchId,
    store_id: storeId,
    kind: "receive",
    qty,
    actor_id: userId,
  });

  revalidatePath("/expiry");
  revalidatePath("/dashboard");
}
