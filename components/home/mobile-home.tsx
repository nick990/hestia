"use client";

import { MovementFormDialog } from "@/components/cashflow/movement-form-dialog";
import {
  AssigneeFilterPanel,
  useAssigneeFilters,
} from "@/components/cashflow/assignee-filter-panel";
import {
  PeriodSummaryCards,
  type FilterSummaryState,
} from "@/components/cashflow/period-summary-cards";
import { RecentMovements } from "@/components/home/recent-movements";
import { Button } from "@/components/ui/button";
import {
  applyAssigneeFilters,
  summarizeFilteredMovements,
} from "@/lib/cashflow/assignee-filters";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { Movement } from "@/lib/cashflow/types";
import type { FamilyMemberOption } from "@/lib/families/types";
import { formatMonthYearLabel } from "@/lib/cashflow/month";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

type MobileHomeProps = {
  monthKey: string;
  from: string;
  to: string;
  year: number;
  allMovements: Movement[];
  hasFamily: boolean;
  currentUserId: string;
  defaultOccurredOn: string;
  familyMembers: FamilyMemberOption[];
  categories: MovementCategoryOption[];
  cashflowHref: string;
};

const EMPTY_FILTER_SUMMARY: FilterSummaryState = {
  active: false,
  summary: { totalIncome: 0, totalExpense: 0, net: 0 },
};

export function MobileHome({
  monthKey,
  allMovements,
  hasFamily,
  currentUserId,
  defaultOccurredOn,
  familyMembers,
  categories,
  cashflowHref,
}: MobileHomeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { filters, updateFilters, hydrated } = useAssigneeFilters(
    familyMembers,
    currentUserId,
    hasFamily,
  );

  const movements = useMemo(() => {
    if (!hasFamily || !hydrated) {
      return allMovements;
    }

    return applyAssigneeFilters(allMovements, filters, currentUserId);
  }, [allMovements, filters, currentUserId, hasFamily, hydrated]);

  const summary = useMemo(
    () => summarizeFilteredMovements(movements),
    [movements],
  );

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
        {hasFamily ? (
          <AssigneeFilterPanel
            variant="inline"
            compact
            filters={filters}
            members={familyMembers}
            currentUserId={currentUserId}
            onChange={updateFilters}
          />
        ) : null}
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
        familyMembers={familyMembers}
        categories={categories}
      />
    </div>
  );
}
