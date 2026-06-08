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
  basePath?: "/" | "/cashflow";
  compact?: boolean;
};

export function ViewFilter({
  view,
  share,
  memberCount,
  from,
  to,
  year,
  hasFamily,
  basePath = "/cashflow",
  compact = false,
}: ViewFilterProps) {
  const router = useRouter();

  if (!hasFamily) {
    return null;
  }

  function buildNavigationParams(nextView: CashflowView, nextShare: boolean) {
    if (basePath === "/") {
      const next = buildShareSearchParams(
        buildCashflowViewSearchParams(new URLSearchParams(), nextView),
        nextShare,
      );
      return next;
    }

    return buildShareSearchParams(
      buildCashflowViewSearchParams(
        new URLSearchParams(buildCashflowSearchParams({ from, to, year })),
        nextView,
      ),
      nextShare,
    );
  }

  function navigate(nextView: CashflowView, nextShare: boolean) {
    const params = buildNavigationParams(nextView, nextShare);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  function handleViewChange(nextView: CashflowView) {
    if (nextView === view) {
      return;
    }
    navigate(nextView, share);
  }

  function handleShareChange(nextShare: boolean) {
    if (nextShare === share) {
      return;
    }
    navigate(view, nextShare);
  }

  const showShareToggle = basePath === "/cashflow" && (view === "all" || view === "family");
  const memberLabel = memberCount === 1 ? "membro" : "membri";

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3")}>
      <div
        role="radiogroup"
        aria-label="Vista movimenti"
        data-slot="button-group"
        className={cn(
          "inline-flex w-full border bg-muted/30 p-0.5",
          compact ? "rounded-md" : "rounded-lg",
        )}
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
              size={compact ? "xs" : "sm"}
              className={cn(
                "flex-1 shadow-none",
                compact ? "h-7 rounded-sm text-xs" : "h-8 rounded-md",
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
