"use server";

import { requireAdmin } from "@/lib/auth/member";
import { missingCategoryPrefixes } from "@/lib/categories/prefixes";
import { planPrefixRename } from "@/lib/categories/rename";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateCategoryPaths() {
  revalidatePath("/settings/categories");
  revalidatePath("/cashflow");
}

function parseName(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed || trimmed.length > 100) {
    return null;
  }

  return trimmed;
}

function mapDuplicateNameError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Esiste già una categoria con questo nome.";
  }

  return error.message;
}

export async function createCategory(name: string): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseName(name);

  if (!parsed) {
    return { ok: false, error: "Nome non valido." };
  }

  const admin = createAdminClient();
  const { data: existing, error: listError } = await admin
    .from("movement_categories")
    .select("name");

  if (listError) {
    return { ok: false, error: listError.message };
  }

  const prefixes = missingCategoryPrefixes([
    ...(existing ?? []).map((row) => row.name),
    parsed,
  ]);
  const { error } = await admin
    .from("movement_categories")
    .insert([...prefixes.map((name) => ({ name })), { name: parsed }]);

  if (error) {
    return { ok: false, error: mapDuplicateNameError(error) };
  }

  revalidateCategoryPaths();
  return { ok: true };
}

async function applyPrefixRename(
  fromPrefix: string,
  toPrefix: string,
): Promise<ActionResult> {
  const admin = createAdminClient();
  const { data, error: listError } = await admin
    .from("movement_categories")
    .select("id, name");

  if (listError) {
    return { ok: false, error: listError.message };
  }

  const plan = planPrefixRename(data ?? [], fromPrefix, toPrefix);

  if (!plan.ok) {
    return plan;
  }

  for (const update of plan.updates) {
    const { error } = await admin
      .from("movement_categories")
      .update({ name: update.name })
      .eq("id", update.id);

    if (error) {
      return { ok: false, error: mapDuplicateNameError(error) };
    }
  }

  const nextNames = (data ?? []).map((row) => {
    const update = plan.updates.find((item) => item.id === row.id);
    return update?.name ?? row.name;
  });
  const prefixes = missingCategoryPrefixes(nextNames);

  if (prefixes.length > 0) {
    const { error } = await admin
      .from("movement_categories")
      .insert(prefixes.map((name) => ({ name })));

    if (error) {
      return { ok: false, error: mapDuplicateNameError(error) };
    }
  }

  revalidateCategoryPaths();
  return { ok: true };
}

export async function updateCategory(
  id: string,
  name: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseName(name);

  if (!parsed) {
    return { ok: false, error: "Nome non valido." };
  }

  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin
    .from("movement_categories")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return { ok: false, error: currentError.message };
  }

  if (!current) {
    return { ok: false, error: "Categoria non trovata." };
  }

  return applyPrefixRename(current.name, parsed);
}

export async function renameCategoryPrefix(
  fromPrefix: string,
  toPrefix: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseName(toPrefix);

  if (!parsed) {
    return { ok: false, error: "Nome non valido." };
  }

  return applyPrefixRename(fromPrefix, parsed);
}

export async function deleteCategory(
  id: string,
  reassignToId: string | null,
): Promise<ActionResult> {
  await requireAdmin();

  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("movements")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    return { ok: false, error: countError.message };
  }

  const usageCount = count ?? 0;

  if (usageCount > 0) {
    if (!reassignToId || reassignToId === id) {
      return {
        ok: false,
        error: "Seleziona una categoria di destinazione diversa.",
      };
    }

    const { data: destination, error: destError } = await admin
      .from("movement_categories")
      .select("id")
      .eq("id", reassignToId)
      .maybeSingle();

    if (destError) {
      return { ok: false, error: destError.message };
    }

    if (!destination) {
      return { ok: false, error: "Categoria di destinazione non trovata." };
    }

    const { error: reassignError } = await admin
      .from("movements")
      .update({ category_id: reassignToId })
      .eq("category_id", id);

    if (reassignError) {
      return { ok: false, error: reassignError.message };
    }
  }

  const { error: deleteError } = await admin
    .from("movement_categories")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidateCategoryPaths();
  return { ok: true };
}
