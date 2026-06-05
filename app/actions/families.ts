"use server";

import type {
  AssignableMember,
  FamilyWithMembers,
} from "@/lib/families/types";
import { requireAdmin } from "@/lib/auth/member";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateFamilies() {
  revalidatePath("/settings/families");
  revalidatePath("/cashflow");
}

function parseFamilyName(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 100) {
    return null;
  }

  return trimmed;
}

export async function listFamiliesForAdmin(): Promise<FamilyWithMembers[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: families, error } = await admin
    .from("families")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const { data: members, error: membersError } = await admin
    .from("family_members")
    .select("family_id, user_id, joined_at");

  if (membersError) {
    throw new Error(membersError.message);
  }

  const userIds = [...new Set((members ?? []).map((member) => member.user_id))];
  let profiles = new Map<string, { full_name: string | null; email: string }>();

  if (userIds.length > 0) {
    const { data: profileRows, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    profiles = new Map(
      (profileRows ?? []).map((profile) => [
        profile.id,
        { full_name: profile.full_name, email: profile.email },
      ]),
    );
  }

  const membersByFamily = new Map<string, FamilyWithMembers["members"]>();

  for (const member of members ?? []) {
    const profile = profiles.get(member.user_id);
    const row = {
      user_id: member.user_id,
      email: profile?.email ?? "—",
      full_name: profile?.full_name ?? null,
      joined_at: member.joined_at,
    };
    const existing = membersByFamily.get(member.family_id) ?? [];
    existing.push(row);
    membersByFamily.set(member.family_id, existing);
  }

  return (families ?? []).map((family) => ({
    ...family,
    members: membersByFamily.get(family.id) ?? [],
  }));
}

export async function listAssignableMembers(): Promise<AssignableMember[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: members, error } = await admin
    .from("members")
    .select("email, auth_user_id, full_name")
    .not("auth_user_id", "is", null)
    .is("disabled_at", null)
    .order("email", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const authUserIds = (members ?? [])
    .map((member) => member.auth_user_id)
    .filter((id): id is string => Boolean(id));

  let familyByUser = new Map<string, { family_id: string; family_name: string }>();

  if (authUserIds.length > 0) {
    const { data: familyMembers, error: familyMembersError } = await admin
      .from("family_members")
      .select("user_id, family_id, families(name)")
      .in("user_id", authUserIds);

    if (familyMembersError) {
      throw new Error(familyMembersError.message);
    }

    for (const row of familyMembers ?? []) {
      const family = row.families as { name: string } | { name: string }[] | null;
      const familyName = Array.isArray(family) ? family[0]?.name : family?.name;
      if (familyName) {
        familyByUser.set(row.user_id, {
          family_id: row.family_id,
          family_name: familyName,
        });
      }
    }
  }

  const profileNames = new Map<string, string | null>();

  if (authUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", authUserIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      profileNames.set(profile.id, profile.full_name);
    }
  }

  return (members ?? [])
    .filter((member): member is typeof member & { auth_user_id: string } =>
      Boolean(member.auth_user_id),
    )
    .map((member) => {
      const family = familyByUser.get(member.auth_user_id);
      return {
        auth_user_id: member.auth_user_id,
        email: member.email,
        full_name: member.full_name ?? profileNames.get(member.auth_user_id) ?? null,
        family_id: family?.family_id ?? null,
        family_name: family?.family_name ?? null,
      };
    });
}

export async function createFamily(name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsedName = parseFamilyName(name);

  if (!parsedName) {
    return { ok: false, error: "Nome famiglia non valido." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("families").insert({ name: parsedName });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateFamilies();
  return { ok: true };
}

export async function addFamilyMember(
  familyId: string,
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing) {
    return { ok: false, error: "L'utente appartiene già a una famiglia." };
  }

  const { error } = await admin.from("family_members").insert({
    family_id: familyId,
    user_id: userId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateFamilies();
  return { ok: true };
}

export async function removeFamilyMember(
  familyId: string,
  userId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("family_members")
    .delete()
    .eq("family_id", familyId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateFamilies();
  return { ok: true };
}
