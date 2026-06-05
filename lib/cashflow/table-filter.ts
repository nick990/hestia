import type { ColumnFiltersState } from "@tanstack/react-table";
import type { Movement, MonthSummary } from "@/lib/cashflow/types";

export type FacetedColumnFilterValue = {
  selectedValues: string[];
};

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
  return value.selectedValues.length > 0;
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
