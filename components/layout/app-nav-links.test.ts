import { describe, expect, it } from "vitest";
import { isNavItemActive } from "@/components/layout/app-nav-links";

describe("isNavItemActive", () => {
  it("Impostazioni attiva su /settings", () => {
    expect(isNavItemActive("/settings", "/settings/categories")).toBe(true);
    expect(isNavItemActive("/settings", "/cashflow")).toBe(false);
  });
});
