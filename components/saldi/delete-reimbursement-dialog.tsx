"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatEuro } from "@/lib/cashflow/format";
import type { FamilySaldiReimbursement } from "@/lib/saldi/types";

type DeleteReimbursementDialogProps = {
  reimbursement: FamilySaldiReimbursement | null;
  fromName: string;
  toName: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteReimbursementDialog({
  reimbursement,
  fromName,
  toName,
  pending,
  onOpenChange,
  onConfirm,
}: DeleteReimbursementDialogProps) {
  return (
    <Dialog
      open={reimbursement !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elimina rimborso</DialogTitle>
          <DialogDescription>
            Stai per eliminare il rimborso di{" "}
            <span className="font-medium text-foreground">
              {formatEuro(reimbursement?.amount ?? 0)}
            </span>{" "}
            da {fromName} a {toName}. Questa azione è irreversibile.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Annulla
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Eliminazione…" : "Elimina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
