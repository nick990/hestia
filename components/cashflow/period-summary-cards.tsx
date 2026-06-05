"use client";

import { formatEuro } from "@/lib/cashflow/format";
import type { MonthSummary } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";

export type FilterSummaryState = {
  active: boolean;
  summary: MonthSummary;
};

type PeriodSummaryCardsProps = {
  summary: MonthSummary;
  filterSummary: FilterSummaryState;
};

function FilteredTotalLine({
  active,
  amount,
  className,
}: {
  active: boolean;
  amount: number;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "min-h-4 text-xs",
        active ? className : "invisible",
      )}
      aria-hidden={!active}
    >
      Filtrato: {formatEuro(amount)}
    </p>
  );
}

export function PeriodSummaryCards({
  summary,
  filterSummary,
}: PeriodSummaryCardsProps) {
  const { active, summary: filtered } = filterSummary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Entrate</p>
        <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-500">
          {formatEuro(summary.totalIncome)}
        </p>
        <FilteredTotalLine
          active={active}
          amount={filtered.totalIncome}
          className="text-emerald-600 dark:text-emerald-500"
        />
      </div>
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Uscite</p>
        <p className="text-lg font-semibold">{formatEuro(summary.totalExpense)}</p>
        <FilteredTotalLine active={active} amount={filtered.totalExpense} />
      </div>
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Netto</p>
        <p
          className={cn(
            "text-lg font-semibold",
            summary.net >= 0
              ? "text-emerald-600 dark:text-emerald-500"
              : "text-destructive",
          )}
        >
          {formatEuro(summary.net)}
        </p>
        <FilteredTotalLine
          active={active}
          amount={filtered.net}
          className={
            filtered.net >= 0
              ? "text-emerald-600 dark:text-emerald-500"
              : "text-destructive"
          }
        />
        <p className="text-xs text-muted-foreground">entrate − uscite</p>
      </div>
    </div>
  );
}
