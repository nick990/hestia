import { describe, expect, it } from "vitest";
import { isNavItemActive } from "@/components/layout/app-nav-links";

describe("isNavItemActive", () => {
  it("Home attiva solo su /", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/cashflow")).toBe(false);
    expect(isNavItemActive("/", "/notes")).toBe(false);
  });

  it("Cashflow attiva su /cashflow", () => {
    expect(isNavItemActive("/cashflow", "/cashflow")).toBe(true);
    expect(isNavItemActive("/cashflow", "/")).toBe(false);
  });
});
