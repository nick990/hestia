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
import { Button } from "@/components/ui/button";
import {
  applyAssigneeFilters,
  summarizeFilteredMovements,
} from "@/lib/cashflow/assignee-filters";
import { shiftMonthRange } from "@/lib/cashflow/date-range";
import { sortMovementsNewestFirst } from "@/lib/cashflow/sort-movements";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { Movement } from "@/lib/cashflow/types";
import type { FamilyMemberOption } from "@/lib/families/types";
import { formatMonthYearLabel } from "@/lib/cashflow/month";
import { buildHomeHref } from "@/lib/home/tab";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";

type MobileHomeProps = {
  monthKey: string;
  from: string;
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
  allMovements,
  hasFamily,
  currentUserId,
  defaultOccurredOn,
  familyMembers,
  categories,
}: MobileHomeProps) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [visibleMonthKey, setVisibleMonthKey] = useOptimistic(monthKey);
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

    startNavigation(() => {
      setVisibleMonthKey(next.from.slice(0, 7));
      router.push(
        buildHomeHref({
          tab: "cashflow",
          from: next.from,
          to: next.to,
        }),
      );
    });
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 p-6 pb-24"
      aria-busy={navigating}
    >
      <header className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mese precedente"
          disabled={navigating}
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {formatMonthYearLabel(visibleMonthKey)}
          </h1>
          <p
            role="status"
            aria-live="polite"
            className={cn("text-xs text-muted-foreground", !navigating && "sr-only")}
          >
            {navigating ? "Aggiornamento…" : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mese successivo"
          disabled={navigating}
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

      <div
        className={cn(
          "flex min-h-0 flex-col gap-4 transition-opacity duration-200 motion-reduce:transition-none",
          navigating && "pointer-events-none opacity-60",
        )}
      >
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
