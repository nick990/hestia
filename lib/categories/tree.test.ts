import { describe, expect, it } from "vitest";
import type {
  MovementCategory,
  MovementCategoryOption,
} from "@/lib/categories/types";
import {
  buildCategoryGroups,
  buildSettingsCategoryRows,
  categoryTriggerLabel,
  compareItalian,
  filterCategoryGroups,
  firstSegment,
  matchesCategoryQuery,
  relativeLabel,
  selectedGroupRoot,
  showNoneOption,
} from "@/lib/categories/tree";

const cat = (
  id: string,
  name: string,
): MovementCategoryOption => ({ id, name });

const sample: MovementCategoryOption[] = [
  cat("casa", "casa"),
  cat("mutuo", "casa.mutuo"),
  cat("gas", "casa.bollette.gas"),
  cat("extra", "monade.stipendio.extra"),
];

describe("firstSegment e relativeLabel", () => {
  it("prende il primo pezzo e toglie il gruppo dall'etichetta", () => {
    expect(firstSegment("casa.bollette.gas")).toBe("casa");
    expect(firstSegment("casa")).toBe("casa");
    expect(relativeLabel("casa.bollette.gas", "casa")).toBe("bollette.gas");
    expect(relativeLabel("casa.mutuo", "casa")).toBe("mutuo");
    expect(relativeLabel("casa", "casa")).toBe("casa");
  });
});

describe("buildCategoryGroups", () => {
  it("lista vuota", () => {
    expect(buildCategoryGroups([])).toEqual([]);
  });

  it("gruppa dal primo segmento, flatten dei discendenti, radice selezionabile", () => {
    const groups = buildCategoryGroups(sample);
    expect(groups.map((group) => group.root)).toEqual(["casa", "monade"]);

    const casa = groups[0];
    expect(casa.rootCategory).toEqual(cat("casa", "casa"));
    expect(casa.children.map((child) => child.label)).toEqual([
      "bollette.gas",
      "mutuo",
    ]);
    expect(casa.children.map((child) => child.name)).toEqual([
      "casa.bollette.gas",
      "casa.mutuo",
    ]);

    const monade = groups[1];
    expect(monade.rootCategory).toBeNull();
    expect(monade.children).toEqual([
      {
        id: "extra",
        name: "monade.stipendio.extra",
        label: "stipendio.extra",
      },
    ]);
  });

  it("ordina gruppi e figli in italiano, ignorando il case", () => {
    const groups = buildCategoryGroups([
      cat("e", "energia"),
      cat("a", "àlbero"),
      cat("c", "Casa"),
    ]);
    expect(groups.map((group) => group.root)).toEqual([
      "àlbero",
      "Casa",
      "energia",
    ]);
  });
});

describe("compareItalian", () => {
  it("ignora il case", () => {
    expect(compareItalian("Casa", "casa")).toBe(0);
  });
});

describe("matchesCategoryQuery e filterCategoryGroups", () => {
  it("match sul percorso intero, case-insensitive", () => {
    expect(matchesCategoryQuery("casa.bollette.gas", "GAS")).toBe(true);
    expect(matchesCategoryQuery("casa.mutuo", "gas")).toBe(false);
    expect(matchesCategoryQuery("casa", "")).toBe(true);
  });

  it("tiene i gruppi con match, filtra i figli, lascia la radice se il gruppo resta", () => {
    const groups = buildCategoryGroups(sample);
    const filtered = filterCategoryGroups(groups, "gas");
    expect(filtered.map((group) => group.root)).toEqual(["casa"]);
    expect(filtered[0]?.rootCategory?.id).toBe("casa");
    expect(filtered[0]?.children.map((child) => child.label)).toEqual([
      "bollette.gas",
    ]);
  });

  it("query vuota non filtra", () => {
    const groups = buildCategoryGroups(sample);
    expect(filterCategoryGroups(groups, "  ")).toEqual(groups);
  });

  it("solo la radice matcha: gruppo resta, figli vuoti", () => {
    const groups = buildCategoryGroups([cat("casa", "casa"), cat("x", "altro.x")]);
    const filtered = filterCategoryGroups(groups, "casa");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.root).toBe("casa");
    expect(filtered[0]?.children).toEqual([]);
  });
});

describe("showNoneOption", () => {
  it("visibile a cerca vuota o se la query è in «nessuna»", () => {
    expect(showNoneOption("")).toBe(true);
    expect(showNoneOption("  ")).toBe(true);
    expect(showNoneOption("ness")).toBe(true);
    expect(showNoneOption("Nessuna")).toBe(true);
    expect(showNoneOption("gas")).toBe(false);
  });
});

describe("categoryTriggerLabel e selectedGroupRoot", () => {
  it("nessuna, orfana, nome intero", () => {
    expect(categoryTriggerLabel(sample, "none")).toBe("Nessuna");
    expect(categoryTriggerLabel(sample, "missing")).toBe("Nessuna");
    expect(categoryTriggerLabel(sample, "gas")).toBe("casa.bollette.gas");
  });

  it("radice del gruppo della selezione", () => {
    expect(selectedGroupRoot(sample, "none")).toBeNull();
    expect(selectedGroupRoot(sample, "missing")).toBeNull();
    expect(selectedGroupRoot(sample, "gas")).toBe("casa");
    expect(selectedGroupRoot(sample, "casa")).toBe("casa");
  });
});

const full = (
  id: string,
  name: string,
  movement_count = 0,
): MovementCategory => ({
  id,
  name,
  created_at: "2026-08-01T00:00:00Z",
  movement_count,
});

const settingsSample: MovementCategory[] = [
  full("casa", "casa", 2),
  full("mutuo", "casa.mutuo", 4),
  full("gas", "casa.bollette.gas", 1),
  full("extra", "monade.stipendio.extra", 3),
];

describe("buildSettingsCategoryRows", () => {
  it("a riposo mostra solo i primi livelli", () => {
    const rows = buildSettingsCategoryRows(settingsSample, new Set(), "");
    expect(rows).toEqual([
      {
        kind: "group",
        root: "casa",
        label: "casa",
        category: settingsSample[0],
        expandable: true,
        open: false,
      },
      {
        kind: "group",
        root: "monade",
        label: "monade",
        category: null,
        expandable: true,
        open: false,
      },
    ]);
  });

  it("aperto un gruppo: figli piatti con etichetta relativa", () => {
    const rows = buildSettingsCategoryRows(
      settingsSample,
      new Set(["casa"]),
      "",
    );
    expect(rows.map((row) => row.kind + ":" + row.label)).toEqual([
      "group:casa",
      "child:bollette.gas",
      "child:mutuo",
      "group:monade",
    ]);
    expect(rows[1]).toMatchObject({
      kind: "child",
      label: "bollette.gas",
      category: settingsSample[2],
    });
  });

  it("foglia di primo livello senza freccia", () => {
    const rows = buildSettingsCategoryRows(
      [full("energia", "energia")],
      new Set(),
      "",
    );
    expect(rows).toEqual([
      {
        kind: "group",
        root: "energia",
        label: "energia",
        category: full("energia", "energia"),
        expandable: false,
        open: false,
      },
    ]);
  });

  it("in ricerca i gruppi restano aperti e filtrati", () => {
    const rows = buildSettingsCategoryRows(settingsSample, new Set(), "gas");
    expect(rows.map((row) => row.kind + ":" + row.label)).toEqual([
      "group:casa",
      "child:bollette.gas",
    ]);
    expect(rows[0]).toMatchObject({ expandable: true, open: true });
  });
});
