import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/cashflow/types";
import {
  facetedFilterFromSelection,
  hasActiveColumnFilters,
  initialFacetedSelection,
  isFacetedFilterActive,
  matchesFacetedFilter,
  normalizeCategoryDisplay,
  normalizeDescriptionDisplay,
  summarizeMovements,
  type FacetedColumnFilterValue,
} from "@/lib/cashflow/table-filter";

const movement = (overrides: Partial<Movement> = {}): Movement => ({
  id: "1",
  type: "expense",
  amount: 10,
  occurred_on: "2026-06-01",
  description: "",
  created_at: "2026-06-01T00:00:00Z",
  category_id: null,
  category_name: null,
  ...overrides,
});

describe("normalizeCategoryDisplay", () => {
  it("maps null to em dash", () => {
    expect(normalizeCategoryDisplay(null)).toBe("—");
  });

  it("keeps name", () => {
    expect(normalizeCategoryDisplay("Spesa")).toBe("Spesa");
  });
});

describe("normalizeDescriptionDisplay", () => {
  it("maps empty to em dash", () => {
    expect(normalizeDescriptionDisplay("   ")).toBe("—");
  });

  it("trims description", () => {
    expect(normalizeDescriptionDisplay(" bolletta ")).toBe("bolletta");
  });
});

describe("facetedFilterFromSelection", () => {
  const all = ["A", "B", "C"];

  it("restituisce undefined se tutto è selezionato", () => {
    expect(facetedFilterFromSelection(["A", "B", "C"], all)).toBeUndefined();
    expect(facetedFilterFromSelection(["C", "A", "B"], all)).toBeUndefined();
  });

  it("restituisce il filtro per un sottoinsieme", () => {
    expect(facetedFilterFromSelection(["A"], all)).toEqual({
      selectedValues: ["A"],
      allValues: ["A", "B", "C"],
    });
  });

  it("restituisce filtro attivo con selezione vuota (nessuna riga)", () => {
    expect(facetedFilterFromSelection([], all)).toEqual({
      selectedValues: [],
      allValues: ["A", "B", "C"],
    });
  });
});

describe("initialFacetedSelection", () => {
  const all = ["A", "B"];

  it("apre con tutto selezionato se non c’è filtro", () => {
    expect(initialFacetedSelection(undefined, all)).toEqual(["A", "B"]);
  });

  it("apre con i valori committati se il filtro è attivo", () => {
    const committed: FacetedColumnFilterValue = {
      selectedValues: ["A"],
      allValues: all,
    };
    expect(initialFacetedSelection(committed, all)).toEqual(["A"]);
  });
});

describe("matchesFacetedFilter", () => {
  const normalize = normalizeCategoryDisplay;

  it("passes when filter inactive", () => {
    expect(matchesFacetedFilter("Spesa", undefined, normalize)).toBe(true);
    expect(
      matchesFacetedFilter("Spesa", { selectedValues: [] }, normalize),
    ).toBe(true);
    expect(
      matchesFacetedFilter(
        "Spesa",
        { selectedValues: ["A", "B"], allValues: ["A", "B"] },
        normalize,
      ),
    ).toBe(true);
  });

  it("filters by selected values only", () => {
    const filter: FacetedColumnFilterValue = {
      selectedValues: ["Spesa"],
      allValues: ["Spesa", "Stipendio"],
    };
    expect(matchesFacetedFilter("Spesa", filter, normalize)).toBe(true);
    expect(matchesFacetedFilter("Stipendio", filter, normalize)).toBe(false);
    expect(matchesFacetedFilter(null, { selectedValues: ["—"] }, normalize)).toBe(
      true,
    );
  });

  it("ignores search text at row level", () => {
    const filter: FacetedColumnFilterValue = {
      selectedValues: ["auto.manutenzione"],
      allValues: ["auto.manutenzione", "casa.affitto"],
    };
    expect(
      matchesFacetedFilter("auto.manutenzione", filter, normalize),
    ).toBe(true);
    expect(
      matchesFacetedFilter(
        "auto.manutenzione",
        {
          selectedValues: ["auto.manutenzione", "casa.affitto"],
          allValues: ["auto.manutenzione", "casa.affitto"],
        },
        normalize,
      ),
    ).toBe(true);
    expect(
      matchesFacetedFilter("casa.affitto", filter, normalize),
    ).toBe(false);
  });

  it("supports multiple selected values with OR semantics", () => {
    const filter: FacetedColumnFilterValue = {
      selectedValues: ["Bolletta gas", "Affitto"],
      allValues: ["Bolletta gas", "Affitto", "Spesa"],
    };
    expect(
      matchesFacetedFilter("Bolletta gas", filter, normalizeDescriptionDisplay),
    ).toBe(true);
    expect(
      matchesFacetedFilter("Affitto", filter, normalizeDescriptionDisplay),
    ).toBe(true);
    expect(
      matchesFacetedFilter("Spesa", filter, normalizeDescriptionDisplay),
    ).toBe(false);
  });

  it("esclude tutte le righe se attivo ma nessun valore selezionato", () => {
    const filter: FacetedColumnFilterValue = {
      selectedValues: [],
      allValues: ["A", "B"],
    };
    expect(matchesFacetedFilter("A", filter, normalize)).toBe(false);
  });
});

describe("isFacetedFilterActive", () => {
  it("non è attivo se tutto è selezionato (Excel)", () => {
    expect(
      isFacetedFilterActive({
        selectedValues: ["A", "B"],
        allValues: ["A", "B"],
      }),
    ).toBe(false);
  });

  it("è attivo con sottoinsieme o legacy con selezione", () => {
    expect(
      isFacetedFilterActive({
        selectedValues: ["A"],
        allValues: ["A", "B"],
      }),
    ).toBe(true);
    expect(isFacetedFilterActive({ selectedValues: ["A"] })).toBe(true);
    expect(isFacetedFilterActive({ selectedValues: [] })).toBe(false);
    expect(isFacetedFilterActive(undefined)).toBe(false);
  });
});

describe("hasActiveColumnFilters", () => {
  it("returns true when any column filter is active", () => {
    expect(
      hasActiveColumnFilters([
        {
          id: "category_name",
          value: {
            selectedValues: ["Spesa"],
            allValues: ["Spesa", "Stipendio"],
          },
        },
      ]),
    ).toBe(true);
    expect(hasActiveColumnFilters([])).toBe(false);
  });
});

describe("summarizeMovements", () => {
  it("sums income, expense and net", () => {
    const result = summarizeMovements([
      movement({ type: "income", amount: 100 }),
      movement({ id: "2", type: "expense", amount: 40 }),
      movement({ id: "3", type: "expense", amount: 10 }),
    ]);
    expect(result).toEqual({
      totalIncome: 100,
      totalExpense: 50,
      net: 50,
    });
  });

  it("returns zeros for empty list", () => {
    expect(summarizeMovements([])).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      net: 0,
    });
  });
});
