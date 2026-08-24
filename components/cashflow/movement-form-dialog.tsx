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
import type { FamilyMemberOption } from "@/lib/families/types";
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
  familyMembers: FamilyMemberOption[];
  categories: MovementCategoryOption[];
};

function createDefaults(
  editingMovement: Movement | null,
  defaultOccurredOn: string,
  hasFamily: boolean,
  currentUserId: string,
) {
  if (editingMovement) {
    return {
      type: editingMovement.type,
      amount: String(editingMovement.amount),
      occurredOn: editingMovement.occurred_on,
      description: editingMovement.description,
      categoryId: editingMovement.category_id ?? "none",
      isFamily: editingMovement.assignee_kind === "family",
      assigneeUserId: editingMovement.assignee_user_id ?? currentUserId,
      isPrivate: editingMovement.is_private,
    };
  }

  return {
    type: "expense" as MovementType,
    amount: "",
    occurredOn: defaultOccurredOn,
    description: "",
    categoryId: "none",
    isFamily: hasFamily,
    assigneeUserId: currentUserId,
    isPrivate: false,
  };
}

export function MovementFormDialog({
  open,
  onOpenChange,
  editingMovement,
  defaultOccurredOn,
  hasFamily,
  currentUserId,
  familyMembers,
  categories,
}: MovementFormDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(defaultOccurredOn);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [isFamily, setIsFamily] = useState(true);
  const [assigneeUserId, setAssigneeUserId] = useState(currentUserId);
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

  const assigneeSelectItems = useMemo(
    () =>
      familyMembers.map((member) => ({
        value: member.user_id,
        label: member.display_name,
      })),
    [familyMembers],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaults = createDefaults(
      editingMovement,
      defaultOccurredOn,
      hasFamily,
      currentUserId,
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens
    setType(defaults.type);
    setAmount(defaults.amount);
    setOccurredOn(defaults.occurredOn);
    setDescription(defaults.description);
    setCategoryId(defaults.categoryId);
    setIsFamily(defaults.isFamily);
    setAssigneeUserId(defaults.assigneeUserId);
    setIsPrivate(defaults.isPrivate);
  }, [open, editingMovement, defaultOccurredOn, hasFamily, currentUserId]);

  function handleTypeChange(nextType: MovementType) {
    setType(nextType);

    if (editingMovement) {
      return;
    }

    if (nextType === "expense" && hasFamily) {
      setIsFamily(true);
      setIsPrivate(false);
      return;
    }

    if (nextType === "income") {
      setIsFamily(false);
      setAssigneeUserId(currentUserId);
      setIsPrivate(false);
    }
  }

  function handleFamilyChange(checked: boolean) {
    setIsFamily(checked);

    if (checked) {
      setIsPrivate(false);
    }
  }

  function handleAssigneeChange(userId: string) {
    setAssigneeUserId(userId);

    if (userId !== currentUserId) {
      setIsPrivate(false);
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
        isFamily: hasFamily ? isFamily : false,
        assigneeUserId: hasFamily && !isFamily ? assigneeUserId : currentUserId,
        isPrivate: !isFamily && assigneeUserId === currentUserId && isPrivate,
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

  const canSetPrivate = !isFamily && assigneeUserId === currentUserId;

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
              onClick={() => handleTypeChange("income")}
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
              onClick={() => handleTypeChange("expense")}
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
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="movement-family"
                  checked={isFamily}
                  onCheckedChange={(checked) =>
                    handleFamilyChange(checked === true)
                  }
                />
                <Label htmlFor="movement-family" className="font-normal">
                  Di famiglia
                </Label>
              </div>
              {!isFamily ? (
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assegnatario</Label>
                  <Select
                    value={assigneeUserId}
                    items={assigneeSelectItems}
                    onValueChange={(value) =>
                      handleAssigneeChange(value ?? currentUserId)
                    }
                  >
                    <SelectTrigger id="assignee" className="w-full">
                      <SelectValue placeholder="Seleziona membro" />
                    </SelectTrigger>
                    <SelectContent>
                      {familyMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {canSetPrivate ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="movement-private"
                    checked={isPrivate}
                    onCheckedChange={(checked) => setIsPrivate(checked === true)}
                  />
                  <Label htmlFor="movement-private" className="font-normal">
                    Privato
                  </Label>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Checkbox
                id="movement-private-solo"
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked === true)}
              />
              <Label htmlFor="movement-private-solo" className="font-normal">
                Privato
              </Label>
            </div>
          )}
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
