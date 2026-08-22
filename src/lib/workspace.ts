import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Company, Store } from "@/lib/types";

export interface Actor {
  userId: string;
  email: string | null;
  company: Company;
  role: "admin" | "staff";
}

export interface Workspace extends Actor {
  stores: Store[];
}

/**
 * Lightweight lookup for Server Actions: user + company + role in two round-trips
 * (auth + one joined query). Skips the stores fetch that most actions don't need.
 */
export async function getActor(): Promise<Actor> {
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

  return {
    userId: user.id,
    email: user.email ?? null,
    company: membership.companies as unknown as Company,
    role: (membership.role as "admin" | "staff") ?? "staff",
  };
}

/**
 * Full workspace (adds stores) for pages that render store pickers/filters.
 * Fetches stores in parallel with nothing else needed after the actor is known.
 */
export async function getWorkspace(): Promise<Workspace> {
  const supabase = await createClient();
  const actor = await getActor();
  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .eq("company_id", actor.company.id)
    .order("created_at", { ascending: true });

  return { ...actor, stores: (stores ?? []) as Store[] };
}
