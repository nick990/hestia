import type { FeaturedCategorySettings } from "@/lib/featured/types";
import { getCurrentUserFamily } from "@/lib/families/queries";
import { listMovementsForCategoryPrefix } from "@/lib/cashflow/queries";
import type { Movement } from "@/lib/cashflow/types";
import { createClient } from "@/lib/supabase/server";

type FeaturedSettingsRow = {
  family_id: string;
  category_name: string | null;
  budget: number | string | null;
  updated_at: string;
  updated_by: string | null;
};

function mapRow(row: FeaturedSettingsRow): FeaturedCategorySettings {
  return {
    family_id: row.family_id,
    category_name: row.category_name,
    budget: row.budget === null ? null : Number(row.budget),
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  };
}

export async function getFeaturedCategorySettings(): Promise<FeaturedCategorySettings | null> {
  const family = await getCurrentUserFamily();

  if (!family) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_featured_settings")
    .select("family_id, category_name, budget, updated_at, updated_by")
    .eq("family_id", family.family_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      family_id: family.family_id,
      category_name: null,
      budget: null,
      updated_at: new Date(0).toISOString(),
      updated_by: null,
    };
  }

  return mapRow(data as FeaturedSettingsRow);
}

export async function getFeaturedTabData(): Promise<{
  settings: FeaturedCategorySettings | null;
  movements: Movement[];
}> {
  const family = await getCurrentUserFamily();

  if (!family) {
    return { settings: null, movements: [] };
  }

  const settings = await getFeaturedCategorySettings();

  if (!settings || !settings.category_name) {
    return { settings, movements: [] };
  }

  const movements = await listMovementsForCategoryPrefix(settings.category_name);
  return { settings, movements };
}
