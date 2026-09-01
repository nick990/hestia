import { describe, expect, it } from "vitest";
import {
  applyCategoryPrefixRename,
  filterCategoriesByPrefix,
  matchesCategoryPrefix,
} from "@/lib/categories/prefix-match";

describe("matchesCategoryPrefix", () => {
  it("match esatto e figli a qualsiasi livello", () => {
    expect(matchesCategoryPrefix("vacanze", "vacanze")).toBe(true);
    expect(matchesCategoryPrefix("vacanze.hotel", "vacanze")).toBe(true);
    expect(matchesCategoryPrefix("vacanze.volo.estate", "vacanze")).toBe(true);
  });

  it("esclude fratelli e prefissi parziali", () => {
    expect(matchesCategoryPrefix("casa", "vacanze")).toBe(false);
    expect(matchesCategoryPrefix("vacanzeextra", "vacanze")).toBe(false);
    expect(matchesCategoryPrefix("vac", "vacanze")).toBe(false);
  });
});

describe("applyCategoryPrefixRename", () => {
  it("rinomina radice e discendenti", () => {
    expect(applyCategoryPrefixRename("vacanze", "vacanze", "viaggi")).toBe(
      "viaggi",
    );
    expect(
      applyCategoryPrefixRename("vacanze.hotel", "vacanze", "viaggi"),
    ).toBe("viaggi.hotel");
  });
});

describe("filterCategoriesByPrefix", () => {
  it("tiene solo il ramo", () => {
    const categories = [
      { id: "1", name: "vacanze" },
      { id: "2", name: "vacanze.hotel" },
      { id: "3", name: "casa" },
    ];

    expect(filterCategoriesByPrefix(categories, "vacanze")).toEqual([
      { id: "1", name: "vacanze" },
      { id: "2", name: "vacanze.hotel" },
    ]);
  });
});
