"use client";

import {
  deleteNote,
  shareNote,
  unshareNote,
  updateNoteContent,
} from "@/app/actions/notes";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { NoteActionBar } from "@/components/notes/note-action-bar";
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog";
import { ShareNoteDialog } from "@/components/notes/share-note-dialog";
import { Button } from "@/components/ui/button";
import { contentForKind } from "@/lib/notes/content";
import {
  canShowShare,
  canShowUnshare,
  noteDisplayTitle,
  type NoteShareAction,
} from "@/lib/notes/permissions";
import { summarizeChecklist } from "@/lib/notes/presentation";
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
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [shareAction, setShareAction] = useState<NoteShareAction | null>(null);
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
    setActionPending(true);
    const result = await shareNote(note.id);
    setActionPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Nota condivisa con la famiglia.");
    setShareAction(null);
    router.refresh();
  }

  async function handleUnshare() {
    setActionPending(true);
    const result = await unshareNote(note.id);
    setActionPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("La nota è di nuovo solo tua.");
    setShareAction(null);
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
    setEditing(false);
    router.refresh();
  }

  const shareVisible = canShowShare(
    currentUserId,
    { user_id: note.user_id, scope: note.scope },
    hasFamily,
  );
  const unshareVisible = canShowUnshare(currentUserId, {
    user_id: note.user_id,
    scope: note.scope,
  });
  const confirmOpen = shareAction !== null || deleteTarget !== null;

  function renderPreview() {
    if (kind === "text") {
      const body = "body" in content ? content.body : "";
      return body.trim() === "" ? (
        <p className="text-sm text-muted-foreground">Nota vuota</p>
      ) : (
        <p className="line-clamp-8 whitespace-pre-wrap break-words text-sm leading-5 text-foreground/90">
          {body}
        </p>
      );
    }

    const items = "items" in content ? content.items : [];
    const { visible, remaining } = summarizeChecklist(items, 6);

    if (visible.length === 0) {
      return <p className="text-sm text-muted-foreground">Checklist vuota</p>;
    }

    return (
      <div className="space-y-1.5">
        <ul className="space-y-1.5">
          {visible.map((item, index) => (
            <li key={item.id} className="flex min-w-0 items-start gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                className="mt-0.5 size-4 shrink-0 accent-primary"
                aria-label={`${item.checked ? "Riapri" : "Completa"} ${item.text || `voce ${index + 1}`}`}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  event.stopPropagation();
                  setContent({
                    items: items.map((current) =>
                      current.id === item.id
                        ? { ...current, checked: event.target.checked }
                        : current,
                    ),
                  });
                }}
              />
              <span
                className={cn(
                  "min-w-0 break-words text-sm leading-5",
                  item.checked && "text-muted-foreground line-through",
                )}
              >
                {item.text}
              </span>
            </li>
          ))}
        </ul>
        {remaining > 0 ? (
          <p className="pl-6 text-xs text-muted-foreground">
            Altre {remaining} {remaining === 1 ? "voce" : "voci"}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <article className="group/note mb-3 inline-block w-full break-inside-avoid rounded-xl bg-card align-top shadow-[0_1px_3px_oklch(0_0_0/0.08)] ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md focus-within:shadow-md motion-reduce:transition-none">
      <div className="flex min-h-11 items-start gap-1 px-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
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
        <button
          type="button"
          className="min-w-0 flex-1 break-words px-1 py-2 text-left text-base font-medium leading-5 outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => setEditing(true)}
        >
          {noteDisplayTitle(title)}
        </button>
      </div>
      {collapsed ? null : (
        <div className="px-4 pb-2">
          <div
            className="min-h-10 cursor-text py-1"
            onClick={() => setEditing(true)}
          >
            {renderPreview()}
          </div>
          <NoteActionBar
            kind={kind}
            shareVisible={shareVisible}
            unshareVisible={unshareVisible}
            actionPending={actionPending}
            onKindChange={changeKind}
            onShare={() => setShareAction("share")}
            onUnshare={() => setShareAction("unshare")}
            onDelete={() => setDeleteTarget(note)}
            className={cn(
              "mt-3 border-t border-border/70 pt-2 transition-opacity duration-150 motion-reduce:transition-none",
              "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/note:opacity-100 [@media(hover:hover)]:group-focus-within/note:opacity-100",
            )}
          />
        </div>
      )}
      <NoteEditorDialog
        open={editing}
        title={title}
        kind={kind}
        content={content}
        saveStatus={saveStatus}
        saveError={saveError}
        shareVisible={shareVisible}
        unshareVisible={unshareVisible}
        actionPending={actionPending}
        dismissible={!confirmOpen}
        onOpenChange={setEditing}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onKindChange={changeKind}
        onShare={() => setShareAction("share")}
        onUnshare={() => setShareAction("unshare")}
        onDelete={() => setDeleteTarget(note)}
      />
      <ShareNoteDialog
        action={shareAction}
        noteTitle={title}
        pending={actionPending}
        onOpenChange={(open) => {
          if (!open) {
            setShareAction(null);
          }
        }}
        onConfirm={() => {
          if (shareAction === "share") {
            void handleShare();
            return;
          }
          if (shareAction === "unshare") {
            void handleUnshare();
          }
        }}
      />
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
