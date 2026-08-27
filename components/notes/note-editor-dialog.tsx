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
  ArrowLeftIcon,
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
        className="flex inset-0 top-0 left-0 h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(88vh,56rem)] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pt-0 sm:pb-0"
      >
        <DialogTitle className="sr-only">
          Modifica {noteDisplayTitle(title)}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Modifica titolo e contenuto. Le modifiche si salvano da sole. Su
          telefono usa la freccia indietro. Su computer Chiudi o Esc tornano
          alla bacheca.
        </DialogDescription>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center gap-1 px-2 pt-2 sm:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Torna alla bacheca"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeftIcon />
            </Button>
            <SaveStatusLabel status={saveStatus} error={saveError} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-1 sm:pt-3">
            <label className="sr-only" htmlFor="note-editor-title">
              Titolo
            </label>
            <Input
              ref={titleRef}
              id="note-editor-title"
              value={title}
              maxLength={200}
              placeholder="Titolo"
              className="h-11 shrink-0 border-transparent px-1 text-lg font-medium shadow-none focus-visible:border-transparent focus-visible:ring-0"
              onChange={(event) => onTitleChange(event.target.value)}
            />
            <div
              className={
                kind === "text"
                  ? "mt-1 flex min-h-0 flex-1 flex-col pb-3"
                  : "mt-1 min-h-0 flex-1 overflow-y-auto pb-3"
              }
            >
              {kind === "text" ? (
                <NoteTextEditor
                  value={"body" in content ? content.body : ""}
                  rows={1}
                  className="h-full min-h-0 resize-none border-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                  onChange={(body) => onContentChange({ body })}
                />
              ) : (
                <NoteChecklistEditor
                  items={"items" in content ? content.items : []}
                  className="h-full"
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
            <div className="hidden items-center gap-2 sm:flex">
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
