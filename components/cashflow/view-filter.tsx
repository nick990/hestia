"use client";

import type { CashflowView } from "@/lib/cashflow/view";
import { buildCashflowViewSearchParams } from "@/lib/cashflow/view";
import { buildCashflowSearchParams } from "@/lib/cashflow/date-range";
import { buildShareSearchParams } from "@/lib/cashflow/share";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="family-share-quota"
              checked={share}
              onCheckedChange={(checked) => handleShareChange(checked === true)}
            />
            <Label htmlFor="family-share-quota" className="font-normal">
              Vista personale
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Uscite famiglia divise per {memberCount}{" "}
            {memberCount === 1 ? "membro" : "membri"}; entrate famiglia solo le
            tue; privati interi.
          </p>
        </div>
      ) : null}
    </div>
  );
}
