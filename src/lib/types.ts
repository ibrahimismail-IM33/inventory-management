// WAQT domain types (hand-written to mirror the Supabase schema in
// supabase/migrations/0001_waqt_core.sql). Replace with generated types later
// via `supabase gen types typescript`.

export type Role = "admin" | "staff";
export type BatchStatus = "ok" | "expiring_soon" | "expired" | "written_off";
export type MovementKind = "receive" | "sale" | "scrap" | "return";
export type ReturnStatus =
  | "draft"
  | "submitted"
  | "shipped"
  | "credited"
  | "rejected";

export interface Company {
  id: string;
  name: string;
  near_expiry_days: number;
  currency: string;
  created_at: string;
}

export interface Store {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  contact: string | null;
  return_terms: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  category: string | null;
  barcode: string | null;
  unit: string;
  cost: number;
  sell_price: number;
  supplier_id: string | null;
  has_expiry: boolean;
  returnable: boolean;
  status: "active" | "inactive";
  created_at: string;
}

export interface Batch {
  id: string;
  company_id: string;
  product_id: string;
  batch_code: string;
  expires_at: string | null; // ISO date (YYYY-MM-DD)
  status: BatchStatus;
  created_at: string;
}

export interface Stock {
  company_id: string;
  batch_id: string;
  store_id: string;
  qty: number;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  batch_id: string | null;
  store_id: string | null;
  kind: MovementKind;
  qty: number;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface SupplierReturn {
  id: string;
  company_id: string;
  supplier_id: string | null;
  rma_number: string | null;
  status: ReturnStatus;
  credit_amount: number;
  notes: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface SupplierReturnLine {
  id: string;
  company_id: string;
  supplier_return_id: string;
  batch_id: string | null;
  qty: number;
  reason: string | null;
}
