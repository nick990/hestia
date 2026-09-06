"use client";

import {
  createMovement,
  deleteMovement,
  updateMovement,
} from "@/app/actions/movements";
import { loadMovementSplit } from "@/app/actions/movement-split";
import { CategoryPicker } from "@/components/cashflow/category-picker";
import { DeleteMovementDialog } from "@/components/cashflow/delete-movement-dialog";
import { MovementSplitFields } from "@/components/cashflow/movement-split-fields";
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
import type { MovementSplitInput, SplitMode } from "@/lib/saldi/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

const FAMILY_ASSIGNEE_VALUE = "family";

function parseMovementAmount(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

type MovementFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMovement: Movement | null;
  defaultOccurredOn: string;
  hasFamily: boolean;
  currentUserId: string;
  familyMembers: FamilyMemberOption[];
  categories: MovementCategoryOption[];
  lockedCategoryPrefix?: string;
};

function createDefaults(
  editingMovement: Movement | null,
  defaultOccurredOn: string,
  hasFamily: boolean,
  currentUserId: string,
  categories: MovementCategoryOption[],
  lockedCategoryPrefix?: string,
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

  let categoryId = "none";

  if (lockedCategoryPrefix) {
    const root = categories.find(
      (category) => category.name === lockedCategoryPrefix,
    );
    categoryId = root?.id ?? "none";
  }

  return {
    type: "expense" as MovementType,
    amount: "",
    occurredOn: defaultOccurredOn,
    description: "",
    categoryId,
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
  lockedCategoryPrefix,
}: MovementFormDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [type, setType] = useState<MovementType>("expense");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(defaultOccurredOn);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [isFamily, setIsFamily] = useState(true);
  const [assigneeUserId, setAssigneeUserId] = useState(currentUserId);
  const [isPrivate, setIsPrivate] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [payerUserId, setPayerUserId] = useState(currentUserId);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [amountByUserId, setAmountByUserId] = useState<Record<string, string>>(
    {},
  );

  const assigneeSelectItems = useMemo(
    () => [
      { value: FAMILY_ASSIGNEE_VALUE, label: "Di famiglia" },
      ...familyMembers.map((member) => ({
        value: member.user_id,
        label: member.display_name,
      })),
    ],
    [familyMembers],
  );

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form and confirm state when the dialog opens or closes
      setConfirmingDelete(false);
      return;
    }

    const defaults = createDefaults(
      editingMovement,
      defaultOccurredOn,
      hasFamily,
      currentUserId,
      categories,
      lockedCategoryPrefix,
    );

    setType(defaults.type);
    setAmount(defaults.amount);
    setOccurredOn(defaults.occurredOn);
    setDescription(defaults.description);
    setCategoryId(defaults.categoryId);
    setIsFamily(defaults.isFamily);
    setAssigneeUserId(defaults.assigneeUserId);
    setIsPrivate(defaults.isPrivate);
    setSplitEnabled(false);
    setSplitMode("equal");
    setSelectedMemberIds(familyMembers.map((member) => member.user_id));
    setAmountByUserId({});
    setPayerUserId(
      defaults.isFamily ? currentUserId : defaults.assigneeUserId,
    );

    if (!editingMovement) {
      return;
    }

    let cancelled = false;

    void loadMovementSplit(editingMovement.id).then((split) => {
      if (cancelled || !split) {
        return;
      }

      setSplitEnabled(true);
      setPayerUserId(split.payerUserId);
      setSplitMode(split.splitMode);
      setSelectedMemberIds(split.shares.map((share) => share.userId));
      setAmountByUserId(
        Object.fromEntries(
          split.shares.map((share) => [
            share.userId,
            String(share.amount).replace(".", ","),
          ]),
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [open, editingMovement, defaultOccurredOn, hasFamily, currentUserId, categories, lockedCategoryPrefix, familyMembers]);

  function handleTypeChange(nextType: MovementType) {
    setType(nextType);

    if (nextType === "income") {
      setSplitEnabled(false);
    }

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

  function handleAssigneeChange(value: string) {
    if (value === FAMILY_ASSIGNEE_VALUE) {
      setIsFamily(true);
      setIsPrivate(false);
      return;
    }

    setIsFamily(false);
    setAssigneeUserId(value);

    if (value !== currentUserId) {
      setIsPrivate(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const showSplit = hasFamily && type === "expense" && !isPrivate;

    if (showSplit && splitEnabled && selectedMemberIds.length === 0) {
      toast.error("Ripartisci spesa richiede almeno un membro.");
      return;
    }

    const split: MovementSplitInput =
      showSplit && splitEnabled
        ? {
            enabled: true,
            payerUserId,
            splitMode,
            shares: selectedMemberIds.map((userId) => ({
              userId,
              amount:
                splitMode === "amount"
                  ? Number(
                      amountByUserId[userId]?.trim().replace(",", ".") || "NaN",
                    )
                  : undefined,
            })),
          }
        : { enabled: false };

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
        split,
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

  function handleConfirmDelete() {
    if (!editingMovement) {
      return;
    }

    const id = editingMovement.id;

    startTransition(async () => {
      const result = await deleteMovement(id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Movimento eliminato.");
      setConfirmingDelete(false);
      onOpenChange(false);
      router.refresh();
    });
  }

  const canSetPrivate = !isFamily && assigneeUserId === currentUserId;
  const showSplitSection = hasFamily && type === "expense" && !isPrivate;
  const parsedAmount = parseMovementAmount(amount);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent initialFocus={false}>
        <DialogHeader className="pr-8">
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
            <CategoryPicker
              id="category"
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              lockedCategoryPrefix={lockedCategoryPrefix}
            />
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
              <div className="space-y-2">
                <Label htmlFor="assignee">Assegnatario</Label>
                <Select
                  modal={false}
                  value={isFamily ? FAMILY_ASSIGNEE_VALUE : assigneeUserId}
                  items={assigneeSelectItems}
                  onValueChange={(value) => {
                    if (value) {
                      handleAssigneeChange(value);
                    }
                  }}
                >
                  <SelectTrigger id="assignee" className="w-full">
                    <SelectValue placeholder="Seleziona assegnatario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FAMILY_ASSIGNEE_VALUE}>
                      Di famiglia
                    </SelectItem>
                    {familyMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="movement-private"
                  checked={isPrivate}
                  disabled={!canSetPrivate || splitEnabled}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setIsPrivate(next);

                    if (next) {
                      setSplitEnabled(false);
                    }
                  }}
                />
                <Label htmlFor="movement-private" className="font-normal">
                  Privato
                </Label>
              </div>
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
          {showSplitSection ? (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Ripartizione</span>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="split-enabled"
                    checked={splitEnabled}
                    onCheckedChange={(checked) => {
                      const next = checked === true;
                      setSplitEnabled(next);

                      if (next) {
                        setPayerUserId(
                          isFamily ? currentUserId : assigneeUserId,
                        );
                        setSplitMode("equal");
                        setSelectedMemberIds(
                          familyMembers.map((member) => member.user_id),
                        );
                      }
                    }}
                  />
                  <Label htmlFor="split-enabled" className="font-normal">
                    Ripartisci spesa
                  </Label>
                </div>
              </div>
              {splitEnabled ? (
                <MovementSplitFields
                  familyMembers={familyMembers}
                  payerUserId={payerUserId}
                  onPayerChange={setPayerUserId}
                  splitMode={splitMode}
                  onSplitModeChange={setSplitMode}
                  selectedMemberIds={selectedMemberIds}
                  onToggleMember={(userId, checked) => {
                    setSelectedMemberIds((current) =>
                      familyMembers
                        .map((member) => member.user_id)
                        .filter((id) =>
                          id === userId ? checked : current.includes(id),
                        ),
                    );
                  }}
                  amountByUserId={amountByUserId}
                  onAmountChange={(userId, value) => {
                    setAmountByUserId((current) => ({
                      ...current,
                      [userId]: value,
                    }));
                  }}
                  movementAmount={parsedAmount}
                />
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            {editingMovement ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:hidden"
                  disabled={pending}
                  onClick={() => setConfirmingDelete(true)}
                >
                  Elimina
                </Button>
                <div
                  role="separator"
                  className="-mx-4 h-px bg-border sm:hidden"
                />
              </>
            ) : null}
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
    <DeleteMovementDialog
      movement={confirmingDelete ? editingMovement : null}
      pending={pending}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmingDelete(false);
        }
      }}
      onConfirm={handleConfirmDelete}
    />
    </>
  );
}
