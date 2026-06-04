"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildCashflowSearchParams, shiftMonthRange } from "@/lib/cashflow/date-range";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DateRangeFilterProps = {
  from: string;
  to: string;
  year: number;
};

export function DateRangeFilter({ from, to, year }: DateRangeFilterProps) {
  const router = useRouter();
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  function navigate(nextFrom: string, nextTo: string) {
    router.push(
      `/cashflow?${buildCashflowSearchParams({ from: nextFrom, to: nextTo, year })}`,
    );
  }

  function commitRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) {
      return;
    }
    navigate(nextFrom, nextTo);
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
          id="range-from"
          type="date"
          value={localFrom}
          onChange={(event) => setLocalFrom(event.target.value)}
          onBlur={() => commitRange(localFrom, localTo)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="range-to">A</Label>
        <Input
          id="range-to"
          type="date"
          value={localTo}
          onChange={(event) => setLocalTo(event.target.value)}
          onBlur={() => commitRange(localFrom, localTo)}
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
