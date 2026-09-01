import { describe, expect, it } from "vitest";
import {
  buildCashflowAdvancedHref,
  buildCashflowHref,
} from "@/lib/cashflow/routes";

describe("buildCashflowHref", () => {
  it("costruisce /cashflow con from/to", () => {
    expect(
      buildCashflowHref({ from: "2026-09-01", to: "2026-09-30" }),
    ).toBe("/cashflow?from=2026-09-01&to=2026-09-30");
  });
});

describe("buildCashflowAdvancedHref", () => {
  it("costruisce /cashflow/avanzato con year", () => {
    expect(
      buildCashflowAdvancedHref({
        from: "2026-09-01",
        to: "2026-09-30",
        year: 2026,
      }),
    ).toBe("/cashflow/avanzato?from=2026-09-01&to=2026-09-30&year=2026");
  });
});
