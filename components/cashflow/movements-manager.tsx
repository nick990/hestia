"use client";

import {
  createMovement,
  deleteMovement,
  updateMovement,
} from "@/app/actions/movements";
import { DateRangeFilter } from "@/components/cashflow/date-range-filter";
import { YearSummaryBar } from "@/components/cashflow/year-summary-bar";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatEuro,
  formatOccurredOn,
  formatSignedAmount,
} from "@/lib/cashflow/format";
import type { MovementCategoryOption } from "@/lib/categories/types";
import type { MonthSummary, Movement, MovementType, YearSummary } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";
import { MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type MovementsManagerProps = {
  from: string;
  to: string;
  year: number;
  defaultOccurredOn: string;
  movements: Movement[];
  summary: MonthSummary;
  yearSummary: YearSummary;
  categories: MovementCategoryOption[];
};

export function MovementsManager({
  from,
  to,
  year,
  defaultOccurredOn,
  movements,
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
  }

  function openCreateDialog() {
    resetFormForCreate();
    setDialogOpen(true);
  }

  function openEditDialog(movement: Movement) {
    setEditingMovement(movement);
    setType(movement.type);
    setAmount(String(movement.amount));
    setOccurredOn(movement.occurred_on);
    setDescription(movement.description);
    setCategoryId(movement.category_id ?? "none");
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

  return (
    <div className="space-y-6">
      <YearSummaryBar
        yearSummary={yearSummary}
        rangeFrom={from}
        rangeTo={to}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <DateRangeFilter from={from} to={to} year={year} />

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Entrate</p>
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-500">
            {formatEuro(summary.totalIncome)}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Uscite</p>
          <p className="text-lg font-semibold">{formatEuro(summary.totalExpense)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Netto</p>
          <p
            className={cn(
              "text-lg font-semibold",
              summary.net >= 0
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-destructive",
            )}
          >
            {formatEuro(summary.net)}
          </p>
          <p className="text-xs text-muted-foreground">entrate − uscite</p>
        </div>
      </div>

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

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-right">Importo</TableHead>
              <TableHead className="w-12 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="space-y-3 py-8 text-center text-muted-foreground"
                >
                  <p>Nessun movimento nel periodo selezionato.</p>
                  <Button type="button" variant="outline" size="sm" onClick={openCreateDialog}>
                    Aggiungi movimento
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatOccurredOn(movement.occurred_on)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.category_name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">
                    {movement.description?.trim() ? movement.description : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium whitespace-nowrap",
                      movement.type === "income"
                        ? "text-emerald-600 dark:text-emerald-500"
                        : "text-destructive",
                    )}
                  >
                    {formatSignedAmount(movement.type, movement.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={pending}
                            aria-label="Azioni movimento"
                          />
                        }
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(movement)}>
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setMovementToDelete(movement)}
                        >
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
