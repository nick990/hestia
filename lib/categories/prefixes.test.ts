import { describe, expect, it } from "vitest";
import { missingCategoryPrefixes } from "@/lib/categories/prefixes";

describe("missingCategoryPrefixes", () => {
  it("nessun prefisso se i nomi sono foglie di un solo segmento", () => {
    expect(missingCategoryPrefixes(["casa", "misc"])).toEqual([]);
  });

  it("materializza i livelli intermedi assenti", () => {
    expect(
      missingCategoryPrefixes([
        "lavoro.extra",
        "lavoro.monade.stipendio",
        "lavoro.monade.rimborsi",
      ]),
    ).toEqual(["lavoro", "lavoro.monade"]);
  });

  it("non ripete un prefisso già presente", () => {
    expect(
      missingCategoryPrefixes(["lavoro", "lavoro.monade.stipendio"]),
    ).toEqual(["lavoro.monade"]);
  });

  it("ignora il case rispetto ai nomi già presenti", () => {
    expect(
      missingCategoryPrefixes(["Lavoro", "lavoro.monade.stipendio"]),
    ).toEqual(["lavoro.monade"]);
  });
});
