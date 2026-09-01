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
import { HomeMovements } from "@/components/home/home-movements";
import {
  TabbedNavLink,
  useTabNavigation,
} from "@/components/layout/tab-navigation";
import { Button } from "@/components/ui/button";
import {
  applyAssigneeFilters,
  summarizeFilteredMovements,
} from "@/lib/cashflow/assignee-filters";
import { shiftMonthRange } from "@/lib/cashflow/date-range";
import {
  buildCashflowAdvancedHref,
  buildCashflowHref,
} from "@/lib/cashflow/routes";
import { sortMovementsNewestFirst } from "@/lib/cashflow/sort-movements";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { Movement } from "@/lib/cashflow/types";
import type { FamilyMemberOption } from "@/lib/families/types";
import { formatMonthYearLabel } from "@/lib/cashflow/month";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

type MobileHomeProps = {
  monthKey: string;
  from: string;
  to: string;
  allMovements: Movement[];
  hasFamily: boolean;
  currentUserId: string;
  defaultOccurredOn: string;
  familyMembers: FamilyMemberOption[];
  categories: MovementCategoryOption[];
};

const EMPTY_FILTER_SUMMARY: FilterSummaryState = {
  active: false,
  summary: { totalIncome: 0, totalExpense: 0, net: 0 },
};

export function MobileHome({
  monthKey,
  from,
  to,
  allMovements,
  hasFamily,
  currentUserId,
  defaultOccurredOn,
  familyMembers,
  categories,
}: MobileHomeProps) {
  const { isPending, navigate } = useTabNavigation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const { filters, updateFilters, hydrated } = useAssigneeFilters(
    familyMembers,
    currentUserId,
    hasFamily,
  );

  const movements = useMemo(() => {
    const filtered =
      !hasFamily || !hydrated
        ? allMovements
        : applyAssigneeFilters(allMovements, filters, currentUserId);

    return sortMovementsNewestFirst(filtered);
  }, [allMovements, filters, currentUserId, hasFamily, hydrated]);

  const summary = useMemo(
    () => summarizeFilteredMovements(movements),
    [movements],
  );

  function openCreateDialog() {
    setEditingMovement(null);
    setDialogOpen(true);
  }

  function openEditDialog(movement: Movement) {
    setEditingMovement(movement);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);

    if (!open) {
      setEditingMovement(null);
    }
  }

  function shiftMonth(delta: number) {
    const next = shiftMonthRange(from, delta);
    navigate(buildCashflowHref({ from: next.from, to: next.to }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6 pb-24">
      <header className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mese precedente"
          disabled={isPending}
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {formatMonthYearLabel(monthKey)}
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mese successivo"
          disabled={isPending}
          onClick={() => shiftMonth(1)}
        >
          <ChevronRightIcon />
        </Button>
      </header>

      {hasFamily ? (
        <AssigneeFilterPanel
          filters={filters}
          members={familyMembers}
          currentUserId={currentUserId}
          onChange={updateFilters}
        />
      ) : null}

      <div className="flex min-h-0 flex-col gap-4">
        <PeriodSummaryCards
          summary={summary}
          filterSummary={EMPTY_FILTER_SUMMARY}
          compact
        />

        <HomeMovements
          movements={movements}
          hasFamily={hasFamily}
          onSelect={openEditDialog}
        />
      </div>

      <p className="text-center">
        <TabbedNavLink
          href={buildCashflowAdvancedHref({
            from,
            to,
            year: Number(from.slice(0, 4)),
          })}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Vista avanzata
        </TabbedNavLink>
      </p>

      <Button
        type="button"
        className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-md"
        aria-label="Aggiungi movimento"
        onClick={openCreateDialog}
      >
        <PlusIcon className="size-6" />
      </Button>

      <MovementFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        editingMovement={editingMovement}
        defaultOccurredOn={defaultOccurredOn}
        hasFamily={hasFamily}
        currentUserId={currentUserId}
        familyMembers={familyMembers}
        categories={categories}
      />
    </div>
  );
}
