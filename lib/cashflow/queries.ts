import { monthDateBounds } from "@/lib/cashflow/month";
import type { MonthSummary, Movement } from "@/lib/cashflow/types";
import { createClient } from "@/lib/supabase/server";

function mapMovement(row: {
  id: string;
  type: string;
  amount: number | string;
  occurred_on: string;
  description: string;
  created_at: string;
}): Movement {
  return {
    id: row.id,
    type: row.type as Movement["type"],
    amount: Number(row.amount),
    occurred_on: row.occurred_on,
    description: row.description,
    created_at: row.created_at,
  };
}

export async function listMovementsForMonth(
  monthKey: string,
): Promise<Movement[]> {
  const supabase = await createClient();
  const { start, end } = monthDateBounds(monthKey);

  const { data, error } = await supabase
    .from("movements")
    .select("id, type, amount, occurred_on, description, created_at")
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMovement);
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
