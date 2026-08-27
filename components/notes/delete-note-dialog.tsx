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
import { noteDisplayTitle } from "@/lib/notes/permissions";
import type { Note } from "@/lib/notes/types";

type DeleteNoteDialogProps = {
  note: Note | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteNoteDialog({
  note,
  pending,
  onOpenChange,
  onConfirm,
}: DeleteNoteDialogProps) {
  return (
    <Dialog
      open={note !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elimina nota</DialogTitle>
          <DialogDescription>
            Stai per eliminare{" "}
            <span className="font-medium text-foreground">
              {note ? noteDisplayTitle(note.title) : "questa nota"}
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
