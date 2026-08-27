import { describe, expect, it } from "vitest";
import { buildHomeHref, parseHomeTab } from "@/lib/home/tab";

describe("parseHomeTab", () => {
  it("default e junk sono cashflow", () => {
    expect(parseHomeTab(undefined)).toBe("cashflow");
    expect(parseHomeTab(null)).toBe("cashflow");
    expect(parseHomeTab("")).toBe("cashflow");
    expect(parseHomeTab("cashflow")).toBe("cashflow");
    expect(parseHomeTab("foo")).toBe("cashflow");
  });

  it("accetta notes", () => {
    expect(parseHomeTab("notes")).toBe("notes");
  });
});

describe("buildHomeHref", () => {
  it("omette tab per cashflow e può omettere from/to", () => {
    expect(buildHomeHref({})).toBe("/");
    expect(buildHomeHref({ tab: "cashflow" })).toBe("/");
    expect(
      buildHomeHref({
        tab: "cashflow",
        from: "2026-08-01",
        to: "2026-08-31",
      }),
    ).toBe("/?from=2026-08-01&to=2026-08-31");
  });

  it("mette tab=notes e conserva from/to", () => {
    expect(buildHomeHref({ tab: "notes" })).toBe("/?tab=notes");
    expect(
      buildHomeHref({
        tab: "notes",
        from: "2026-08-01",
        to: "2026-08-31",
      }),
    ).toBe("/?tab=notes&from=2026-08-01&to=2026-08-31");
  });
});
