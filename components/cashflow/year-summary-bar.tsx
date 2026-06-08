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
import { buildCashflowViewSearchParams, type CashflowView } from "@/lib/cashflow/view";
import { buildShareSearchParams } from "@/lib/cashflow/share";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type YearSummaryBarProps = {
  yearSummary: YearSummary;
  rangeFrom: string;
  rangeTo: string;
  view?: CashflowView;
  share?: boolean;
};

export function YearSummaryBar({
  yearSummary,
  rangeFrom,
  rangeTo,
  view = "all",
  share = false,
}: YearSummaryBarProps) {
  const router = useRouter();
  const [monthsOpen, setMonthsOpen] = useState(false);
  const { year } = yearSummary;

  function navigate(params: { from: string; to: string; year: number }) {
    const searchParams = buildShareSearchParams(
      buildCashflowViewSearchParams(
        new URLSearchParams(buildCashflowSearchParams(params)),
        view,
      ),
      share,
    );
    router.push(`/cashflow?${searchParams.toString()}`);
  }

  function shiftYear(delta: number) {
    navigate({ from: rangeFrom, to: rangeTo, year: year + delta });
  }

  function selectMonth(month: number) {
    const bounds = monthBoundsForYearMonth(year, month);
    navigate({ from: bounds.from, to: bounds.to, year });
  }

  return (
    <section className="rounded-lg border bg-muted/20 p-4">
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
        <p className="text-xs text-muted-foreground">Riepilogo annuale</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-center sm:text-left">
        <div>
          <p className="text-xs text-muted-foreground">Entrate</p>
          <p className="text-sm font-semibold text-income">
            {formatEuro(yearSummary.totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Uscite</p>
          <p className="text-sm font-semibold text-destructive">
            {formatEuro(yearSummary.totalExpense)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Netto</p>
          <p
            className={cn(
              "text-sm font-semibold",
              yearSummary.net >= 0 ? "text-income" : "text-destructive",
            )}
          >
            {formatEuro(yearSummary.net)}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-between px-2 text-muted-foreground"
          aria-expanded={monthsOpen}
          onClick={() => setMonthsOpen((open) => !open)}
        >
          <span>{monthsOpen ? "Nascondi mesi" : "Sfoglia per mese"}</span>
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform duration-200",
              monthsOpen && "rotate-180",
            )}
          />
        </Button>

        {monthsOpen ? (
          <div className="mt-2 grid grid-cols-6 gap-1">
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
                    highlighted &&
                      "border-primary bg-primary/5 ring-1 ring-primary/25",
                  )}
                >
                  <p className="mb-1 font-medium">{MONTH_ABBR_IT[entry.month - 1]}</p>
                  <p className="text-income">{formatEuro(entry.totalIncome)}</p>
                  <p className="text-destructive/80">
                    {formatEuro(entry.totalExpense)}
                  </p>
                  <p
                    className={cn(
                      entry.net >= 0 ? "text-income" : "text-destructive",
                    )}
                  >
                    {formatEuro(entry.net)}
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
