"use client";

import { Button } from "@/components/ui/button";
import {
  MONTH_ABBR_IT,
  buildCashflowSearchParams,
  isFullMonthRange,
  monthBoundsForYearMonth,
} from "@/lib/cashflow/date-range";
import { formatEuro } from "@/lib/cashflow/format";
import type { YearSummary } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type YearSummaryBarProps = {
  yearSummary: YearSummary;
  rangeFrom: string;
  rangeTo: string;
};

export function YearSummaryBar({
  yearSummary,
  rangeFrom,
  rangeTo,
}: YearSummaryBarProps) {
  const router = useRouter();
  const { year } = yearSummary;

  function navigate(params: { from: string; to: string; year: number }) {
    router.push(`/cashflow?${buildCashflowSearchParams(params)}`);
  }

  function shiftYear(delta: number) {
    navigate({ from: rangeFrom, to: rangeTo, year: year + delta });
  }

  function selectMonth(month: number) {
    const bounds = monthBoundsForYearMonth(year, month);
    navigate({ from: bounds.from, to: bounds.to, year });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Anno precedente"
            onClick={() => shiftYear(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-16 text-center text-sm font-semibold">{year}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Anno successivo"
            onClick={() => shiftYear(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Riepilogo annuale</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Entrate anno</p>
          <p className="font-semibold text-emerald-600 dark:text-emerald-500">
            {formatEuro(yearSummary.totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Uscite anno</p>
          <p className="font-semibold">{formatEuro(yearSummary.totalExpense)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Netto anno</p>
          <p
            className={cn(
              "font-semibold",
              yearSummary.net >= 0
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-destructive",
            )}
          >
            {formatEuro(yearSummary.net)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1">
          {yearSummary.months.map((entry) => {
            const highlighted = isFullMonthRange(
              rangeFrom,
              rangeTo,
              year,
              entry.month,
            );

            return (
              <button
                key={entry.monthKey}
                type="button"
                aria-current={highlighted ? "true" : undefined}
                onClick={() => selectMonth(entry.month)}
                className={cn(
                  "rounded-md border bg-background p-2 text-left text-xs transition-colors hover:bg-muted/50",
                  highlighted && "border-primary ring-1 ring-primary/30",
                )}
              >
                <p className="mb-1 font-medium">{MONTH_ABBR_IT[entry.month - 1]}</p>
                <p className="text-emerald-600 dark:text-emerald-500">
                  {formatEuro(entry.totalIncome)}
                </p>
                <p className="text-muted-foreground">
                  {formatEuro(entry.totalExpense)}
                </p>
                <p
                  className={cn(
                    entry.net >= 0
                      ? "text-emerald-600 dark:text-emerald-500"
                      : "text-destructive",
                  )}
                >
                  {formatEuro(entry.net)}
                </p>
              </button>
            );
          })}
      </div>
    </section>
  );
}
