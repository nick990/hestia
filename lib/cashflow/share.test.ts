import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  applyPersonalViewToMovements,
  buildShareSearchParams,
  getEffectiveAmount,
  isIncludedInPersonalView,
  isShareActive,
  parseShareParam,
  roundMoney,
} from "@/lib/cashflow/share";

const familyExpense = (
  amount: number,
  userId = "u1",
): Pick<Movement, "amount" | "scope" | "type" | "user_id"> => ({
  amount,
  scope: "family",
  type: "expense",
  user_id: userId,
});

const familyIncome = (
  amount: number,
  userId = "u1",
): Pick<Movement, "amount" | "scope" | "type" | "user_id"> => ({
  amount,
  scope: "family",
  type: "income",
  user_id: userId,
});

const privateMovement = (
  amount: number,
): Pick<Movement, "amount" | "scope" | "type" | "user_id"> => ({
  amount,
  scope: "private",
  type: "expense",
  user_id: "u1",
});

describe("parseShareParam", () => {
  it("defaults to false", () => {
    expect(parseShareParam(undefined)).toBe(false);
    expect(parseShareParam("0")).toBe(false);
    expect(parseShareParam("true")).toBe(false);
  });

  it("parses share=1", () => {
    expect(parseShareParam("1")).toBe(true);
  });
});

describe("buildShareSearchParams", () => {
  it("sets share=1 when enabled", () => {
    const params = buildShareSearchParams(new URLSearchParams(), true);
    expect(params.get("share")).toBe("1");
  });

  it("removes share when disabled", () => {
    const params = buildShareSearchParams(new URLSearchParams("share=1"), false);
    expect(params.has("share")).toBe(false);
  });
});

describe("isShareActive", () => {
  it("is inactive for private view", () => {
    expect(isShareActive("private", true)).toBe(false);
  });

  it("is inactive when share off", () => {
    expect(isShareActive("all", false)).toBe(false);
    expect(isShareActive("family", false)).toBe(false);
  });

  it("is active for all/family with share on", () => {
    expect(isShareActive("all", true)).toBe(true);
    expect(isShareActive("family", true)).toBe(true);
  });
});

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(10 / 3)).toBe(3.33);
    expect(roundMoney(100 / 3)).toBe(33.33);
  });
});

describe("isIncludedInPersonalView", () => {
  const opts = {
    shareEnabled: true,
    memberCount: 2,
    view: "all" as const,
    currentUserId: "u1",
  };

  it("includes all when share inactive", () => {
    expect(
      isIncludedInPersonalView(familyIncome(100, "u2"), {
        ...opts,
        shareEnabled: false,
      }),
    ).toBe(true);
  });

  it("excludes other members family income", () => {
    expect(isIncludedInPersonalView(familyIncome(100, "u2"), opts)).toBe(false);
  });

  it("includes own family income", () => {
    expect(isIncludedInPersonalView(familyIncome(100, "u1"), opts)).toBe(true);
  });

  it("includes family expenses from anyone", () => {
    expect(isIncludedInPersonalView(familyExpense(100, "u2"), opts)).toBe(true);
  });
});

describe("getEffectiveAmount", () => {
  const opts = {
    shareEnabled: true,
    memberCount: 3,
    view: "family" as const,
    currentUserId: "u1",
  };

  it("returns full amount when share inactive", () => {
    expect(
      getEffectiveAmount(familyExpense(90), { ...opts, shareEnabled: false }),
    ).toBe(90);
  });

  it("returns full amount for private scope", () => {
    expect(getEffectiveAmount(privateMovement(50), opts)).toBe(50);
  });

  it("divides family expense by member count", () => {
    expect(getEffectiveAmount(familyExpense(100), opts)).toBe(33.33);
  });

  it("returns full amount for own family income", () => {
    expect(getEffectiveAmount(familyIncome(2000), opts)).toBe(2000);
  });

  it("does not divide when memberCount is zero", () => {
    expect(
      getEffectiveAmount(familyExpense(100), { ...opts, memberCount: 0 }),
    ).toBe(100);
  });

  it("ignores share on private view", () => {
    expect(
      getEffectiveAmount(familyExpense(100), { ...opts, view: "private" }),
    ).toBe(100);
  });
});

describe("applyPersonalViewToMovements", () => {
  const baseMovement = (overrides: Partial<Movement>): Movement => ({
    id: "1",
    type: "expense",
    amount: 90,
    occurred_on: "2026-06-01",
    description: "",
    created_at: "2026-06-01T00:00:00Z",
    category_id: null,
    category_name: null,
    scope: "family",
    family_id: "f1",
    user_id: "u1",
    author_name: null,
    ...overrides,
  });

  it("filters other members income and divides family expenses", () => {
    const movements = [
      baseMovement({ id: "1", type: "expense", amount: 90, scope: "family" }),
      baseMovement({
        id: "2",
        type: "income",
        amount: 2000,
        scope: "family",
        user_id: "u1",
      }),
      baseMovement({
        id: "3",
        type: "income",
        amount: 5000,
        scope: "family",
        user_id: "u2",
      }),
      baseMovement({
        id: "4",
        type: "expense",
        amount: 20,
        scope: "private",
        family_id: null,
      }),
    ];

    const result = applyPersonalViewToMovements(movements, {
      shareEnabled: true,
      memberCount: 3,
      view: "all",
      currentUserId: "u1",
    });

    expect(result).toHaveLength(3);
    expect(result.find((m) => m.id === "3")).toBeUndefined();
    expect(result.find((m) => m.id === "1")?.amount).toBe(30);
    expect(result.find((m) => m.id === "2")?.amount).toBe(2000);
    expect(result.find((m) => m.id === "4")?.amount).toBe(20);
  });

  it("returns movements unchanged when share inactive", () => {
    const movements = [baseMovement({ id: "1" })];
    const result = applyPersonalViewToMovements(movements, {
      shareEnabled: false,
      memberCount: 3,
      view: "all",
      currentUserId: "u1",
    });
    expect(result).toEqual(movements);
  });
});
