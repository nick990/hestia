import { monthDateBounds } from "@/lib/cashflow/month";
import type { MonthSummary, Movement } from "@/lib/cashflow/types";
import { createClient } from "@/lib/supabase/server";

type MovementRow = {
  id: string;
  type: string;
  amount: number | string;
  occurred_on: string;
  description: string;
  created_at: string;
  category_id: string | null;
  movement_categories: { name: string } | { name: string }[] | null;
};

function mapMovement(row: MovementRow): Movement {
  const categoryRelation = row.movement_categories;
  const categoryName = Array.isArray(categoryRelation)
    ? (categoryRelation[0]?.name ?? null)
    : (categoryRelation?.name ?? null);

  return {
    id: row.id,
    type: row.type as Movement["type"],
    amount: Number(row.amount),
    occurred_on: row.occurred_on,
    description: row.description,
    created_at: row.created_at,
    category_id: row.category_id,
    category_name: categoryName,
  };
}

export async function listMovementsForMonth(
  monthKey: string,
): Promise<Movement[]> {
  const supabase = await createClient();
  const { start, end } = monthDateBounds(monthKey);

  const { data, error } = await supabase
    .from("movements")
    .select(
      "id, type, amount, occurred_on, description, created_at, category_id, movement_categories(name)",
    )
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapMovement(row as MovementRow));
}

export async function getMonthSummary(monthKey: string): Promise<MonthSummary> {
  const movements = await listMovementsForMonth(monthKey);

  const totalIncome = movements
    .filter((m) => m.type === "income")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExpense = movements
    .filter((m) => m.type === "expense")
    .reduce((sum, m) => sum + m.amount, 0);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}
