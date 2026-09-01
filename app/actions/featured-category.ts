"use server";

import { getCurrentUserFamily } from "@/lib/families/queries";
import { revalidateTabbedSections } from "@/lib/revalidate-tabbed";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateFeaturedPaths() {
  revalidatePath("/settings/categories");
  revalidateTabbedSections();
}

function parseBudget(raw: string): number | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

export async function updateFeaturedCategorySettings(input: {
  categoryId: string | null;
  budgetRaw: string;
}): Promise<ActionResult> {
  const family = await getCurrentUserFamily();

  if (!family) {
    return { ok: false, error: "Serve una famiglia per la categoria in evidenza." };
  }

  let categoryName: string | null = null;

  if (input.categoryId && input.categoryId !== "none") {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("movement_categories")
      .select("name")
      .eq("id", input.categoryId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: false, error: "Categoria non trovata." };
    }

    categoryName = data.name;
  }

  const budget = parseBudget(input.budgetRaw);

  if (input.budgetRaw.trim() && budget === null) {
    return { ok: false, error: "Limite di spesa non valido." };
  }

  if (budget !== null && budget <= 0) {
    return { ok: false, error: "Il limite di spesa deve essere maggiore di zero." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("family_featured_settings").upsert(
    {
      family_id: family.family_id,
      category_name: categoryName,
      budget,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    },
    { onConflict: "family_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateFeaturedPaths();
  return { ok: true };
}
