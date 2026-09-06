import { resolveSplitPersistence } from "@/lib/saldi/persist";
import type { MovementSplitInput } from "@/lib/saldi/types";
import type { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function persistSplitForMovement(
  supabase: Supabase,
  input: {
    movementId: string;
    familyId: string | null;
    type: "income" | "expense";
    isPrivate: boolean;
    amount: number;
    split: MovementSplitInput | undefined;
    currentMemberIds: string[];
  },
): Promise<ActionResult> {
  const resolved = resolveSplitPersistence({
    type: input.type,
    isPrivate: input.isPrivate,
    amount: input.amount,
    split: input.split,
  });

  if (resolved.action === "error") {
    return { ok: false, error: resolved.error };
  }

  if (resolved.action === "delete") {
    if (!input.familyId) {
      return { ok: true };
    }

    const { error } = await supabase
      .from("movement_payments")
      .delete()
      .eq("movement_id", input.movementId);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  if (!input.familyId) {
    return { ok: false, error: "Non appartieni a una famiglia." };
  }

  const memberSet = new Set(input.currentMemberIds);

  if (!memberSet.has(resolved.payerUserId)) {
    return { ok: false, error: "Chi ha pagato non è valido." };
  }

  for (const share of resolved.shares) {
    if (!memberSet.has(share.userId)) {
      return { ok: false, error: "Membro non valido." };
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("movement_payments")
    .select("id")
    .eq("movement_id", input.movementId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  let paymentId = existing?.id as string | undefined;

  if (paymentId) {
    const { error: updateError } = await supabase
      .from("movement_payments")
      .update({
        family_id: input.familyId,
        payer_user_id: resolved.payerUserId,
        split_mode: resolved.splitMode,
      })
      .eq("id", paymentId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    const { error: deleteSharesError } = await supabase
      .from("movement_payment_shares")
      .delete()
      .eq("payment_id", paymentId);

    if (deleteSharesError) {
      return { ok: false, error: deleteSharesError.message };
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("movement_payments")
      .insert({
        movement_id: input.movementId,
        family_id: input.familyId,
        payer_user_id: resolved.payerUserId,
        split_mode: resolved.splitMode,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { ok: false, error: insertError?.message ?? "Ripartizione non salvata." };
    }

    paymentId = inserted.id as string;
  }

  const { error: sharesError } = await supabase
    .from("movement_payment_shares")
    .insert(
      resolved.shares.map((share) => ({
        payment_id: paymentId,
        user_id: share.userId,
        amount: share.amount,
      })),
    );

  if (sharesError) {
    return { ok: false, error: sharesError.message };
  }

  return { ok: true };
}
