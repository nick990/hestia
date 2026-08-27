"use client";

import { NoteActionBar } from "@/components/notes/note-action-bar";
import { NoteChecklistEditor } from "@/components/notes/note-checklist-editor";
import { NoteTextEditor } from "@/components/notes/note-text-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { noteDisplayTitle } from "@/lib/notes/permissions";
import type { NoteContent, NoteKind } from "@/lib/notes/types";
import {
  CheckIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type NoteEditorDialogProps = {
  open: boolean;
  title: string;
  kind: NoteKind;
  content: NoteContent;
  saveStatus: SaveStatus;
  saveError: string | null;
  shareVisible: boolean;
  unshareVisible: boolean;
  actionPending: boolean;
  dismissible: boolean;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: NoteContent) => void;
  onKindChange: (kind: NoteKind) => void;
  onShare: () => void;
  onUnshare: () => void;
  onDelete: () => void;
};

export function NoteEditorDialog({
  open,
  title,
  kind,
  content,
  saveStatus,
  saveError,
  shareVisible,
  unshareVisible,
  actionPending,
  dismissible,
  onOpenChange,
  onTitleChange,
  onContentChange,
  onKindChange,
  onShare,
  onUnshare,
  onDelete,
}: NoteEditorDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      titleRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !dismissible) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(92vh,44rem)] w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">
          Modifica {noteDisplayTitle(title)}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Modifica titolo e contenuto. Le modifiche si salvano da sole. Chiudi
          o premi Esc per tornare alla bacheca.
        </DialogDescription>
        <div className="flex max-h-[min(92vh,44rem)] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
            <label className="sr-only" htmlFor="note-editor-title">
              Titolo
            </label>
            <Input
              ref={titleRef}
              id="note-editor-title"
              value={title}
              maxLength={200}
              placeholder="Titolo"
              className="h-10 border-transparent px-1 text-base font-medium shadow-none focus-visible:border-transparent focus-visible:ring-0"
              onChange={(event) => onTitleChange(event.target.value)}
            />
            <div className="mt-1 pb-3">
              {kind === "text" ? (
                <NoteTextEditor
                  value={"body" in content ? content.body : ""}
                  className="min-h-40 resize-none border-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                  onChange={(body) => onContentChange({ body })}
                />
              ) : (
                <NoteChecklistEditor
                  items={"items" in content ? content.items : []}
                  onChange={(items) => onContentChange({ items })}
                />
              )}
            </div>
          </div>
          <NoteActionBar
            kind={kind}
            shareVisible={shareVisible}
            unshareVisible={unshareVisible}
            actionPending={actionPending}
            onKindChange={onKindChange}
            onShare={onShare}
            onUnshare={onUnshare}
            onDelete={onDelete}
            className="border-t border-border/70 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <SaveStatusLabel status={saveStatus} error={saveError} />
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Chiudi
              </Button>
            </div>
          </NoteActionBar>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SaveStatusLabel({
  status,
  error,
}: {
  status: SaveStatus;
  error: string | null;
}) {
  if (status === "idle") {
    return null;
  }

  return (
    <span
      className="flex items-center gap-1 text-xs text-muted-foreground"
      aria-live="polite"
      title={error ?? undefined}
    >
      {status === "saving" ? (
        <>
          <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" />
          Salvataggio…
        </>
      ) : null}
      {status === "saved" ? (
        <>
          <CheckIcon className="size-3" />
          Salvata
        </>
      ) : null}
      {status === "error" ? (
        <>
          <TriangleAlertIcon className="size-3 text-destructive" />
          Non salvata
        </>
      ) : null}
    </span>
  );
}
