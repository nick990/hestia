import type {
  Movement,
  MovementType,
  MonthSummary,
  MonthSummaryEntry,
  YearSummary,
} from "@/lib/cashflow/types";

export const ASSIGNEE_FILTERS_STORAGE_KEY = "hestia:cashflow:filters:v1";

export type TypeFilterState = {
  family: boolean;
  members: Record<string, boolean>;
  showPrivate: boolean;
};

export type AssigneeFiltersState = {
  income: TypeFilterState;
  expense: TypeFilterState;
};

type FamilyMemberRef = {
  user_id: string;
};

type StorageAdapter = Pick<Storage, "getItem" | "setItem">;

function memberSelection(
  members: FamilyMemberRef[],
  stored?: Record<string, boolean>,
): Record<string, boolean> {
  const selection: Record<string, boolean> = {};

  for (const member of members) {
    selection[member.user_id] = stored?.[member.user_id] ?? true;
  }

  return selection;
}

export function createDefaultFilters(
  members: FamilyMemberRef[],
  _currentUserId?: string,
): AssigneeFiltersState {
  const membersSelected = memberSelection(members);

  return {
    income: {
      family: true,
      members: { ...membersSelected },
      showPrivate: true,
    },
    expense: {
      family: true,
      members: { ...membersSelected },
      showPrivate: true,
    },
  };
}

export function serializeFilters(filters: AssigneeFiltersState): string {
  return JSON.stringify(filters);
}

export function parseStoredFilters(
  raw: string | null | undefined,
  members: FamilyMemberRef[],
  currentUserId: string,
): AssigneeFiltersState {
  const defaults = createDefaultFilters(members, currentUserId);

  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AssigneeFiltersState>;

    return {
      income: {
        family: parsed.income?.family ?? defaults.income.family,
        members: memberSelection(members, parsed.income?.members),
        showPrivate: parsed.income?.showPrivate ?? defaults.income.showPrivate,
      },
      expense: {
        family: parsed.expense?.family ?? defaults.expense.family,
        members: memberSelection(members, parsed.expense?.members),
        showPrivate:
          parsed.expense?.showPrivate ?? defaults.expense.showPrivate,
      },
    };
  } catch {
    return defaults;
  }
}

export function loadFilters(
  members: FamilyMemberRef[],
  currentUserId: string,
  storage?: StorageAdapter,
): AssigneeFiltersState {
  if (!storage) {
    return createDefaultFilters(members, currentUserId);
  }

  return parseStoredFilters(
    storage.getItem(ASSIGNEE_FILTERS_STORAGE_KEY),
    members,
    currentUserId,
  );
}

export function saveFilters(
  filters: AssigneeFiltersState,
  storage: StorageAdapter,
): void {
  storage.setItem(ASSIGNEE_FILTERS_STORAGE_KEY, serializeFilters(filters));
}

function typeFilterForMovement(
  movement: Movement,
  filters: AssigneeFiltersState,
): TypeFilterState {
  return movement.type === "income" ? filters.income : filters.expense;
}

export function movementMatchesTypeFilter(
  movement: Movement,
  typeFilter: TypeFilterState,
  currentUserId: string,
): boolean {
  if (movement.is_private) {
    if (movement.assignee_user_id !== currentUserId) {
      return false;
    }

    if (!typeFilter.members[currentUserId]) {
      return false;
    }

    return typeFilter.showPrivate;
  }

  if (movement.assignee_kind === "family") {
    return typeFilter.family;
  }

  const assigneeId = movement.assignee_user_id;

  if (!assigneeId) {
    return false;
  }

  return typeFilter.members[assigneeId] ?? false;
}

export function applyAssigneeFilters(
  movements: Movement[],
  filters: AssigneeFiltersState,
  currentUserId: string,
): Movement[] {
  return movements.filter((movement) =>
    movementMatchesTypeFilter(
      movement,
      typeFilterForMovement(movement, filters),
      currentUserId,
    ),
  );
}

export function summarizeFilteredMovements(
  movements: Movement[],
): MonthSummary {
  const totalIncome = movements
    .filter((movement) => movement.type === "income")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const totalExpense = movements
    .filter((movement) => movement.type === "expense")
    .reduce((sum, movement) => sum + movement.amount, 0);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
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

export function buildYearSummaryFromMovements(
  year: number,
  movements: Movement[],
): YearSummary {
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

export function movementTypeLabel(type: MovementType): string {
  return type === "income" ? "Entrata" : "Uscita";
}

export function assigneeDisplayName(movement: Movement): string {
  if (movement.assignee_kind === "family") {
    return "Famiglia";
  }

  return movement.assignee_name ?? "—";
}
