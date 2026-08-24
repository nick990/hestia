import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  applyAssigneeFilters,
  createDefaultFilters,
  loadFilters,
  movementMatchesTypeFilter,
  parseStoredFilters,
  saveFilters,
  serializeFilters,
  summarizeFilteredMovements,
  ASSIGNEE_FILTERS_STORAGE_KEY,
} from "@/lib/cashflow/assignee-filters";

const members = [
  { user_id: "u1", display_name: "Nic" },
  { user_id: "u2", display_name: "Sara" },
];

function movement(
  overrides: Partial<Movement> & Pick<Movement, "type">,
): Movement {
  return {
    id: "m1",
    amount: 100,
    occurred_on: "2026-01-01",
    description: "",
    created_at: "2026-01-01T00:00:00Z",
    category_id: null,
    category_name: null,
    created_by: "u1",
    assignee_kind: "family",
    assignee_user_id: null,
    is_private: false,
    creator_name: "Nic",
    assignee_name: "Famiglia",
    ...overrides,
  };
}

describe("createDefaultFilters", () => {
  it("selects family and all members with showPrivate true", () => {
    const filters = createDefaultFilters(members, "u1");
    expect(filters.income.family).toBe(true);
    expect(filters.expense.family).toBe(true);
    expect(filters.income.members.u1).toBe(true);
    expect(filters.income.members.u2).toBe(true);
    expect(filters.income.showPrivate).toBe(true);
    expect(filters.expense.showPrivate).toBe(true);
  });
});

describe("movementMatchesTypeFilter", () => {
  const defaults = createDefaultFilters(members, "u1");

  it("matches family movement when family is selected", () => {
    const m = movement({ type: "expense", assignee_kind: "family" });
    expect(movementMatchesTypeFilter(m, defaults.expense, "u1")).toBe(true);
  });

  it("does not match family movement when family is deselected", () => {
    const filters = {
      ...defaults.expense,
      family: false,
    };
    const m = movement({ type: "expense", assignee_kind: "family" });
    expect(movementMatchesTypeFilter(m, filters, "u1")).toBe(false);
  });

  it("matches member movement when member checkbox is on", () => {
    const m = movement({
      type: "income",
      assignee_kind: "member",
      assignee_user_id: "u2",
      assignee_name: "Sara",
    });
    expect(movementMatchesTypeFilter(m, defaults.income, "u1")).toBe(true);
  });

  it("does not match member movement when member checkbox is off", () => {
    const filters = {
      ...defaults.income,
      members: { u1: true, u2: false },
    };
    const m = movement({
      type: "income",
      assignee_kind: "member",
      assignee_user_id: "u2",
    });
    expect(movementMatchesTypeFilter(m, filters, "u1")).toBe(false);
  });

  it("hides private movement when showPrivate is off for self", () => {
    const filters = {
      ...defaults.expense,
      showPrivate: false,
    };
    const m = movement({
      type: "expense",
      assignee_kind: "member",
      assignee_user_id: "u1",
      is_private: true,
    });
    expect(movementMatchesTypeFilter(m, filters, "u1")).toBe(false);
  });

  it("shows private movement when showPrivate is on for self", () => {
    const m = movement({
      type: "expense",
      assignee_kind: "member",
      assignee_user_id: "u1",
      is_private: true,
    });
    expect(
      movementMatchesTypeFilter(m, defaults.expense, "u1"),
    ).toBe(true);
  });

  it("never matches private movement for non-assignee viewer", () => {
    const m = movement({
      type: "expense",
      assignee_kind: "member",
      assignee_user_id: "u1",
      is_private: true,
    });
    expect(
      movementMatchesTypeFilter(m, defaults.expense, "u2"),
    ).toBe(false);
  });

  it("returns false when no filter is selected", () => {
    const filters = {
      family: false,
      members: { u1: false, u2: false },
      showPrivate: true,
    };
    const m = movement({ type: "expense" });
    expect(movementMatchesTypeFilter(m, filters, "u1")).toBe(false);
  });
});

describe("applyAssigneeFilters", () => {
  it("filters income and expense independently", () => {
    const filters = createDefaultFilters(members, "u1");
    filters.income.family = false;
    filters.income.members.u2 = false;

    const movements = [
      movement({ id: "1", type: "income", assignee_kind: "family" }),
      movement({
        id: "2",
        type: "income",
        assignee_kind: "member",
        assignee_user_id: "u1",
      }),
      movement({ id: "3", type: "expense", assignee_kind: "family" }),
    ];

    const result = applyAssigneeFilters(movements, filters, "u1");
    expect(result.map((m) => m.id)).toEqual(["2", "3"]);
  });
});

describe("summarizeFilteredMovements", () => {
  it("computes totals on filtered movements", () => {
    const movements = [
      movement({ id: "1", type: "income", amount: 200 }),
      movement({ id: "2", type: "expense", amount: 50 }),
    ];
    const summary = summarizeFilteredMovements(movements);
    expect(summary.totalIncome).toBe(200);
    expect(summary.totalExpense).toBe(50);
    expect(summary.net).toBe(150);
  });
});

describe("storage", () => {
  it("roundtrips filters through JSON", () => {
    const filters = createDefaultFilters(members, "u1");
    const parsed = parseStoredFilters(serializeFilters(filters), members, "u1");
    expect(parsed).toEqual(filters);
  });

  it("returns defaults for invalid JSON", () => {
    const parsed = parseStoredFilters("not-json", members, "u1");
    expect(parsed).toEqual(createDefaultFilters(members, "u1"));
  });

  it("merges unknown members as selected", () => {
    const stored = {
      income: {
        family: true,
        members: { u1: true },
        showPrivate: true,
      },
      expense: {
        family: true,
        members: { u1: true },
        showPrivate: false,
      },
    };
    const parsed = parseStoredFilters(JSON.stringify(stored), members, "u1");
    expect(parsed.income.members.u2).toBe(true);
    expect(parsed.expense.showPrivate).toBe(false);
  });

  it("uses localStorage when available", () => {
    const storage = new Map<string, string>();
    const filters = createDefaultFilters(members, "u1");
    saveFilters(filters, {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
    });
    const loaded = loadFilters(members, "u1", {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
    });
    expect(loaded).toEqual(filters);
    expect(storage.has(ASSIGNEE_FILTERS_STORAGE_KEY)).toBe(true);
  });
});
