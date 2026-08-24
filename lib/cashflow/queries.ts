import {
  applyAssigneeFilters,
  summarizeFilteredMovements,
  type AssigneeFiltersState,
} from "@/lib/cashflow/assignee-filters";
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
  created_by: string;
  assignee_kind: string;
  assignee_user_id: string | null;
  is_private: boolean;
  movement_categories: { name: string } | { name: string }[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
};

function displayName(profile: ProfileRow | undefined): string | null {
  if (!profile) {
    return null;
  }

  return profile.full_name?.trim() || profile.email;
}

function mapMovement(
  row: MovementRow,
  profiles: Map<string, ProfileRow>,
): Movement {
  const categoryRelation = row.movement_categories;
  const categoryName = Array.isArray(categoryRelation)
    ? (categoryRelation[0]?.name ?? null)
    : (categoryRelation?.name ?? null);

  const assigneeProfile =
    row.assignee_kind === "member" && row.assignee_user_id
      ? profiles.get(row.assignee_user_id)
      : undefined;

  return {
    id: row.id,
    type: row.type as Movement["type"],
    amount: Number(row.amount),
    occurred_on: row.occurred_on,
    description: row.description,
    created_at: row.created_at,
    category_id: row.category_id,
    category_name: categoryName,
    created_by: row.created_by,
    assignee_kind: row.assignee_kind as Movement["assignee_kind"],
    assignee_user_id: row.assignee_user_id,
    is_private: row.is_private,
    creator_name: displayName(profiles.get(row.created_by)),
    assignee_name:
      row.assignee_kind === "family"
        ? "Famiglia"
        : displayName(assigneeProfile),
  };
}

async function loadProfileNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, ProfileRow>> {
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

  return new Map((data ?? []).map((profile: ProfileRow) => [profile.id, profile]));
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

async function listRawMovementsForRange(
  from: string,
  to: string,
): Promise<Movement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("movements")
    .select(
      "id, type, amount, occurred_on, description, created_at, category_id, created_by, assignee_kind, assignee_user_id, is_private, movement_categories(name)",
    )
    .gte("occurred_on", from)
    .lte("occurred_on", to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as MovementRow[];
  const userIds = [
    ...new Set(
      rows.flatMap((row) =>
        [row.created_by, row.assignee_user_id].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ),
  ];
  const profiles = await loadProfileNames(supabase, userIds);

  return rows.map((row) => mapMovement(row, profiles));
}

export async function listMovementsForRange(
  from: string,
  to: string,
  filters: AssigneeFiltersState,
  currentUserId: string,
): Promise<Movement[]> {
  const movements = await listRawMovementsForRange(from, to);
  return applyAssigneeFilters(movements, filters, currentUserId);
}

export async function getRangeSummary(
  from: string,
  to: string,
  filters: AssigneeFiltersState,
  currentUserId: string,
): Promise<MonthSummary> {
  const movements = await listMovementsForRange(
    from,
    to,
    filters,
    currentUserId,
  );
  return summarizeFilteredMovements(movements);
}

export async function getYearMonthlySummaries(
  year: number,
  filters: AssigneeFiltersState,
  currentUserId: string,
): Promise<YearSummary> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const movements = await listMovementsForRange(
    from,
    to,
    filters,
    currentUserId,
  );

  const months: MonthSummaryEntry[] = Array.from({ length: 12 }, (_, index) =>
    emptyMonthSummary(index + 1, year),
  );

  for (const movement of movements) {
    const month = Number(movement.occurred_on.slice(5, 7));
    const entry = months[month - 1];

    if (movement.type === "income") {
      entry.totalIncome += movement.amount;
    } else {
      entry.totalExpense += movement.amount;
    }

    entry.net = entry.totalIncome - entry.totalExpense;
  }

  const totalIncome = months.reduce((sum, month) => sum + month.totalIncome, 0);
  const totalExpense = months.reduce(
    (sum, month) => sum + month.totalExpense,
    0,
  );

  return {
    year,
    months,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}

export async function listAllMovementsForRange(
  from: string,
  to: string,
): Promise<Movement[]> {
  return listRawMovementsForRange(from, to);
}
