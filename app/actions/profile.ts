"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTabbedSections } from "@/lib/revalidate-tabbed";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateProfilePaths() {
  revalidatePath("/settings/account");
  revalidatePath("/settings/families");
  revalidateTabbedSections();
}

function parseFullName(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed || trimmed.length > 100) {
    return null;
  }

  return trimmed;
}

export async function updateProfileName(fullName: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const parsed = parseFullName(fullName);

  if (!parsed) {
    return { ok: false, error: "Nome non valido." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProfilePaths();
  return { ok: true };
}
