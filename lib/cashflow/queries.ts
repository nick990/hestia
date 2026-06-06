import {
  applyShareToMovements,
  getEffectiveAmount,
  type FamilyShareOptions,
} from "@/lib/cashflow/share";
import type { CashflowView } from "@/lib/cashflow/view";
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
  scope: string;
  family_id: string | null;
  user_id: string;
  movement_categories: { name: string } | { name: string }[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

function mapMovement(
  row: MovementRow,
  authorNames: Map<string, string | null>,
): Movement {
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
    scope: row.scope as Movement["scope"],
    family_id: row.family_id,
    user_id: row.user_id,
    author_name: authorNames.get(row.user_id) ?? null,
  };
}

async function loadAuthorNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, string | null>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((profile: ProfileRow) => [
      profile.id,
      profile.full_name?.trim() || profile.email,
    ]),
  );
}

function applyViewFilter<
  T extends {
    eq(column: string, value: string): T;
  },
>(query: T, view: CashflowView): T {
  if (view === "family") {
    return query.eq("scope", "family");
  }

  if (view === "private") {
    return query.eq("scope", "private");
  }

  return query;
}

const DEFAULT_SHARE_OPTIONS: FamilyShareOptions = {
  shareEnabled: false,
  memberCount: 0,
  view: "all",
};

function resolveShareOptions(
  view: CashflowView,
  shareOptions?: Partial<FamilyShareOptions>,
): FamilyShareOptions {
  return {
    ...DEFAULT_SHARE_OPTIONS,
    view,
    ...shareOptions,
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
  view: CashflowView = "all",
  shareOptions?: Partial<FamilyShareOptions>,
): Promise<Movement[]> {
  const options = resolveShareOptions(view, shareOptions);
  const supabase = await createClient();

  let query = supabase
    .from("movements")
    .select(
      "id, type, amount, occurred_on, description, created_at, category_id, scope, family_id, user_id, movement_categories(name)",
    )
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  query = applyViewFilter(query, view);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as MovementRow[];
  const authorNames = await loadAuthorNames(
    supabase,
    [...new Set(rows.map((row) => row.user_id))],
  );

  const movements = rows.map((row) => mapMovement(row, authorNames));
  return applyShareToMovements(movements, options);
}

export async function getRangeSummary(
  from: string,
  to: string,
  view: CashflowView = "all",
  shareOptions?: Partial<FamilyShareOptions>,
): Promise<MonthSummary> {
  const movements = await listMovementsForRange(from, to, view, shareOptions);

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

export async function getYearMonthlySummaries(
  year: number,
  view: CashflowView = "all",
  shareOptions?: Partial<FamilyShareOptions>,
): Promise<YearSummary> {
  const options = resolveShareOptions(view, shareOptions);
  const supabase = await createClient();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  let query = supabase
    .from("movements")
    .select("type, amount, occurred_on, scope")
    .gte("occurred_on", from)
    .lte("occurred_on", to);

  query = applyViewFilter(query, view);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const months: MonthSummaryEntry[] = Array.from({ length: 12 }, (_, index) =>
    emptyMonthSummary(index + 1, year),
  );

  for (const row of data ?? []) {
    const month = Number(String(row.occurred_on).slice(5, 7));
    const entry = months[month - 1];
    const amount = getEffectiveAmount(
      { amount: Number(row.amount), scope: row.scope as Movement["scope"] },
      options,
    );

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
