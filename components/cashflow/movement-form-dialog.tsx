"use client";

import {
  createMovement,
  updateMovement,
} from "@/app/actions/movements";
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
import type { Movement, MovementType } from "@/lib/cashflow/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type MovementFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMovement: Movement | null;
  defaultOccurredOn: string;
  hasFamily: boolean;
  currentUserId: string;
  categories: MovementCategoryOption[];
};

export function MovementFormDialog({
  open,
  onOpenChange,
  editingMovement,
  defaultOccurredOn,
  hasFamily,
  currentUserId,
  categories,
}: MovementFormDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(defaultOccurredOn);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [isPrivate, setIsPrivate] = useState(false);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingMovement) {
      setType(editingMovement.type);
      setAmount(String(editingMovement.amount));
      setOccurredOn(editingMovement.occurred_on);
      setDescription(editingMovement.description);
      setCategoryId(editingMovement.category_id ?? "none");
      setIsPrivate(editingMovement.scope === "private");
      return;
    }

    setType("expense");
    setAmount("");
    setOccurredOn(defaultOccurredOn);
    setDescription("");
    setCategoryId("none");
    setIsPrivate(false);
  }, [open, editingMovement, defaultOccurredOn]);

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
      onOpenChange(false);
      router.refresh();
    });
  }

  const canChangeVisibility =
    !editingMovement || editingMovement.user_id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              variant="outline"
              className={cn(
                "flex-1",
                type === "income" &&
                  "border-income/30 bg-income-muted text-income hover:bg-income-muted/80 hover:text-income",
              )}
              onClick={() => setType("income")}
            >
              Entrata
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1",
                type === "expense" &&
                  "border-destructive/30 bg-expense-muted text-destructive hover:bg-expense-muted/80 hover:text-destructive",
              )}
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
  );
}
