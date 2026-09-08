"use server";

import { isMockAuthEnabled } from "@/lib/auth/env";
import type { MemberRole } from "@/lib/auth/member";
import {
  ensureMemberAuthUser,
  fetchMockAuthCandidates,
  getMockAuthPassword,
  type MockAuthCandidate,
} from "@/lib/auth/mock-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  auth_user_id: string | null;
  disabled_at: string | null;
};

export async function listMockAuthCandidates(): Promise<MockAuthCandidate[] | null> {
  if (!isMockAuthEnabled()) {
    return null;
  }

  const admin = createAdminClient();
  return fetchMockAuthCandidates(admin);
}

export async function signInAsMember(
  memberId: string,
  next = "/",
): Promise<{ ok: false; error: string }> {
  if (!isMockAuthEnabled()) {
    return { ok: false, error: "Auth mock non disponibile." };
  }

  const password = getMockAuthPassword();
  if (!password) {
    return { ok: false, error: "Password mock non configurata." };
  }

  const admin = createAdminClient();
  const { data: member, error } = await admin
    .from("members")
    .select("id, email, full_name, role, auth_user_id, disabled_at")
    .eq("id", memberId)
    .maybeSingle<MemberRow>();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!member || member.disabled_at) {
    return { ok: false, error: "Utente non disponibile." };
  }

  try {
    await ensureMemberAuthUser(admin, member, password);
  } catch (provisionError) {
    const message =
      provisionError instanceof Error
        ? provisionError.message
        : "Provision utente fallita.";
    redirect(
      `/login?error=mock_auth_failed&reason=${encodeURIComponent(message)}`,
    );
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: member.email,
    password,
  });

  if (signInError) {
    redirect(
      `/login?error=mock_auth_failed&reason=${encodeURIComponent(signInError.message)}`,
    );
  }

  const safeNext = next.startsWith("/") ? next : "/";
  redirect(safeNext);
}
