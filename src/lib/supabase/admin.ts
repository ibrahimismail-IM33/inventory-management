import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-only jobs (the scheduled
 * expiry-alert run). Bypasses RLS, so it must NEVER be imported into client
 * code. Requires SUPABASE_SERVICE_ROLE_KEY (server env, not NEXT_PUBLIC).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
