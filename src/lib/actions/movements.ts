"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/workspace";
import { allocateFEFO, type AllocatableBatch } from "@/lib/inventory";

/**
 * Record a sale of `qty` of a product at a store, allocating FEFO across its
 * batches. Expired/written-off batches are never sold.
 */
export async function sellProduct(formData: FormData) {
  const { company, userId } = await getActor();
  const supabase = await createClient();

  const productId = String(formData.get("product_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const qty = Math.trunc(Number(formData.get("qty") ?? 0));
  if (!productId || !storeId || qty <= 0) return { error: "Invalid sale" };

  const { data: rows } = await supabase
    .from("stock")
    .select("qty, batches!inner(id, expires_at, created_at, status, product_id)")
    .eq("store_id", storeId)
    .eq("batches.product_id", productId);

  const batches: AllocatableBatch[] = (rows ?? []).map((r) => {
    const b = r.batches as unknown as {
      id: string;
      expires_at: string | null;
      created_at: string;
      status: AllocatableBatch["status"];
    };
    return { ...b, qty: r.qty as number };
  });

  const { allocations, shortfall } = allocateFEFO(batches, qty);
  if (shortfall > 0) {
    return { error: `Not enough sellable stock (short by ${shortfall}).` };
  }

  for (const a of allocations) {
    const current = batches.find((b) => b.id === a.batch_id)!;
    await supabase
      .from("stock")
      .update({ qty: current.qty - a.qty })
      .eq("batch_id", a.batch_id)
      .eq("store_id", storeId);
    await supabase.from("stock_movements").insert({
      company_id: company.id,
      product_id: productId,
      batch_id: a.batch_id,
      store_id: storeId,
      kind: "sale",
      qty: a.qty,
      actor_id: userId,
    });
  }

  revalidatePath("/expiry");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Scrap / write off a batch: mark written_off, zero its stock, log movements. */
export async function scrapBatch(formData: FormData) {
  const { company, userId } = await getActor();
  const supabase = await createClient();
  const batchId = String(formData.get("batch_id") ?? "");
  if (!batchId) return;

  const { data: batch } = await supabase
    .from("batches")
    .select("id, product_id")
    .eq("id", batchId)
    .single();
  if (!batch) return;

  const { data: stockRows } = await supabase
    .from("stock")
    .select("store_id, qty")
    .eq("batch_id", batchId);

  for (const s of stockRows ?? []) {
    if ((s.qty as number) > 0) {
      await supabase.from("stock_movements").insert({
        company_id: company.id,
        product_id: batch.product_id,
        batch_id: batchId,
        store_id: s.store_id,
        kind: "scrap",
        qty: s.qty,
        actor_id: userId,
      });
    }
    await supabase
      .from("stock")
      .update({ qty: 0 })
      .eq("batch_id", batchId)
      .eq("store_id", s.store_id);
  }

  await supabase.from("batches").update({ status: "written_off" }).eq("id", batchId);

  revalidatePath("/expiry");
  revalidatePath("/dashboard");
}
