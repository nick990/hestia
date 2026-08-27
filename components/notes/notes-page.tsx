"use client";

import { saveNoteUiPrefs } from "@/app/actions/notes";
import { NoteCard } from "@/components/notes/note-card";
import { NoteComposer } from "@/components/notes/note-composer";
import { NotesSection } from "@/components/notes/notes-section";
import type { Note, NoteUiPrefs } from "@/lib/notes/types";
import {
  isNoteCollapsed,
  withNoteCollapsed,
  withSectionCollapsed,
} from "@/lib/notes/ui-prefs";
import { cn } from "@/lib/utils";
import { Share2Icon, UserRoundIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type NotesPageProps = {
  currentUserId: string;
  notes: Note[];
  prefs: NoteUiPrefs;
  hasFamily: boolean;
  hideTitle?: boolean;
};

export function NotesPage({
  currentUserId,
  notes,
  prefs: initialPrefs,
  hasFamily,
  hideTitle = false,
}: NotesPageProps) {
  const [prefs, setPrefs] = useState(initialPrefs);

  const personal = notes.filter((note) => note.scope === "personal");
  const family = notes.filter((note) => note.scope === "family");

  async function persist(next: NoteUiPrefs) {
    setPrefs(next);
    const result = await saveNoteUiPrefs(next);
    if (!result.ok) {
      toast.error(result.error);
    }
  }

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8",
        hideTitle && "py-4",
      )}
    >
      {hideTitle ? null : (
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
      )}
      <div className={hideTitle ? undefined : "mt-6"}>
        <NoteComposer hasFamily={hasFamily} />
      </div>
      <div className="mt-10 space-y-10">
        <NotesSection
          title="Personali"
          icon={UserRoundIcon}
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
          emptyLabel="Qui compariranno liste e appunti visibili solo a te. Scrivi la prima nota qui sopra."
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
            icon={Share2Icon}
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
            emptyLabel="Le note condivise con casa compariranno qui. Dal composer scegli Famiglia, oppure condividi una nota già creata."
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
    </main>
  );
}
