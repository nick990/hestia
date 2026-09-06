"use client";

import { Button } from "@/components/ui/button";
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
import { reimbursementFormDefaults } from "@/lib/saldi/presentation";
import type { FamilySaldiMember } from "@/lib/saldi/types";
import { useEffect, useMemo, useState } from "react";

export type ReimbursementSubmitInput = {
  fromUserId: string;
  toUserId: string;
  amount: string;
  occurredOn: string;
};

type ReimbursementDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  members: FamilySaldiMember[];
  today: string;
  createDefaults: {
    fromUserId: string;
    toUserId: string;
    amount: number | null;
  };
  editing: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    occurredOn: string;
  } | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ReimbursementSubmitInput) => void;
  onDelete?: () => void;
};

export function ReimbursementDialog({
  open,
  mode,
  members,
  today,
  createDefaults,
  editing,
  pending,
  onOpenChange,
  onSubmit,
  onDelete,
}: ReimbursementDialogProps) {
  const defaults = reimbursementFormDefaults({
    mode,
    today,
    createDefaults,
    editing,
  });
  const [fromUserId, setFromUserId] = useState(defaults.fromUserId);
  const [toUserId, setToUserId] = useState(defaults.toUserId);
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(defaults.occurredOn);

  const items = useMemo(
    () =>
      members.map((member) => ({
        value: member.userId,
        label: member.name,
      })),
    [members],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const next = reimbursementFormDefaults({
      mode,
      today,
      createDefaults,
      editing,
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when the dialog opens
    setFromUserId(next.fromUserId);
    setToUserId(next.toUserId);
    setAmount(next.amount === null ? "" : String(next.amount).replace(".", ","));
    setOccurredOn(next.occurredOn);
  }, [open, mode, today, createDefaults, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent initialFocus={false}>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Modifica rimborso" : "Registra rimborso"}
          </DialogTitle>
          <DialogDescription>
            Segna un passaggio di soldi tra membri. Non diventa un movimento in
            Cashflow.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ fromUserId, toUserId, amount, occurredOn });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="reimburse-date">Data</Label>
            <Input
              id="reimburse-date"
              type="date"
              required
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reimburse-from">Chi ha dato</Label>
            <Select
              modal={false}
              value={fromUserId}
              items={items}
              onValueChange={(value) => {
                if (value) {
                  setFromUserId(value);
                }
              }}
            >
              <SelectTrigger id="reimburse-from" className="w-full">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reimburse-to">Chi ha ricevuto</Label>
            <Select
              modal={false}
              value={toUserId}
              items={items}
              onValueChange={(value) => {
                if (value) {
                  setToUserId(value);
                }
              }}
            >
              <SelectTrigger id="reimburse-to" className="w-full">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reimburse-amount">Importo</Label>
            <Input
              id="reimburse-amount"
              inputMode="decimal"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
            />
          </div>
          <DialogFooter>
            {mode === "edit" && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={onDelete}
              >
                Elimina
              </Button>
            ) : (
              <DialogClose render={<Button type="button" variant="outline" />}>
                Annulla
              </DialogClose>
            )}
            <Button type="submit" disabled={pending}>
              {pending
                ? "Salvataggio…"
                : mode === "edit"
                  ? "Salva"
                  : "Registra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
