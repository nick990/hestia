"use client";

import type { CashflowView } from "@/lib/cashflow/view";
import { buildCashflowViewSearchParams } from "@/lib/cashflow/view";
import { buildCashflowSearchParams } from "@/lib/cashflow/date-range";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const VIEW_OPTIONS: Array<{ value: CashflowView; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "family", label: "Famiglia" },
  { value: "mine", label: "Solo miei" },
];

type ViewFilterProps = {
  view: CashflowView;
  from: string;
  to: string;
  year: number;
  hasFamily: boolean;
};

export function ViewFilter({ view, from, to, year, hasFamily }: ViewFilterProps) {
  const router = useRouter();

  if (!hasFamily) {
    return null;
  }

  function handleViewChange(nextView: CashflowView) {
    if (nextView === view) {
      return;
    }

    const params = buildCashflowViewSearchParams(
      new URLSearchParams(buildCashflowSearchParams({ from, to, year })),
      nextView,
    );
    router.push(`/cashflow?${params.toString()}`);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Vista movimenti"
      data-slot="button-group"
      className="inline-flex w-full rounded-lg border bg-muted/30 p-0.5"
    >
      {VIEW_OPTIONS.map((option) => {
        const selected = view === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            variant={selected ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 flex-1 rounded-md shadow-none",
              !selected && "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => handleViewChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
