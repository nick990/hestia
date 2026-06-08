"use client";

import type { CashflowView } from "@/lib/cashflow/view";
import { buildCashflowViewSearchParams } from "@/lib/cashflow/view";
import { buildCashflowSearchParams } from "@/lib/cashflow/date-range";
import { buildShareSearchParams } from "@/lib/cashflow/share";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const VIEW_OPTIONS: Array<{ value: CashflowView; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "family", label: "Famiglia" },
  { value: "private", label: "Privati" },
];

type ViewFilterProps = {
  view: CashflowView;
  share: boolean;
  memberCount: number;
  from: string;
  to: string;
  year: number;
  hasFamily: boolean;
};

export function ViewFilter({
  view,
  share,
  memberCount,
  from,
  to,
  year,
  hasFamily,
}: ViewFilterProps) {
  const router = useRouter();

  if (!hasFamily) {
    return null;
  }

  function buildNavigationParams(nextView: CashflowView, nextShare: boolean) {
    return buildShareSearchParams(
      buildCashflowViewSearchParams(
        new URLSearchParams(buildCashflowSearchParams({ from, to, year })),
        nextView,
      ),
      nextShare,
    );
  }

  function handleViewChange(nextView: CashflowView) {
    if (nextView === view) {
      return;
    }
    router.push(
      `/cashflow?${buildNavigationParams(nextView, share).toString()}`,
    );
  }

  function handleShareChange(nextShare: boolean) {
    if (nextShare === share) {
      return;
    }
    router.push(
      `/cashflow?${buildNavigationParams(view, nextShare).toString()}`,
    );
  }

  const showShareToggle = view === "all" || view === "family";
  const memberLabel = memberCount === 1 ? "membro" : "membri";

  return (
    <div className="space-y-3">
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

      {showShareToggle ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id="family-share-quota"
            checked={share}
            onCheckedChange={(checked) => handleShareChange(checked === true)}
          />
          <Label htmlFor="family-share-quota" className="font-normal">
            Ripartisci spese famiglia
          </Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Come funziona la ripartizione spese"
                />
              }
            >
              <InfoIcon />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <PopoverHeader>
                <PopoverTitle>Ripartizione spese famiglia</PopoverTitle>
                <PopoverDescription className="space-y-2 text-xs leading-relaxed">
                  <span className="block">
                    Uscite condivise divise per {memberCount} {memberLabel}.
                  </span>
                  <span className="block">
                    Entrate famiglia: contano solo le tue.
                  </span>
                  <span className="block">
                    Movimenti privati: importo intero, sempre tuo.
                  </span>
                </PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}
    </div>
  );
}
