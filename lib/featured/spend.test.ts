import { describe, expect, it } from "vitest";
import {
  compareSpendToBudget,
  computeBranchSpend,
} from "@/lib/featured/spend";
import type { Movement } from "@/lib/cashflow/types";

function movement(partial: Partial<Movement> & Pick<Movement, "type" | "amount">): Movement {
  return {
    id: "1",
    occurred_on: "2026-09-01",
    description: "",
    created_at: "2026-09-01T00:00:00Z",
    category_id: null,
    category_name: null,
    created_by: "u1",
    assignee_kind: "family",
    assignee_user_id: null,
    is_private: false,
    ...partial,
  };
}

describe("computeBranchSpend", () => {
  it("somma le uscite", () => {
    expect(
      computeBranchSpend([
        movement({ type: "expense", amount: 1000 }),
      ]),
    ).toBe(1000);
  });

  it("sottrae le entrate del ramo", () => {
    expect(
      computeBranchSpend([
        movement({ type: "expense", amount: 1000 }),
        movement({ type: "income", amount: 200, id: "2" }),
      ]),
    ).toBe(800);
  });
});

describe("compareSpendToBudget", () => {
  it("calcola il rimanente sotto il limite", () => {
    expect(compareSpendToBudget(1000, 1500)).toEqual({
      kind: "within",
      remaining: 500,
    });
  });

  it("segnala superamento del limite", () => {
    expect(compareSpendToBudget(1600, 1500)).toEqual({
      kind: "over",
      overBy: 100,
    });
  });
});
