"use server";

import type { MovementScope, MovementType } from "@/lib/cashflow/types";
import { getCurrentUserFamily } from "@/lib/families/queries";
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

  if (trimmed.length > 500) {
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

function parseCategoryId(raw: string | null | undefined): string | null {
  if (!raw || raw === "none") {
    return null;
  }

  return raw;
}

async function validateCategoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string | null,
): Promise<ActionResult | null> {
  if (!categoryId) {
    return null;
  }

  const { data, error } = await supabase
    .from("movement_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Categoria non valida." };
  }

  return null;
}

async function resolveMovementScope(
  sharedWithFamily: boolean | undefined,
): Promise<ActionResult | { scope: MovementScope; family_id: string | null }> {
  if (!sharedWithFamily) {
    return { scope: "personal", family_id: null };
  }

  const membership = await getCurrentUserFamily();

  if (!membership) {
    return { ok: false, error: "Non appartieni a una famiglia." };
  }

  return { scope: "family", family_id: membership.family_id };
}

export async function createMovement(input: {
  type: string;
  amount: string;
  occurredOn: string;
  description: string;
  categoryId?: string | null;
  sharedWithFamily?: boolean;
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

  if (description === null) {
    return { ok: false, error: "Descrizione troppo lunga." };
  }

  const category_id = parseCategoryId(input.categoryId);
  const categoryError = await validateCategoryId(supabase, category_id);

  if (categoryError) {
    return categoryError;
  }

  const scopeResult = await resolveMovementScope(input.sharedWithFamily);

  if ("ok" in scopeResult) {
    return scopeResult;
  }

  const { scope, family_id } = scopeResult;

  const { error } = await supabase.from("movements").insert({
    user_id: user.id,
    type,
    amount,
    occurred_on,
    description,
    category_id,
    scope,
    family_id,
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
    categoryId?: string | null;
    sharedWithFamily?: boolean;
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

  if (description === null) {
    return { ok: false, error: "Descrizione troppo lunga." };
  }

  const category_id = parseCategoryId(input.categoryId);
  const categoryError = await validateCategoryId(supabase, category_id);

  if (categoryError) {
    return categoryError;
  }

  const scopeResult = await resolveMovementScope(input.sharedWithFamily);

  if ("ok" in scopeResult) {
    return scopeResult;
  }

  const { scope, family_id } = scopeResult;

  const { error } = await supabase
    .from("movements")
    .update({ type, amount, occurred_on, description, category_id, scope, family_id })
    .eq("id", id);

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

  const { error } = await supabase.from("movements").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateCashflow();
  return { ok: true };
}
