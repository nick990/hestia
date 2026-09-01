"use client";

import { deleteMovement } from "@/app/actions/movements";
import { AssigneeFilterPanel, useAssigneeFilters } from "@/components/cashflow/assignee-filter-panel";
import { CashflowSankeyDialog } from "@/components/cashflow/cashflow-sankey-dialog";
import { DateRangeFilter } from "@/components/cashflow/date-range-filter";
import { DeleteMovementDialog } from "@/components/cashflow/delete-movement-dialog";
import { MovementFormDialog } from "@/components/cashflow/movement-form-dialog";
import { MovementsTable } from "@/components/cashflow/movements-table";
import {
  TabbedNavLink,
  useTabNavigation,
} from "@/components/layout/tab-navigation";
import {
  PeriodSummaryCards,
  type FilterSummaryState,
} from "@/components/cashflow/period-summary-cards";
import { YearSummaryBar } from "@/components/cashflow/year-summary-bar";
import { Button } from "@/components/ui/button";
import {
  applyAssigneeFilters,
  buildYearSummaryFromMovements,
  summarizeFilteredMovements,
} from "@/lib/cashflow/assignee-filters";
import { buildCashflowHref } from "@/lib/cashflow/routes";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { Movement } from "@/lib/cashflow/types";
import type { FamilyMemberOption } from "@/lib/families/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { BarChart3, PlusIcon } from "lucide-react";
import { toast } from "sonner";

type MovementsManagerProps = {
  from: string;
  to: string;
  year: number;
  hasFamily: boolean;
  currentUserId: string;
  defaultOccurredOn: string;
  allMovements: Movement[];
  yearMovements: Movement[];
  familyMembers: FamilyMemberOption[];
  categories: MovementCategoryOption[];
};

export function MovementsManager({
  from,
  to,
  year,
  hasFamily,
  currentUserId,
  defaultOccurredOn,
  allMovements,
  yearMovements,
  familyMembers,
  categories,
}: MovementsManagerProps) {
  const router = useRouter();
  const { isPending, navigate } = useTabNavigation();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<Movement | null>(null);
  const [filterSummary, setFilterSummary] = useState<FilterSummaryState>({
    active: false,
    summary: { totalIncome: 0, totalExpense: 0, net: 0 },
  });
  const [filteredMovements, setFilteredMovements] = useState<Movement[]>([]);
  const [sankeyOpen, setSankeyOpen] = useState(false);

  const { filters, updateFilters, hydrated } = useAssigneeFilters(
    familyMembers,
    currentUserId,
    hasFamily,
  );

  const movements = useMemo(() => {
    if (!hasFamily) {
      return allMovements;
    }

    if (!hydrated) {
      return allMovements;
    }

    return applyAssigneeFilters(allMovements, filters, currentUserId);
  }, [allMovements, filters, currentUserId, hasFamily, hydrated]);

  const summary = useMemo(
    () => summarizeFilteredMovements(movements),
    [movements],
  );

  const yearSummary = useMemo(() => {
    const filteredYear = hasFamily && hydrated
      ? applyAssigneeFilters(yearMovements, filters, currentUserId)
      : yearMovements;

    return buildYearSummaryFromMovements(year, filteredYear);
  }, [
    yearMovements,
    filters,
    currentUserId,
    hasFamily,
    hydrated,
    year,
  ]);

  const handleFilterSummaryChange = useCallback((state: FilterSummaryState) => {
    setFilterSummary(state);
  }, []);

  const handleFilteredMovementsChange = useCallback((next: Movement[]) => {
    setFilteredMovements(next);
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      navigate(href);
    },
    [navigate],
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

  function handleConfirmDelete() {
    if (!movementToDelete) {
      return;
    }

    const id = movementToDelete.id;

    startTransition(async () => {
      const result = await deleteMovement(id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Movimento eliminato.");
      setMovementToDelete(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8 pb-20 sm:pb-0">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DateRangeFilter
            from={from}
            to={to}
            year={year}
            pending={isPending}
            onNavigate={handleNavigate}
          />
          <Button
            type="button"
            className="hidden shrink-0 sm:inline-flex"
            disabled={isPending}
            onClick={openCreateDialog}
          >
            Aggiungi movimento
          </Button>
        </div>

        {hasFamily ? (
          <AssigneeFilterPanel
            filters={filters}
            members={familyMembers}
            currentUserId={currentUserId}
            onChange={updateFilters}
          />
        ) : null}

        <PeriodSummaryCards summary={summary} filterSummary={filterSummary} />
      </section>

      <YearSummaryBar
        yearSummary={yearSummary}
        rangeFrom={from}
        rangeTo={to}
        pending={isPending}
        onNavigate={handleNavigate}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium">Movimenti</p>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || filteredMovements.length === 0}
            onClick={() => setSankeyOpen(true)}
          >
            <BarChart3 className="size-4" />
            Grafico Sankey
          </Button>
        </div>

        <MovementsTable
          movements={movements}
          from={from}
          to={to}
          hasFamily={hasFamily}
          pending={pending || isPending}
          onEdit={openEditDialog}
          onDelete={setMovementToDelete}
          onCreate={openCreateDialog}
          onFilterSummaryChange={handleFilterSummaryChange}
          onFilteredMovementsChange={handleFilteredMovementsChange}
        />
      </section>

      <p className="text-center">
        <TabbedNavLink
          href={buildCashflowHref({ from, to })}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Vista semplificata
        </TabbedNavLink>
      </p>

      <Button
        type="button"
        className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-md sm:hidden"
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

      <DeleteMovementDialog
        movement={movementToDelete}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) {
            setMovementToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />

      <CashflowSankeyDialog
        open={sankeyOpen}
        onOpenChange={setSankeyOpen}
        movements={filteredMovements}
        from={from}
        to={to}
        filtersActive={filterSummary.active}
      />
    </div>
  );
}
