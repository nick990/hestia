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
      <div className="rounded-lg border border-income/15 bg-income-muted p-4">
        <p className="text-sm text-muted-foreground">Entrate</p>
        <p className="text-lg font-semibold text-income">
          {formatEuro(summary.totalIncome)}
        </p>
        <FilteredTotalLine
          active={active}
          amount={filtered.totalIncome}
          className="text-income"
        />
      </div>
      <div className="rounded-lg border border-destructive/15 bg-expense-muted p-4">
        <p className="text-sm text-muted-foreground">Uscite</p>
        <p className="text-lg font-semibold text-destructive">
          {formatEuro(summary.totalExpense)}
        </p>
        <FilteredTotalLine
          active={active}
          amount={filtered.totalExpense}
          className="text-destructive"
        />
      </div>
      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">Netto</p>
        <p
          className={cn(
            "text-lg font-semibold",
            summary.net >= 0 ? "text-income" : "text-destructive",
          )}
        >
          {formatEuro(summary.net)}
        </p>
        <FilteredTotalLine
          active={active}
          amount={filtered.net}
          className={filtered.net >= 0 ? "text-income" : "text-destructive"}
        />
        <p className="text-xs text-muted-foreground">entrate − uscite</p>
      </div>
    </div>
  );
}
