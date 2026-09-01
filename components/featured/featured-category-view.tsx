"use client";

import { MovementFormDialog } from "@/components/cashflow/movement-form-dialog";
import { HomeMovements } from "@/components/home/home-movements";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/cashflow/format";
import { sortMovementsNewestFirst } from "@/lib/cashflow/sort-movements";
import { normalizeCategoryDisplay } from "@/lib/cashflow/table-filter";
import type { Movement } from "@/lib/cashflow/types";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { FeaturedCategorySettings } from "@/lib/featured/types";
import {
  compareSpendToBudget,
  computeBranchSpend,
} from "@/lib/featured/spend";
import type { FamilyMemberOption } from "@/lib/families/types";
import { cn } from "@/lib/utils";
import { PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type FeaturedCategoryViewProps = {
  hasFamily: boolean;
  settings: FeaturedCategorySettings | null;
  movements: Movement[];
  currentUserId: string;
  defaultOccurredOn: string;
  familyMembers: FamilyMemberOption[];
  categories: MovementCategoryOption[];
};

export function FeaturedCategoryView({
  hasFamily,
  settings,
  movements,
  currentUserId,
  defaultOccurredOn,
  familyMembers,
  categories,
}: FeaturedCategoryViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  const categoryName = settings?.category_name ?? null;
  const sortedMovements = useMemo(
    () => sortMovementsNewestFirst(movements),
    [movements],
  );
  const spent = useMemo(() => computeBranchSpend(sortedMovements), [sortedMovements]);
  const budget = settings?.budget ?? null;

  function openCreateDialog() {
    setEditingMovement(null);
    setDialogOpen(true);
  }

  function handleSelect(movement: Movement) {
    setEditingMovement(movement);
    setDialogOpen(true);
  }

  if (!hasFamily) {
    return (
      <div className="flex flex-col gap-4 px-3 py-4">
        <FeaturedEmptyState
          title="La categoria in evidenza è condivisa in famiglia"
          description="Quando farai parte di una famiglia, potrai scegliere una categoria da tenere d'occhio insieme agli altri membri."
        />
      </div>
    );
  }

  if (!categoryName) {
    return (
      <div className="flex flex-col gap-4 px-3 py-4">
        <FeaturedEmptyState
          title="Scegli una categoria in evidenza"
          description="Imposta la categoria che vuoi seguire da vicino — vacanze, ristrutturazione, o quello che vi serve in casa."
          action={
            <Button render={<Link href="/settings/categories" />} nativeButton={false}>
              <SettingsIcon className="size-4" />
              Vai alle impostazioni
            </Button>
          }
        />
      </div>
    );
  }

  const displayName = normalizeCategoryDisplay(categoryName);
  const budgetStatus =
    budget !== null ? compareSpendToBudget(spent, budget) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">{displayName}</h1>
        <p className="text-xs text-muted-foreground">
          Storico completo del ramo categoria
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border bg-card px-3 py-3">
          <p className="text-xs text-muted-foreground">Speso</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-destructive">
            {formatEuro(spent)}
          </p>
        </div>

        {budget !== null ? (
          <div className="rounded-lg border bg-card px-3 py-3">
            <p className="text-xs text-muted-foreground">Limite di spesa</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatEuro(budget)}
            </p>
            {budgetStatus ? (
              <p
                className={cn(
                  "mt-1 text-xs",
                  budgetStatus.kind === "over"
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {budgetStatus.kind === "within"
                  ? `${formatEuro(budgetStatus.remaining)} rimasti`
                  : budgetStatus.kind === "at_limit"
                    ? "Limite raggiunto"
                    : `${formatEuro(budgetStatus.overBy)} oltre il limite`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <HomeMovements
        movements={sortedMovements}
        hasFamily={hasFamily}
        onSelect={handleSelect}
        emptyTitle="Nessun movimento in questo ramo"
        emptyHint="Tocca + in basso a destra per registrare una spesa o un'entrata."
      />

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
        onOpenChange={setDialogOpen}
        editingMovement={editingMovement}
        defaultOccurredOn={defaultOccurredOn}
        hasFamily={hasFamily}
        currentUserId={currentUserId}
        familyMembers={familyMembers}
        categories={categories}
        lockedCategoryPrefix={categoryName}
      />
    </div>
  );
}

function FeaturedEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
