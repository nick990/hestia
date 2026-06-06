import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  applyShareToMovements,
  buildShareSearchParams,
  getEffectiveAmount,
  isShareActive,
  parseShareParam,
  roundMoney,
} from "@/lib/cashflow/share";

const familyMovement = (amount: number): Pick<Movement, "amount" | "scope"> => ({
  amount,
  scope: "family",
});

const privateMovement = (amount: number): Pick<Movement, "amount" | "scope"> => ({
  amount,
  scope: "private",
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

describe("getEffectiveAmount", () => {
  const opts = { shareEnabled: true, memberCount: 3, view: "family" as const };

  it("returns full amount when share inactive", () => {
    expect(
      getEffectiveAmount(familyMovement(90), { ...opts, shareEnabled: false }),
    ).toBe(90);
  });

  it("returns full amount for private scope", () => {
    expect(getEffectiveAmount(privateMovement(50), opts)).toBe(50);
  });

  it("divides family amount by member count", () => {
    expect(getEffectiveAmount(familyMovement(100), opts)).toBe(33.33);
  });

  it("does not divide when memberCount is zero", () => {
    expect(
      getEffectiveAmount(familyMovement(100), { ...opts, memberCount: 0 }),
    ).toBe(100);
  });

  it("ignores share on private view", () => {
    expect(
      getEffectiveAmount(familyMovement(100), { ...opts, view: "private" }),
    ).toBe(100);
  });
});

describe("applyShareToMovements", () => {
  it("transforms only family rows when share active", () => {
    const movements: Movement[] = [
      {
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
      },
      {
        id: "2",
        type: "expense",
        amount: 20,
        occurred_on: "2026-06-01",
        description: "",
        created_at: "2026-06-01T00:00:00Z",
        category_id: null,
        category_name: null,
        scope: "private",
        family_id: null,
        user_id: "u1",
        author_name: null,
      },
    ];

    const result = applyShareToMovements(movements, {
      shareEnabled: true,
      memberCount: 3,
      view: "all",
    });

    expect(result[0].amount).toBe(30);
    expect(result[1].amount).toBe(20);
  });
});
