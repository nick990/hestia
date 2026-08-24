"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildCashflowSearchParams, shiftMonthRange } from "@/lib/cashflow/date-range";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type DateRangeFilterProps = {
  from: string;
  to: string;
  year: number;
};

export function DateRangeFilter({ from, to, year }: DateRangeFilterProps) {
  const router = useRouter();

  function navigate(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(
      buildCashflowSearchParams({ from: nextFrom, to: nextTo, year }),
    );
    router.push(`/cashflow?${params.toString()}`);
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
    <div className="flex flex-wrap items-end gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese precedente"
        onClick={() => shiftMonth(-1)}
      >
        <ChevronLeftIcon />
      </Button>

      <div className="space-y-1">
        <Label htmlFor="range-from">Da</Label>
        <Input
          key={`range-from-${from}`}
          id="range-from"
          type="date"
          defaultValue={from}
          onChange={handleFromChange}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="range-to">A</Label>
        <Input
          key={`range-to-${to}`}
          id="range-to"
          type="date"
          defaultValue={to}
          onChange={handleToChange}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Periodo mese successivo"
        onClick={() => shiftMonth(1)}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
