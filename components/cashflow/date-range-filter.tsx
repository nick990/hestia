"use client";

import { FilterDatePicker } from "@/components/cashflow/filter-date-picker";
import { Button } from "@/components/ui/button";
import {
  buildCashflowSearchParams,
  parseIsoDate,
  shiftMonthRange,
} from "@/lib/cashflow/date-range";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";

type DateRangeFilterProps = {
  from: string;
  to: string;
  year: number;
  pending: boolean;
  onNavigate: (href: string) => void;
};

export function DateRangeFilter({
  from,
  to,
  year,
  pending,
  onNavigate,
}: DateRangeFilterProps) {
  const [filterPending, setFilterPending] = useState(false);

  useEffect(() => {
    setFilterPending(false);
  }, [from, to]);

  function navigate(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(
      buildCashflowSearchParams({ from: nextFrom, to: nextTo, year }),
    );
    setFilterPending(true);
    onNavigate(`/cashflow/avanzato?${params.toString()}`);
  }

  function tryCommit(nextFrom: string, nextTo: string) {
    if (!parseIsoDate(nextFrom) || !parseIsoDate(nextTo)) {
      return;
    }

    let fromIso = nextFrom;
    let toIso = nextTo;
    if (fromIso > toIso) {
      [fromIso, toIso] = [toIso, fromIso];
    }

    if (fromIso === from && toIso === to) {
      return;
    }

    navigate(fromIso, toIso);
  }

  function shiftMonth(delta: number) {
    const next = shiftMonthRange(from, delta);
    navigate(next.from, next.to);
  }

  const showPending = pending || filterPending;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese precedente"
        disabled={showPending}
        onClick={() => shiftMonth(-1)}
      >
        <ChevronLeftIcon />
      </Button>

      <FilterDatePicker
        id="range-from"
        label="Da"
        value={from}
        disabled={showPending}
        onCommit={(nextFrom) => tryCommit(nextFrom, to)}
      />

      <FilterDatePicker
        id="range-to"
        label="A"
        value={to}
        disabled={showPending}
        onCommit={(nextTo) => tryCommit(from, nextTo)}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese successivo"
        disabled={showPending}
        onClick={() => shiftMonth(1)}
      >
        <ChevronRightIcon />
      </Button>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "text-xs text-muted-foreground",
          !showPending && "sr-only",
        )}
      >
        {showPending ? "Aggiornamento…" : ""}
      </p>
    </div>
  );
}
