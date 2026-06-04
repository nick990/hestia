"use server";

import type { MovementType } from "@/lib/cashflow/types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateCashflow() {
  revalidatePath("/cashflow");
}

function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function parseType(raw: string): MovementType | null {
  if (raw === "income" || raw === "expense") {
    return raw;
  }

  return null;
}

function parseDescription(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed || trimmed.length > 500) {
    return null;
  }

  return trimmed;
}

function parseOccurredOn(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }

  return raw;
}

export async function createMovement(input: {
  type: string;
  amount: string;
  occurredOn: string;
  description: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const type = parseType(input.type);
  const amount = parseAmount(input.amount);
  const occurred_on = parseOccurredOn(input.occurredOn);
  const description = parseDescription(input.description);

  if (!type) {
    return { ok: false, error: "Seleziona entrata o uscita." };
  }

  if (amount === null) {
    return { ok: false, error: "Importo non valido." };
  }

  if (!occurred_on) {
    return { ok: false, error: "Data non valida." };
  }

  if (!description) {
    return { ok: false, error: "La descrizione è obbligatoria." };
  }

  const { error } = await supabase.from("movements").insert({
    user_id: user.id,
    type,
    amount,
    occurred_on,
    description,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateCashflow();
  return { ok: true };
}

export async function updateMovement(
  id: string,
  input: {
    type: string;
    amount: string;
    occurredOn: string;
    description: string;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const type = parseType(input.type);
  const amount = parseAmount(input.amount);
  const occurred_on = parseOccurredOn(input.occurredOn);
  const description = parseDescription(input.description);

  if (!type) {
    return { ok: false, error: "Seleziona entrata o uscita." };
  }

  if (amount === null) {
    return { ok: false, error: "Importo non valido." };
  }

  if (!occurred_on) {
    return { ok: false, error: "Data non valida." };
  }

  if (!description) {
    return { ok: false, error: "La descrizione è obbligatoria." };
  }

  const { error } = await supabase
    .from("movements")
    .update({ type, amount, occurred_on, description })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateCashflow();
  return { ok: true };
}

export async function deleteMovement(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const { error } = await supabase
    .from("movements")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateCashflow();
  return { ok: true };
}
