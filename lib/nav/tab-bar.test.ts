import { describe, expect, it } from "vitest";
import { resolveAppTab } from "@/lib/nav/tab-bar";

describe("resolveAppTab", () => {
  it("null su home", () => {
    expect(resolveAppTab("/")).toBe(null);
  });

  it("cashflow su standard e avanzato", () => {
    expect(resolveAppTab("/cashflow")).toBe("cashflow");
    expect(resolveAppTab("/cashflow/avanzato")).toBe("cashflow");
  });

  it("notes ed evidenza", () => {
    expect(resolveAppTab("/notes")).toBe("notes");
    expect(resolveAppTab("/evidenza")).toBe("evidenza");
  });

  it("saldi", () => {
    expect(resolveAppTab("/saldi")).toBe("saldi");
  });

  it("null fuori dalle sezioni tab", () => {
    expect(resolveAppTab("/settings/categories")).toBe(null);
  });
});
