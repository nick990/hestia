"use client";

import {
  createMovement,
  deleteMovement,
  updateMovement,
} from "@/app/actions/movements";
import { DateRangeFilter } from "@/components/cashflow/date-range-filter";
import { MovementsTable } from "@/components/cashflow/movements-table";
import {
  PeriodSummaryCards,
  type FilterSummaryState,
} from "@/components/cashflow/period-summary-cards";
import { ViewFilter } from "@/components/cashflow/view-filter";
import { YearSummaryBar } from "@/components/cashflow/year-summary-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { MonthSummary, Movement, MovementType, YearSummary } from "@/lib/cashflow/types";
import type { CashflowView } from "@/lib/cashflow/view";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
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
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(defaultOccurredOn);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [isPrivate, setIsPrivate] = useState(false);
  const [filterSummary, setFilterSummary] = useState<FilterSummaryState>({
    active: false,
    summary: { totalIncome: 0, totalExpense: 0, net: 0 },
  });

  const handleFilterSummaryChange = useCallback((state: FilterSummaryState) => {
    setFilterSummary(state);
  }, []);

  const categorySelectItems = useMemo(
    () => [
      { value: "none", label: "Nessuna" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  function resetFormForCreate() {
    setEditingMovement(null);
    setType("expense");
    setAmount("");
    setOccurredOn(defaultOccurredOn);
    setDescription("");
    setCategoryId("none");
    setIsPrivate(false);
  }

  function openCreateDialog() {
    resetFormForCreate();
    setDialogOpen(true);
  }

  function openEditDialog(movement: Movement) {
    const raw = rawMovements.find((item) => item.id === movement.id) ?? movement;
    setEditingMovement(raw);
    setType(raw.type);
    setAmount(String(raw.amount));
    setOccurredOn(raw.occurred_on);
    setDescription(raw.description);
    setCategoryId(raw.category_id ?? "none");
    setIsPrivate(raw.scope === "private");
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);

    if (!open) {
      resetFormForCreate();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        type,
        amount,
        occurredOn,
        description,
        categoryId: categoryId === "none" ? null : categoryId,
        isPrivate: hasFamily ? isPrivate : true,
      };

      const result = editingMovement
        ? await updateMovement(editingMovement.id, payload)
        : await createMovement(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        editingMovement ? "Movimento aggiornato." : "Movimento aggiunto.",
      );
      setDialogOpen(false);
      resetFormForCreate();
      router.refresh();
    });
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

  const canChangeVisibility =
    !editingMovement || editingMovement.user_id === currentUserId;

  return (
    <div className="space-y-6">
      <ViewFilter
        view={view}
        share={share}
        memberCount={memberCount}
        from={from}
        to={to}
        year={year}
        hasFamily={hasFamily}
      />

      <YearSummaryBar
        yearSummary={yearSummary}
        rangeFrom={from}
        rangeTo={to}
        view={view}
        share={share}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <DateRangeFilter from={from} to={to} year={year} view={view} share={share} />

        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger render={<Button onClick={openCreateDialog} />}>
            Aggiungi movimento
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMovement ? "Modifica movimento" : "Aggiungi movimento"}
              </DialogTitle>
              <DialogDescription>
                Registra un&apos;entrata o un&apos;uscita per il periodo selezionato.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "income" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setType("income")}
                >
                  Entrata
                </Button>
                <Button
                  type="button"
                  variant={type === "expense" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setType("expense")}
                >
                  Uscita
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occurred-on">Data</Label>
                <Input
                  id="occurred-on"
                  type="date"
                  required
                  value={occurredOn}
                  onChange={(event) => setOccurredOn(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Importo</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={categoryId}
                  items={categorySelectItems}
                  onValueChange={(value) => setCategoryId(value ?? "none")}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Nessuna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione (opzionale)</Label>
                <Input
                  id="description"
                  maxLength={500}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              {hasFamily ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="movement-private"
                      checked={isPrivate}
                      disabled={!canChangeVisibility}
                      onCheckedChange={(checked) => setIsPrivate(checked === true)}
                    />
                    <Label htmlFor="movement-private" className="font-normal">
                      Privato
                    </Label>
                  </div>
                  {!canChangeVisibility ? (
                    <p className="text-xs text-muted-foreground">
                      Solo l&apos;autore può cambiare la visibilità
                    </p>
                  ) : null}
                </div>
              ) : null}
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Annulla
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvataggio…" : editingMovement ? "Salva" : "Aggiungi"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <PeriodSummaryCards summary={summary} filterSummary={filterSummary} />

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
      />
    </div>
  );
}
