"use client";

import {
  deleteNote,
  shareNote,
  unshareNote,
  updateNoteContent,
} from "@/app/actions/notes";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { NoteChecklistEditor } from "@/components/notes/note-checklist-editor";
import { NoteTextEditor } from "@/components/notes/note-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contentForKind } from "@/lib/notes/content";
import {
  canShowShare,
  canShowUnshare,
  noteDisplayTitle,
} from "@/lib/notes/permissions";
import type { Note, NoteContent, NoteKind } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type NoteCardProps = {
  note: Note;
  currentUserId: string;
  hasFamily: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NoteCard({
  note,
  currentUserId,
  hasFamily,
  collapsed,
  onCollapsedChange,
}: NoteCardProps) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [kind, setKind] = useState<NoteKind>(note.kind);
  const [content, setContent] = useState<NoteContent>(note.content);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const skipAutosave = useRef(true);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      setSaveStatus("saving");
      void updateNoteContent({ id: note.id, title, kind, content }).then(
        (result) => {
          if (!result.ok) {
            setSaveStatus("error");
            setSaveError(result.error);
            toast.error(result.error);
            return;
          }

          setSaveStatus("saved");
          setSaveError(null);
        },
      );
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [content, kind, note.id, title]);

  function changeKind(nextKind: NoteKind) {
    if (nextKind === kind) {
      return;
    }

    setKind(nextKind);
    setContent(contentForKind(nextKind, content));
  }

  async function handleShare() {
    const result = await shareNote(note.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Nota condivisa con la famiglia.");
    router.refresh();
  }

  async function handleUnshare() {
    const result = await unshareNote(note.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("La nota è di nuovo solo tua.");
    router.refresh();
  }

  async function handleDelete() {
    setDeletePending(true);
    const result = await deleteNote(note.id);
    setDeletePending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <article className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-0.5"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Espandi nota" : "Comprimi nota"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ChevronDownIcon
            className={cn(
              "size-4 motion-reduce:transition-none transition-transform",
              collapsed && "-rotate-90",
            )}
          />
        </Button>
        {collapsed ? (
          <button
            type="button"
            className="min-w-0 flex-1 py-1 text-left text-sm font-medium"
            onClick={() => onCollapsedChange(false)}
          >
            {noteDisplayTitle(title)}
          </button>
        ) : (
          <Input
            value={title}
            maxLength={200}
            placeholder="Senza titolo"
            className="flex-1"
            onChange={(event) => setTitle(event.target.value)}
          />
        )}
      </div>
      {collapsed ? null : (
        <div className="mt-3 space-y-3 pl-9">
          {kind === "text" ? (
            <NoteTextEditor
              value={"body" in content ? content.body : ""}
              onChange={(body) => setContent({ body })}
            />
          ) : (
            <NoteChecklistEditor
              items={"items" in content ? content.items : []}
              onChange={(items) => setContent({ items })}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={kind === "text" ? "default" : "outline"}
              onClick={() => changeKind("text")}
            >
              Testo
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === "checklist" ? "default" : "outline"}
              onClick={() => changeKind("checklist")}
            >
              Checklist
            </Button>
            {canShowShare(currentUserId, { user_id: note.user_id, scope: note.scope }, hasFamily) ? (
              <Button type="button" size="sm" variant="outline" onClick={handleShare}>
                Condividi
              </Button>
            ) : null}
            {canShowUnshare(currentUserId, {
              user_id: note.user_id,
              scope: note.scope,
            }) ? (
              <Button type="button" size="sm" variant="outline" onClick={handleUnshare}>
                Togli condivisione
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setDeleteTarget(note)}
            >
              Elimina
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {saveStatus === "saving"
              ? "Salvataggio…"
              : saveStatus === "saved"
                ? "Salvata"
                : saveStatus === "error"
                  ? saveError
                  : null}
          </p>
        </div>
      )}
      <DeleteNoteDialog
        note={deleteTarget}
        pending={deletePending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </article>
  );
}
