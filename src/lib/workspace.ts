import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Company, Store } from "@/lib/types";

export interface Workspace {
  userId: string;
  email: string | null;
  company: Company;
  stores: Store[];
  role: "admin" | "staff";
}

/**
 * Load the current user's workspace (company + stores). Redirects to /login if
 * signed out, or /onboarding if the user has no company yet.
 */
export async function getWorkspace(): Promise<Workspace> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("company_members")
    .select("role, company_id, companies(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.companies) redirect("/onboarding");

  const company = membership.companies as unknown as Company;

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: true });

  return {
    userId: user.id,
    email: user.email ?? null,
    company,
    stores: (stores ?? []) as Store[],
    role: (membership.role as "admin" | "staff") ?? "staff",
  };
}
