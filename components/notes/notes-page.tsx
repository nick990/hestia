"use client";

import { createNote, saveNoteUiPrefs } from "@/app/actions/notes";
import { NoteCard } from "@/components/notes/note-card";
import { NotesSection } from "@/components/notes/notes-section";
import { Button } from "@/components/ui/button";
import type { Note, NoteUiPrefs } from "@/lib/notes/types";
import {
  isNoteCollapsed,
  withNoteCollapsed,
  withSectionCollapsed,
} from "@/lib/notes/ui-prefs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type NotesPageProps = {
  currentUserId: string;
  notes: Note[];
  prefs: NoteUiPrefs;
  hasFamily: boolean;
};

export function NotesPage({
  currentUserId,
  notes,
  prefs: initialPrefs,
  hasFamily,
}: NotesPageProps) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [pending, setPending] = useState(false);

  const personal = notes.filter((note) => note.scope === "personal");
  const family = notes.filter((note) => note.scope === "family");

  async function persist(next: NoteUiPrefs) {
    setPrefs(next);
    const result = await saveNoteUiPrefs(next);
    if (!result.ok) {
      toast.error(result.error);
    }
  }

  async function handleCreate() {
    setPending(true);
    const result = await createNote();
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
        <Button type="button" disabled={pending} onClick={handleCreate}>
          {pending ? "Creazione…" : "Nuova nota"}
        </Button>
      </div>
      <NotesSection
        title="Personali"
        count={personal.length}
        collapsed={prefs.personal_section_collapsed}
        onToggle={() =>
          void persist(
            withSectionCollapsed(
              prefs,
              "personal",
              !prefs.personal_section_collapsed,
            ),
          )
        }
        emptyLabel="Nessuna nota personale. Creane una per tenere da conto liste e appunti solo tuoi."
      >
        {personal.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            currentUserId={currentUserId}
            hasFamily={hasFamily}
            collapsed={isNoteCollapsed(prefs, note.id)}
            onCollapsedChange={(collapsed) =>
              void persist(withNoteCollapsed(prefs, note.id, collapsed))
            }
          />
        ))}
      </NotesSection>
      {hasFamily ? (
        <NotesSection
          title="Famiglia"
          count={family.length}
          collapsed={prefs.family_section_collapsed}
          onToggle={() =>
            void persist(
              withSectionCollapsed(
                prefs,
                "family",
                !prefs.family_section_collapsed,
              ),
            )
          }
          emptyLabel="Nessuna nota di famiglia. Creane una personale e poi condividila con casa."
        >
          {family.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              hasFamily={hasFamily}
              collapsed={isNoteCollapsed(prefs, note.id)}
              onCollapsedChange={(collapsed) =>
                void persist(withNoteCollapsed(prefs, note.id, collapsed))
              }
            />
          ))}
        </NotesSection>
      ) : null}
    </div>
  );
}
