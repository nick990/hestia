"use client";

import { deleteMovement } from "@/app/actions/movements";
import { DateRangeFilter } from "@/components/cashflow/date-range-filter";
import { CashflowSankeyDialog } from "@/components/cashflow/cashflow-sankey-dialog";
import { MovementFormDialog } from "@/components/cashflow/movement-form-dialog";
import { MovementsTable } from "@/components/cashflow/movements-table";
import {
  PeriodSummaryCards,
  type FilterSummaryState,
} from "@/components/cashflow/period-summary-cards";
import { ViewFilter } from "@/components/cashflow/view-filter";
import { YearSummaryBar } from "@/components/cashflow/year-summary-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { MonthSummary, Movement, YearSummary } from "@/lib/cashflow/types";
import type { CashflowView } from "@/lib/cashflow/view";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { BarChart3, PlusIcon } from "lucide-react";
import { toast } from "sonner";

type MovementsManagerProps = {
  from: string;
  to: string;
  year: number;
  view: CashflowView;
  share: boolean;
  memberCount: number;
  hasFamily: boolean;
  currentUserId: string;
  defaultOccurredOn: string;
  movements: Movement[];
  rawMovements: Movement[];
  summary: MonthSummary;
  yearSummary: YearSummary;
  categories: MovementCategoryOption[];
};

export function MovementsManager({
  from,
  to,
  year,
  view,
  share,
  memberCount,
  hasFamily,
  currentUserId,
  defaultOccurredOn,
  movements,
  rawMovements,
  summary,
  yearSummary,
  categories,
}: MovementsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<Movement | null>(null);
  const [filterSummary, setFilterSummary] = useState<FilterSummaryState>({
    active: false,
    summary: { totalIncome: 0, totalExpense: 0, net: 0 },
  });
  const [filteredMovements, setFilteredMovements] = useState<Movement[]>(movements);
  const [sankeyOpen, setSankeyOpen] = useState(false);

  const handleFilterSummaryChange = useCallback((state: FilterSummaryState) => {
    setFilterSummary(state);
  }, []);

  const handleFilteredMovementsChange = useCallback((next: Movement[]) => {
    setFilteredMovements(next);
  }, []);

  function openCreateDialog() {
    setEditingMovement(null);
    setDialogOpen(true);
  }

  function openEditDialog(movement: Movement) {
    const raw = rawMovements.find((item) => item.id === movement.id) ?? movement;
    setEditingMovement(raw);
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
      <section className="space-y-4">
        <ViewFilter
          view={view}
          share={share}
          memberCount={memberCount}
          from={from}
          to={to}
          year={year}
          hasFamily={hasFamily}
        />

        <PeriodSummaryCards summary={summary} filterSummary={filterSummary} />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <DateRangeFilter from={from} to={to} year={year} view={view} share={share} />
          <Button
            type="button"
            className="hidden shrink-0 sm:inline-flex"
            onClick={openCreateDialog}
          >
            Aggiungi movimento
          </Button>
        </div>
      </section>

      <YearSummaryBar
        yearSummary={yearSummary}
        rangeFrom={from}
        rangeTo={to}
        view={view}
        share={share}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium">Movimenti</p>
          <Button
            type="button"
            variant="outline"
            disabled={filteredMovements.length === 0}
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
          view={view}
          pending={pending}
          onEdit={openEditDialog}
          onDelete={setMovementToDelete}
          onCreate={openCreateDialog}
          onFilterSummaryChange={handleFilterSummaryChange}
          onFilteredMovementsChange={handleFilteredMovementsChange}
        />
      </section>

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
        categories={categories}
      />

      <Dialog
        open={movementToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMovementToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina movimento</DialogTitle>
            <DialogDescription>
              Stai per eliminare{" "}
              <span className="font-medium text-foreground">
                {movementToDelete?.description?.trim()
                  ? movementToDelete.description
                  : "questo movimento"}
              </span>
              . Questa azione è irreversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setMovementToDelete(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={handleConfirmDelete}
            >
              {pending ? "Eliminazione…" : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
