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
import {
  noteShareDialogCopy,
  type NoteShareAction,
} from "@/lib/notes/permissions";

type ShareNoteDialogProps = {
  action: NoteShareAction | null;
  noteTitle: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ShareNoteDialog({
  action,
  noteTitle,
  pending,
  onOpenChange,
  onConfirm,
}: ShareNoteDialogProps) {
  const copy = action ? noteShareDialogCopy(action, noteTitle) : null;

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="z-60">
        <DialogHeader>
          <DialogTitle>{copy?.title ?? "Conferma"}</DialogTitle>
          <DialogDescription>{copy?.description}</DialogDescription>
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
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? copy?.pending : copy?.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
