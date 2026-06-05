import type { FamilyMembership } from "@/lib/families/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserFamily(): Promise<FamilyMembership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id, families(name)")
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
