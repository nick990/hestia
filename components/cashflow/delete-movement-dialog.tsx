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
import type { Movement } from "@/lib/cashflow/types";

type DeleteMovementDialogProps = {
  movement: Movement | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteMovementDialog({
  movement,
  pending,
  onOpenChange,
  onConfirm,
}: DeleteMovementDialogProps) {
  return (
    <Dialog
      open={movement !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elimina movimento</DialogTitle>
          <DialogDescription>
            Stai per eliminare{" "}
            <span className="font-medium text-foreground">
              {movement?.description?.trim()
                ? movement.description
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
