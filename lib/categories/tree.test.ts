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
  selectedExpandPaths,
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

  it("con i prefissi materializzati lavoro e monade sono selezionabili", () => {
    const groups = buildCategoryGroups([
      cat("lavoro", "lavoro"),
      cat("extra", "lavoro.extra"),
      cat("monade", "lavoro.monade"),
      cat("stipendio", "lavoro.monade.stipendio"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.rootCategory).toEqual(cat("lavoro", "lavoro"));
    expect(groups[0]?.children.map((child) => child.segment)).toEqual([
      "extra",
      "monade",
    ]);
    expect(groups[0]?.children[1]).toMatchObject({
      path: "lavoro.monade",
      category: cat("monade", "lavoro.monade"),
    });
  });

  it("gruppa al primo e al secondo livello, il resto sotto il secondo", () => {
    const groups = buildCategoryGroups(sample);
    expect(groups.map((group) => group.root)).toEqual(["casa", "monade"]);

    const casa = groups[0];
    expect(casa.rootCategory).toEqual(cat("casa", "casa"));
    expect(casa.children.map((child) => child.segment)).toEqual([
      "bollette",
      "mutuo",
    ]);
    expect(casa.children[0]).toEqual({
      segment: "bollette",
      path: "casa.bollette",
      category: null,
      children: [
        {
          id: "gas",
          name: "casa.bollette.gas",
          label: "gas",
        },
      ],
    });
    expect(casa.children[1]).toEqual({
      segment: "mutuo",
      path: "casa.mutuo",
      category: cat("mutuo", "casa.mutuo"),
      children: [],
    });

    const monade = groups[1];
    expect(monade.rootCategory).toBeNull();
    expect(monade.children).toEqual([
      {
        segment: "stipendio",
        path: "monade.stipendio",
        category: null,
        children: [
          {
            id: "extra",
            name: "monade.stipendio.extra",
            label: "extra",
          },
        ],
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
    expect(filtered[0]?.children.map((child) => child.segment)).toEqual([
      "bollette",
    ]);
    expect(filtered[0]?.children[0]?.children.map((child) => child.label)).toEqual(
      ["gas"],
    );
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

  it("percorsi da aprire per arrivare alla selezione", () => {
    expect(selectedExpandPaths("casa")).toEqual(["casa"]);
    expect(selectedExpandPaths("casa.mutuo")).toEqual(["casa", "casa.mutuo"]);
    expect(selectedExpandPaths("casa.bollette.gas")).toEqual([
      "casa",
      "casa.bollette",
    ]);
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
        path: "casa",
        label: "casa",
        category: settingsSample[0],
        expandable: true,
        open: false,
        depth: 0,
      },
      {
        kind: "group",
        path: "monade",
        label: "monade",
        category: null,
        expandable: true,
        open: false,
        depth: 0,
      },
    ]);
  });

  it("aperto il primo livello: secondo livello, non i nipoti", () => {
    const rows = buildSettingsCategoryRows(
      settingsSample,
      new Set(["casa"]),
      "",
    );
    expect(rows.map((row) => row.kind + ":" + row.label)).toEqual([
      "group:casa",
      "group:bollette",
      "group:mutuo",
      "group:monade",
    ]);
    expect(rows[1]).toMatchObject({
      kind: "group",
      path: "casa.bollette",
      expandable: true,
      open: false,
      depth: 1,
      category: null,
    });
  });

  it("aperto il secondo livello: i nipoti con etichetta relativa", () => {
    const rows = buildSettingsCategoryRows(
      settingsSample,
      new Set(["casa", "casa.bollette"]),
      "",
    );
    expect(rows.map((row) => row.kind + ":" + row.label)).toEqual([
      "group:casa",
      "group:bollette",
      "child:gas",
      "group:mutuo",
      "group:monade",
    ]);
    expect(rows[2]).toMatchObject({
      kind: "child",
      label: "gas",
      category: settingsSample[2],
      depth: 2,
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
        path: "energia",
        label: "energia",
        category: full("energia", "energia"),
        expandable: false,
        open: false,
        depth: 0,
      },
    ]);
  });

  it("in ricerca i gruppi restano aperti e filtrati", () => {
    const rows = buildSettingsCategoryRows(settingsSample, new Set(), "gas");
    expect(rows.map((row) => row.kind + ":" + row.label)).toEqual([
      "group:casa",
      "group:bollette",
      "child:gas",
    ]);
    expect(rows[0]).toMatchObject({ expandable: true, open: true });
    expect(rows[1]).toMatchObject({ expandable: true, open: true });
  });
});
