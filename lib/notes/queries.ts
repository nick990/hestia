import { parseNoteContent } from "@/lib/notes/content";
import type { Note, NoteKind, NoteScope, NoteUiPrefs } from "@/lib/notes/types";
import { prefsFromRow } from "@/lib/notes/ui-prefs";
import { createClient } from "@/lib/supabase/server";

type NoteRow = {
  id: string;
  user_id: string;
  scope: string;
  family_id: string | null;
  title: string;
  kind: string;
  content: unknown;
  created_at: string;
  updated_at: string;
};

function mapNote(row: NoteRow): Note {
  const kind: NoteKind = row.kind === "checklist" ? "checklist" : "text";
  const scope: NoteScope = row.scope === "family" ? "family" : "personal";
  return {
    id: row.id,
    user_id: row.user_id,
    scope,
    family_id: row.family_id,
    title: row.title ?? "",
    kind,
    content: parseNoteContent(kind, row.content),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listNotesForCurrentUser(): Promise<Note[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, user_id, scope, family_id, title, kind, content, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapNote(row as NoteRow));
}

export async function getNoteUiPrefs(): Promise<NoteUiPrefs> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return prefsFromRow(null);
  }

  const { data, error } = await supabase
    .from("note_ui_prefs")
    .select(
      "personal_section_collapsed, family_section_collapsed, collapsed_note_ids",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return prefsFromRow(data);
}
