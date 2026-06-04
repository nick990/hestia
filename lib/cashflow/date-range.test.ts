import { describe, expect, it } from "vitest";
import {
  buildCashflowSearchParams,
  getCurrentMonthBounds,
  isFullMonthRange,
  monthBoundsForYearMonth,
  parseDateRangeParams,
  parseYearParam,
} from "@/lib/cashflow/date-range";

describe("parseDateRangeParams", () => {
  it("defaults to current month when params missing", () => {
    const { from, to } = parseDateRangeParams(undefined, undefined);
    const current = getCurrentMonthBounds();
    expect(from).toBe(current.from);
    expect(to).toBe(current.to);
  });

  it("swaps when from > to", () => {
    const { from, to } = parseDateRangeParams("2026-06-20", "2026-06-01");
    expect(from).toBe("2026-06-01");
    expect(to).toBe("2026-06-20");
  });

  it("falls back on invalid ISO", () => {
    const { from, to } = parseDateRangeParams("bad", "2026-01-15");
    const current = getCurrentMonthBounds();
    expect(from).toBe(current.from);
    expect(to).toBe(current.to);
  });
});

describe("parseYearParam", () => {
  it("returns current year when invalid", () => {
    const year = parseYearParam("abc");
    expect(year).toBeGreaterThan(2000);
  });

  it("parses valid year", () => {
    expect(parseYearParam("2024")).toBe(2024);
  });
});

describe("monthBoundsForYearMonth", () => {
  it("returns full February 2024", () => {
    expect(monthBoundsForYearMonth(2024, 2)).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });
});

describe("isFullMonthRange", () => {
  it("true for exact month", () => {
    expect(isFullMonthRange("2026-03-01", "2026-03-31", 2026, 3)).toBe(true);
  });

  it("false for partial range", () => {
    expect(isFullMonthRange("2026-03-10", "2026-03-31", 2026, 3)).toBe(false);
  });
});

describe("buildCashflowSearchParams", () => {
  it("preserves all params", () => {
    const qs = buildCashflowSearchParams({
      from: "2026-06-01",
      to: "2026-06-30",
      year: 2025,
    });
    expect(qs).toBe("from=2026-06-01&to=2026-06-30&year=2025");
  });
});
