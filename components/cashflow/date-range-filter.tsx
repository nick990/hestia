"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildCashflowSearchParams, shiftMonthRange } from "@/lib/cashflow/date-range";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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
  function navigate(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(
      buildCashflowSearchParams({ from: nextFrom, to: nextTo, year }),
    );
    onNavigate(`/cashflow?${params.toString()}`);
  }

  function commitRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) {
      return;
    }
    navigate(nextFrom, nextTo);
  }

  function handleFromChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFrom = event.target.value;
    if (nextFrom && nextFrom !== from) {
      commitRange(nextFrom, to);
    }
  }

  function handleToChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextTo = event.target.value;
    if (nextTo && nextTo !== to) {
      commitRange(from, nextTo);
    }
  }

  function shiftMonth(delta: number) {
    const next = shiftMonthRange(from, delta);
    navigate(next.from, next.to);
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese precedente"
        disabled={pending}
        onClick={() => shiftMonth(-1)}
      >
        <ChevronLeftIcon />
      </Button>

      <div className="flex items-center gap-1.5">
        <Label htmlFor="range-from">Da</Label>
        <Input
          key={`range-from-${from}`}
          id="range-from"
          type="date"
          defaultValue={from}
          disabled={pending}
          onChange={handleFromChange}
          className="w-36"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Label htmlFor="range-to">A</Label>
        <Input
          key={`range-to-${to}`}
          id="range-to"
          type="date"
          defaultValue={to}
          disabled={pending}
          onChange={handleToChange}
          className="w-36"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese successivo"
        disabled={pending}
        onClick={() => shiftMonth(1)}
      >
        <ChevronRightIcon />
      </Button>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "text-xs text-muted-foreground",
          !pending && "sr-only",
        )}
      >
        {pending ? "Aggiornamento…" : ""}
      </p>
    </div>
  );
}
