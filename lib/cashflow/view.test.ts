import { describe, expect, it } from "vitest";
import { parseCashflowViewParam } from "@/lib/cashflow/view";

describe("parseCashflowViewParam", () => {
  it("defaults to all", () => {
    expect(parseCashflowViewParam(undefined)).toBe("all");
    expect(parseCashflowViewParam("invalid")).toBe("all");
  });

  it("parses valid views", () => {
    expect(parseCashflowViewParam("all")).toBe("all");
    expect(parseCashflowViewParam("family")).toBe("family");
    expect(parseCashflowViewParam("mine")).toBe("mine");
  });
});
