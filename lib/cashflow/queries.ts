import type {
  MonthSummary,
  MonthSummaryEntry,
  Movement,
  YearSummary,
} from "@/lib/cashflow/types";
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

function emptyMonthSummary(month: number, year: number): MonthSummaryEntry {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return {
    month,
    monthKey,
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
  };
}

export async function listMovementsForRange(
  from: string,
  to: string,
): Promise<Movement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("movements")
    .select(
      "id, type, amount, occurred_on, description, created_at, category_id, movement_categories(name)",
    )
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapMovement(row as MovementRow));
}

export async function getRangeSummary(from: string, to: string): Promise<MonthSummary> {
  const movements = await listMovementsForRange(from, to);

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

export async function getYearMonthlySummaries(year: number): Promise<YearSummary> {
  const supabase = await createClient();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data, error } = await supabase
    .from("movements")
    .select("type, amount, occurred_on")
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  if (error) {
    throw new Error(error.message);
  }

  const months: MonthSummaryEntry[] = Array.from({ length: 12 }, (_, index) =>
    emptyMonthSummary(index + 1, year),
  );

  for (const row of data ?? []) {
    const month = Number(String(row.occurred_on).slice(5, 7));
    const entry = months[month - 1];
    const amount = Number(row.amount);

    if (row.type === "income") {
      entry.totalIncome += amount;
    } else {
      entry.totalExpense += amount;
    }
    entry.net = entry.totalIncome - entry.totalExpense;
  }

  const totalIncome = months.reduce((sum, m) => sum + m.totalIncome, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.totalExpense, 0);

  return {
    year,
    months,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}
