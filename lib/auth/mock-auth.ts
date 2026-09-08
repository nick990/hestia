import type { MemberRole } from "@/lib/auth/member";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MockAuthCandidate = {
  id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  has_auth_user: boolean;
};

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  auth_user_id: string | null;
};

export function getMockAuthPassword(): string | null {
  const password = process.env.MOCK_AUTH_PASSWORD;
  return password ? password : null;
}

export function toMockAuthCandidate(row: MemberRow): MockAuthCandidate {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    has_auth_user: Boolean(row.auth_user_id),
  };
}

export async function fetchMockAuthCandidates(
  admin: SupabaseClient,
): Promise<MockAuthCandidate[]> {
  const { data, error } = await admin
    .from("members")
    .select("id, email, full_name, role, auth_user_id")
    .is("disabled_at", null)
    .order("email", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toMockAuthCandidate(row as MemberRow));
}

export async function ensureMemberAuthUser(
  admin: SupabaseClient,
  member: MemberRow,
  password: string,
): Promise<string> {
  if (member.auth_user_id) {
    const { error: updateError } = await admin.auth.admin.updateUserById(
      member.auth_user_id,
      { password, email_confirm: true },
    );
    if (updateError) {
      throw new Error(updateError.message);
    }
    return member.auth_user_id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: member.email,
    password,
    email_confirm: true,
    user_metadata: member.full_name
      ? { full_name: member.full_name, name: member.full_name }
      : undefined,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Creazione utente mock fallita.");
  }

  const { data: linked, error: linkError } = await admin
    .from("members")
    .select("auth_user_id")
    .eq("id", member.id)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }

  const authUserId = linked?.auth_user_id ?? data.user.id;
  if (!authUserId) {
    throw new Error("Collegamento member ↔ auth user fallito.");
  }

  return authUserId;
}
