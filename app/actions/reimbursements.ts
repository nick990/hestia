"use server";

import {
  getCurrentUserFamily,
  listFamilyMembersForViewer,
} from "@/lib/families/queries";
import { revalidateTabbedSections } from "@/lib/revalidate-tabbed";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

export async function createReimbursement(input: {
  fromUserId: string;
  toUserId: string;
  amount: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const family = await getCurrentUserFamily();

  if (!family) {
    return { ok: false, error: "Non appartieni a una famiglia." };
  }

  const amount = parseAmount(input.amount);

  if (amount === null) {
    return { ok: false, error: "Importo non valido." };
  }

  if (input.fromUserId === input.toUserId) {
    return {
      ok: false,
      error: "Chi dà e chi riceve devono essere persone diverse.",
    };
  }

  const memberIds = new Set(
    (await listFamilyMembersForViewer()).map((member) => member.user_id),
  );

  if (!memberIds.has(input.fromUserId) || !memberIds.has(input.toUserId)) {
    return { ok: false, error: "Membro non valido." };
  }

  const { error } = await supabase.from("reimbursements").insert({
    family_id: family.family_id,
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    amount,
    created_by: user.id,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTabbedSections();
  return { ok: true };
}

export async function deleteReimbursement(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const { error } = await supabase.from("reimbursements").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTabbedSections();
  return { ok: true };
}
