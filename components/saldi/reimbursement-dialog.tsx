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
import type { FamilySaldiMember } from "@/lib/saldi/types";
import { useEffect, useMemo, useState } from "react";

type ReimbursementDialogProps = {
  open: boolean;
  members: FamilySaldiMember[];
  defaultFromUserId: string;
  defaultToUserId: string;
  defaultAmount: number | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    fromUserId: string;
    toUserId: string;
    amount: string;
  }) => void;
};

export function ReimbursementDialog({
  open,
  members,
  defaultFromUserId,
  defaultToUserId,
  defaultAmount,
  pending,
  onOpenChange,
  onSubmit,
}: ReimbursementDialogProps) {
  const [fromUserId, setFromUserId] = useState(defaultFromUserId);
  const [toUserId, setToUserId] = useState(defaultToUserId);
  const [amount, setAmount] = useState("");

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

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when the dialog opens
    setFromUserId(defaultFromUserId);
    setToUserId(defaultToUserId);
    setAmount(
      defaultAmount === null ? "" : String(defaultAmount).replace(".", ","),
    );
  }, [open, defaultFromUserId, defaultToUserId, defaultAmount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registra rimborso</DialogTitle>
          <DialogDescription>
            Segna un passaggio di soldi tra membri. Non diventa un movimento in
            Cashflow.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ fromUserId, toUserId, amount });
          }}
        >
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
            <DialogClose render={<Button type="button" variant="outline" />}>
              Annulla
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Registra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
