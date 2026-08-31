import { describe, expect, it } from "vitest";
import { parseCategoryName } from "@/lib/categories/name";

describe("parseCategoryName", () => {
  it("accetta un path con segmenti pieni", () => {
    expect(parseCategoryName("lavoro.bonus")).toBe("lavoro.bonus");
    expect(parseCategoryName("  casa  ")).toBe("casa");
  });

  it("rifiuta vuoto, troppo lungo, segmenti vuoti", () => {
    expect(parseCategoryName("")).toBeNull();
    expect(parseCategoryName("   ")).toBeNull();
    expect(parseCategoryName("lavoro.")).toBeNull();
    expect(parseCategoryName("casa..gas")).toBeNull();
    expect(parseCategoryName(".casa")).toBeNull();
    expect(parseCategoryName("a".repeat(101))).toBeNull();
  });
});
