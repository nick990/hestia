import type { FamilyMembership } from "@/lib/families/types";
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
