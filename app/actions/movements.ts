"use server";

import type { AssigneeKind } from "@/lib/cashflow/types";
import {
  canSetPrivate,
  isPrivateChangeAllowed,
} from "@/lib/cashflow/movement-visibility";
import { getCurrentUserFamily } from "@/lib/families/queries";
import { revalidateTabbedSections } from "@/lib/revalidate-tabbed";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateCashflow() {
  revalidateTabbedSections();
}

function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function parseType(raw: string): "income" | "expense" | null {
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

async function resolveAssignee(
  userId: string,
  input: {
    isFamily: boolean;
    assigneeUserId?: string;
    isPrivate?: boolean;
  },
): Promise<
  ActionResult | {
    assignee_kind: AssigneeKind;
    assignee_user_id: string | null;
    is_private: boolean;
  }
> {
  const family = await getCurrentUserFamily();

  if (input.isFamily) {
    if (!family) {
      return { ok: false, error: "Non appartieni a una famiglia." };
    }

    return {
      assignee_kind: "family",
      assignee_user_id: null,
      is_private: false,
    };
  }

  const assigneeUserId = input.assigneeUserId ?? userId;

  if (!family) {
    if (assigneeUserId !== userId) {
      return { ok: false, error: "Assegnatario non valido." };
    }

    return {
      assignee_kind: "member",
      assignee_user_id: userId,
      is_private: input.isPrivate === true,
    };
  }

  const supabase = await createClient();
  const { data: member, error } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", family.family_id)
    .eq("user_id", assigneeUserId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!member) {
    return { ok: false, error: "Assegnatario non valido." };
  }

  const isPrivate = input.isPrivate === true;

  if (isPrivate && !canSetPrivate(assigneeUserId, userId)) {
    return {
      assignee_kind: "member",
      assignee_user_id: assigneeUserId,
      is_private: false,
    };
  }

  return {
    assignee_kind: "member",
    assignee_user_id: assigneeUserId,
    is_private: isPrivate && canSetPrivate(assigneeUserId, userId),
  };
}

export async function createMovement(input: {
  type: string;
  amount: string;
  occurredOn: string;
  description: string;
  categoryId?: string | null;
  isFamily?: boolean;
  assigneeUserId?: string;
  isPrivate?: boolean;
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

  const family = await getCurrentUserFamily();
  const isFamilyDefault = type === "expense" && Boolean(family);
  const isFamily = input.isFamily ?? isFamilyDefault;

  const assigneeResult = await resolveAssignee(user.id, {
    isFamily,
    assigneeUserId: input.assigneeUserId ?? user.id,
    isPrivate: input.isPrivate,
  });

  if ("ok" in assigneeResult) {
    return assigneeResult;
  }

  const { assignee_kind, assignee_user_id, is_private } = assigneeResult;

  const { error } = await supabase.from("movements").insert({
    created_by: user.id,
    type,
    amount,
    occurred_on,
    description,
    category_id,
    assignee_kind,
    assignee_user_id,
    is_private,
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
    isFamily?: boolean;
    assigneeUserId?: string;
    isPrivate?: boolean;
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

  const { data: existing, error: fetchError } = await supabase
    .from("movements")
    .select("assignee_kind, assignee_user_id, is_private")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  if (!existing) {
    return { ok: false, error: "Movimento non trovato." };
  }

  const assigneeResult = await resolveAssignee(user.id, {
    isFamily: input.isFamily ?? existing.assignee_kind === "family",
    assigneeUserId:
      input.assigneeUserId ?? existing.assignee_user_id ?? user.id,
    isPrivate: input.isPrivate,
  });

  if ("ok" in assigneeResult) {
    return assigneeResult;
  }

  const nextAssignee = assigneeResult;

  if (
    !isPrivateChangeAllowed(
      nextAssignee.assignee_user_id,
      user.id,
      {
        assignee_kind: existing.assignee_kind as AssigneeKind,
        assignee_user_id: existing.assignee_user_id,
        is_private: existing.is_private,
      },
      nextAssignee,
    )
  ) {
    return {
      ok: false,
      error: "Solo l'assegnatario può cambiare il flag privato.",
    };
  }

  const { error } = await supabase
    .from("movements")
    .update({
      type,
      amount,
      occurred_on,
      description,
      category_id,
      assignee_kind: nextAssignee.assignee_kind,
      assignee_user_id: nextAssignee.assignee_user_id,
      is_private: nextAssignee.is_private,
    })
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
