"use client";

import { MovementFormDialog } from "@/components/cashflow/movement-form-dialog";
import {
  PeriodSummaryCards,
  type FilterSummaryState,
} from "@/components/cashflow/period-summary-cards";
import { ViewFilter } from "@/components/cashflow/view-filter";
import { RecentMovements } from "@/components/home/recent-movements";
import { Button } from "@/components/ui/button";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { MonthSummary, Movement } from "@/lib/cashflow/types";
import type { CashflowView } from "@/lib/cashflow/view";
import { formatMonthYearLabel } from "@/lib/cashflow/month";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

type MobileHomeProps = {
  monthKey: string;
  from: string;
  to: string;
  year: number;
  view: CashflowView;
  share: boolean;
  memberCount: number;
  summary: MonthSummary;
  movements: Movement[];
  hasFamily: boolean;
  currentUserId: string;
  defaultOccurredOn: string;
  categories: MovementCategoryOption[];
  cashflowHref: string;
};

const EMPTY_FILTER_SUMMARY: FilterSummaryState = {
  active: false,
  summary: { totalIncome: 0, totalExpense: 0, net: 0 },
};

export function MobileHome({
  monthKey,
  from,
  to,
  year,
  view,
  share,
  memberCount,
  summary,
  movements,
  hasFamily,
  currentUserId,
  defaultOccurredOn,
  categories,
  cashflowHref,
}: MobileHomeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-5 pb-20">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {formatMonthYearLabel(monthKey)}
        </h1>
      </header>

      <div className="space-y-2">
        <PeriodSummaryCards
          summary={summary}
          filterSummary={EMPTY_FILTER_SUMMARY}
          compact
        />
        <ViewFilter
          view={view}
          share={share}
          memberCount={memberCount}
          from={from}
          to={to}
          year={year}
          hasFamily={hasFamily}
          basePath="/"
          compact
        />
      </div>

      <RecentMovements
        movements={movements}
        hasFamily={hasFamily}
        cashflowHref={cashflowHref}
      />

      <Button
        type="button"
        className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-md"
        aria-label="Aggiungi movimento"
        onClick={() => setDialogOpen(true)}
      >
        <PlusIcon className="size-6" />
      </Button>

      <MovementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingMovement={null}
        defaultOccurredOn={defaultOccurredOn}
        hasFamily={hasFamily}
        currentUserId={currentUserId}
        categories={categories}
      />
    </div>
  );
}
