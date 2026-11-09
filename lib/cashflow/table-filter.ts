import type { ColumnFiltersState } from "@tanstack/react-table";
import type { Movement, MonthSummary } from "@/lib/cashflow/types";

export type FacetedColumnFilterValue = {
  selectedValues: string[];
  /** Universo valori al momento dell’applicazione (semantica Excel). */
  allValues: string[];
};

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "it"));
}

function sameValueSet(a: string[], b: string[]): boolean {
  const left = sortedUnique(a);
  const right = sortedUnique(b);
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

export function facetedFilterFromSelection(
  selectedValues: string[],
  allValues: string[],
): FacetedColumnFilterValue | undefined {
  const all = sortedUnique(allValues);
  const selected = sortedUnique(selectedValues);

  if (sameValueSet(selected, all)) {
    return undefined;
  }

  return { selectedValues: selected, allValues: all };
}

export function initialFacetedSelection(
  committed: FacetedColumnFilterValue | undefined,
  allValues: string[],
): string[] {
  if (isFacetedFilterActive(committed)) {
    return [...committed!.selectedValues];
  }
  return sortedUnique(allValues);
}

export function normalizeCategoryDisplay(
  value: string | null | undefined,
): string {
  return value ?? "—";
}

export function normalizeDescriptionDisplay(
  value: string | null | undefined,
): string {
  return value?.trim() ? value.trim() : "—";
}

export function isFacetedFilterActive(
  value: FacetedColumnFilterValue | undefined,
): boolean {
  if (!value) {
    return false;
  }

  if (!value.allValues?.length) {
    return value.selectedValues.length > 0;
  }

  return !sameValueSet(value.selectedValues, value.allValues);
}

export function matchesFacetedFilter(
  rawValue: string | null | undefined,
  filterValue: FacetedColumnFilterValue | undefined,
  normalize: (value: string | null | undefined) => string,
): boolean {
  if (!isFacetedFilterActive(filterValue)) {
    return true;
  }

  const display = normalize(rawValue);
  const { selectedValues } = filterValue!;

  if (selectedValues.length === 0) {
    return false;
  }

  return selectedValues.includes(display);
}

export function hasActiveColumnFilters(
  columnFilters: ColumnFiltersState,
): boolean {
  return columnFilters.some((filter) =>
    isFacetedFilterActive(filter.value as FacetedColumnFilterValue),
  );
}

export function summarizeMovements(movements: Movement[]): MonthSummary {
  const totalIncome = movements
    .filter((movement) => movement.type === "income")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const totalExpense = movements
    .filter((movement) => movement.type === "expense")
    .reduce((sum, movement) => sum + movement.amount, 0);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}
