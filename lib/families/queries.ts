import type { FamilyMemberOption, FamilyMembership } from "@/lib/families/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function listFamilyMembersForViewer(): Promise<FamilyMemberOption[]> {
  const family = await getCurrentUserFamily();

  if (!family) {
    return [];
  }

  const supabase = await createClient();
  const { data: members, error: membersError } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", family.family_id);

  if (membersError) {
    throw new Error(membersError.message);
  }

  const userIds = (members ?? []).map((member) => member.user_id);

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email,
    ]),
  );

  return userIds
    .map((userId) => ({
      user_id: userId,
      display_name: profileById.get(userId) ?? "—",
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "it"));
}

export async function getCurrentUserFamily(): Promise<FamilyMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("family_members")
    .select("family_id, families(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const family = data.families as { name: string } | { name: string }[] | null;
  const familyName = Array.isArray(family) ? family[0]?.name : family?.name;

  if (!familyName) {
    return null;
  }

  return { family_id: data.family_id, family_name: familyName };
}

export async function getFamilyMemberCount(familyId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("family_members")
    .select("*", { count: "exact", head: true })
    .eq("family_id", familyId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
