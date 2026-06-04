import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type MemberRole = "admin" | "user";

export type MemberRecord = {
  id: string;
  email: string;
  auth_user_id: string | null;
  full_name: string | null;
  role: MemberRole;
  disabled_at: string | null;
  created_at: string;
};

export type MemberListItem = MemberRecord & {
  profile_full_name: string | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getCurrentMember(): Promise<MemberRecord | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("members")
    .select(
      "id, email, auth_user_id, full_name, role, disabled_at, created_at",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as MemberRecord | null;
}

export async function requireAdmin(): Promise<MemberRecord> {
  const member = await getCurrentMember();

  if (!member || member.role !== "admin" || member.disabled_at) {
    redirect("/dashboard");
  }

  return member;
}

export async function countActiveAdmins(excludeId?: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  let query = admin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .is("disabled_at", null);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function countAdmins(excludeId?: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  let query = admin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
