"use server";

import {
  countActiveAdmins,
  normalizeEmail,
  requireAdmin,
  type MemberListItem,
  type MemberRole,
} from "@/lib/auth/member";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateUsers() {
  revalidatePath("/users");
}

async function getMemberById(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("members")
    .select("id, email, auth_user_id, full_name, role, disabled_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function guardLastAdmin(
  targetId: string,
  targetRole: MemberRole,
  targetDisabledAt: string | null,
) {
  if (targetRole !== "admin" || targetDisabledAt) {
    return null;
  }

  const otherAdmins = await countActiveAdmins(targetId);

  if (otherAdmins === 0) {
    return "Non puoi rimuovere o disabilitare l'ultimo amministratore.";
  }

  return null;
}

export async function listMembers(): Promise<MemberListItem[]> {
  await requireAdmin();

  const admin = createAdminClient();
  const { data: members, error } = await admin
    .from("members")
    .select(
      "id, email, auth_user_id, full_name, role, disabled_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const authUserIds = (members ?? [])
    .map((member) => member.auth_user_id)
    .filter((id): id is string => Boolean(id));

  let profileNames = new Map<string, string | null>();

  if (authUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", authUserIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profileNames = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
    );
  }

  return (members ?? []).map((member) => ({
    ...member,
    role: member.role as MemberRole,
    profile_full_name: member.auth_user_id
      ? (profileNames.get(member.auth_user_id) ?? null)
      : null,
  }));
}

export async function addMember(
  email: string,
  role: MemberRole,
): Promise<ActionResult> {
  await requireAdmin();

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, error: "Inserisci un indirizzo email valido." };
  }

  if (role !== "admin" && role !== "user") {
    return { ok: false, error: "Ruolo non valido." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("members").insert({
    email: normalizedEmail,
    role,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Email già registrata." };
    }

    return { ok: false, error: error.message };
  }

  revalidateUsers();
  return { ok: true };
}

export async function updateMemberRole(
  id: string,
  role: MemberRole,
): Promise<ActionResult> {
  const currentAdmin = await requireAdmin();

  if (role !== "admin" && role !== "user") {
    return { ok: false, error: "Ruolo non valido." };
  }

  const target = await getMemberById(id);

  if (!target) {
    return { ok: false, error: "Utente non trovato." };
  }

  if (target.role === "admin" && role === "user") {
    const guardError = await guardLastAdmin(
      target.id,
      target.role as MemberRole,
      target.disabled_at,
    );

    if (guardError) {
      return { ok: false, error: guardError };
    }

    if (target.auth_user_id === currentAdmin.auth_user_id) {
      return {
        ok: false,
        error: "Non puoi degradare te stesso se sei l'unico amministratore.",
      };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("members").update({ role }).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateUsers();
  return { ok: true };
}

export async function disableMember(id: string): Promise<ActionResult> {
  await requireAdmin();

  const target = await getMemberById(id);

  if (!target) {
    return { ok: false, error: "Utente non trovato." };
  }

  if (target.disabled_at) {
    return { ok: false, error: "Utente già disabilitato." };
  }

  const guardError = await guardLastAdmin(
    target.id,
    target.role as MemberRole,
    target.disabled_at,
  );

  if (guardError) {
    return { ok: false, error: guardError };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateUsers();
  return { ok: true };
}

export async function enableMember(id: string): Promise<ActionResult> {
  await requireAdmin();

  const target = await getMemberById(id);

  if (!target) {
    return { ok: false, error: "Utente non trovato." };
  }

  if (!target.disabled_at) {
    return { ok: false, error: "Utente già attivo." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({ disabled_at: null })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateUsers();
  return { ok: true };
}
