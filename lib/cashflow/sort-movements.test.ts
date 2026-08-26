import { describe, expect, it } from "vitest";
import { sortMovementsNewestFirst } from "@/lib/cashflow/sort-movements";
import type { Movement } from "@/lib/cashflow/types";

function movement(overrides: Partial<Movement>): Movement {
  return {
    id: "m1",
    type: "expense",
    amount: 10,
    occurred_on: "2026-08-01",
    description: "",
    created_at: "2026-08-01T00:00:00Z",
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

describe("sortMovementsNewestFirst", () => {
  it("puts later occurred_on first", () => {
    const older = movement({ id: "a", occurred_on: "2026-08-10" });
    const newer = movement({ id: "b", occurred_on: "2026-08-20" });

    expect(sortMovementsNewestFirst([older, newer]).map((m) => m.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("breaks ties with later created_at first", () => {
    const firstInserted = movement({
      id: "a",
      occurred_on: "2026-08-15",
      created_at: "2026-08-15T08:00:00.000Z",
    });
    const laterInserted = movement({
      id: "b",
      occurred_on: "2026-08-15",
      created_at: "2026-08-16T12:30:00.000Z",
    });

    expect(
      sortMovementsNewestFirst([firstInserted, laterInserted]).map((m) => m.id),
    ).toEqual(["b", "a"]);
  });
});
