import type { MovementCategory, MovementCategoryOption } from "@/lib/categories/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function listCategoryOptions(): Promise<MovementCategoryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movement_categories")
    .select("id, name")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listCategoriesWithCounts(): Promise<MovementCategory[]> {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("movement_categories")
    .select("id, name, created_at")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  const admin = createAdminClient();

  const withCounts = await Promise.all(
    (categories ?? []).map(async (category) => {
      const { count, error: countError } = await admin
        .from("movements")
        .select("id", { count: "exact", head: true })
        .eq("category_id", category.id);

      if (countError) {
        throw new Error(countError.message);
      }

      return {
        ...category,
        movement_count: count ?? 0,
      };
    }),
  );

  return withCounts;
}
