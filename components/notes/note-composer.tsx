"use client";

import { createNote } from "@/app/actions/notes";
import { NoteChecklistEditor } from "@/components/notes/note-checklist-editor";
import { NoteTextEditor } from "@/components/notes/note-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contentForKind } from "@/lib/notes/content";
import { hasNoteContent } from "@/lib/notes/presentation";
import type { NoteContent, NoteKind } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { ListChecksIcon, TextIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function NoteComposer() {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<NoteKind>("text");
  const [content, setContent] = useState<NoteContent>({ body: "" });
  const [pending, setPending] = useState(false);

  function reset() {
    setTitle("");
    setKind("text");
    setContent({ body: "" });
    setExpanded(false);
  }

  function changeKind(nextKind: NoteKind) {
    setKind(nextKind);
    setContent((current) => contentForKind(nextKind, current));
  }

  async function closeComposer() {
    if (!hasNoteContent(title, content)) {
      reset();
      return;
    }

    setPending(true);
    const result = await createNote({ title, kind, content });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    reset();
    router.refresh();
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className="mx-auto flex min-h-12 w-full max-w-2xl items-center rounded-xl bg-card px-4 text-left text-base font-medium text-muted-foreground shadow-[0_1px_3px_oklch(0_0_0/0.12),0_1px_2px_oklch(0_0_0/0.08)] ring-1 ring-foreground/10 transition-[box-shadow,color] duration-200 ease-out hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
        onClick={() => {
          setExpanded(true);
          window.setTimeout(() => titleRef.current?.focus(), 0);
        }}
      >
        Scrivi una nota…
      </button>
    );
  }

  return (
    <form
      className="mx-auto w-full max-w-2xl rounded-xl bg-card p-3 shadow-md ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        void closeComposer();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          void closeComposer();
        }
      }}
    >
      <label className="sr-only" htmlFor="new-note-title">
        Titolo
      </label>
      <Input
        ref={titleRef}
        id="new-note-title"
        value={title}
        maxLength={200}
        placeholder="Titolo"
        className="h-11 border-transparent px-1 text-lg font-medium shadow-none focus-visible:border-transparent focus-visible:ring-0"
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="mt-1">
        {kind === "text" ? (
          <NoteTextEditor
            value={"body" in content ? content.body : ""}
            rows={3}
            className="min-h-20 resize-none border-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0"
            onChange={(body) => setContent({ body })}
          />
        ) : (
          <NoteChecklistEditor
            items={"items" in content ? content.items : []}
            onChange={(items) => setContent({ items })}
          />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(kind === "text" && "bg-muted text-foreground")}
            aria-label="Crea una nota di testo"
            title="Nota di testo"
            onClick={() => changeKind("text")}
          >
            <TextIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(kind === "checklist" && "bg-muted text-foreground")}
            aria-label="Crea una checklist"
            title="Checklist"
            onClick={() => changeKind("checklist")}
          >
            <ListChecksIcon />
          </Button>
        </div>
        <Button type="submit" variant="ghost" disabled={pending}>
          {pending ? "Salvataggio…" : "Chiudi"}
        </Button>
      </div>
    </form>
  );
}
