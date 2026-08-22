"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/workspace";
import type { ReturnStatus } from "@/lib/types";

/**
 * Create a Supplier Return for a single expired/near-expired batch: header +
 * one line, plus a `return` movement that reduces the batch's stock to zero
 * across stores. (v1 supports one batch per return; multi-line comes later.)
 */
export async function createSupplierReturn(formData: FormData) {
  const { company, userId } = await getActor();
  const supabase = await createClient();

  const batchId = String(formData.get("batch_id") ?? "");
  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const rma = String(formData.get("rma_number") ?? "") || null;
  if (!batchId) return;

  const { data: batch } = await supabase
    .from("batches")
    .select("id, product_id")
    .eq("id", batchId)
    .single();
  if (!batch) return;

  const { data: header } = await supabase
    .from("supplier_returns")
    .insert({
      company_id: company.id,
      supplier_id: supplierId,
      rma_number: rma,
      status: "draft",
      actor_id: userId,
    })
    .select("id")
    .single();
  if (!header) return;

  const { data: stockRows } = await supabase
    .from("stock")
    .select("store_id, qty")
    .eq("batch_id", batchId);

  let totalQty = 0;
  for (const s of stockRows ?? []) {
    const q = s.qty as number;
    if (q > 0) {
      totalQty += q;
      await supabase.from("stock_movements").insert({
        company_id: company.id,
        product_id: batch.product_id,
        batch_id: batchId,
        store_id: s.store_id,
        kind: "return",
        qty: q,
        reason: "Supplier return (expired)",
        actor_id: userId,
      });
      await supabase
        .from("stock")
        .update({ qty: 0 })
        .eq("batch_id", batchId)
        .eq("store_id", s.store_id);
    }
  }

  await supabase.from("supplier_return_lines").insert({
    company_id: company.id,
    supplier_return_id: header.id,
    batch_id: batchId,
    qty: totalQty,
    reason: "expired",
  });

  revalidatePath("/returns");
  revalidatePath("/expiry");
}

/** Update a Supplier Return's status and (when credited) the recovered amount. */
export async function updateReturnStatus(formData: FormData) {
  await getActor();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ReturnStatus;
  if (!id || !status) return;
  const patch: { status: ReturnStatus; credit_amount?: number } = { status };
  const credit = formData.get("credit_amount");
  if (credit !== null && credit !== "") patch.credit_amount = Number(credit) || 0;
  await supabase.from("supplier_returns").update(patch).eq("id", id);
  revalidatePath("/returns");
  revalidatePath("/dashboard");
}
