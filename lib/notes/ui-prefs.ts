import type { NoteUiPrefs } from "@/lib/notes/types";
import { DEFAULT_NOTE_UI_PREFS } from "@/lib/notes/types";

export function isNoteCollapsed(prefs: NoteUiPrefs, noteId: string): boolean {
  return prefs.collapsed_note_ids.includes(noteId);
}

export function withNoteCollapsed(
  prefs: NoteUiPrefs,
  noteId: string,
  collapsed: boolean,
): NoteUiPrefs {
  const set = new Set(prefs.collapsed_note_ids);
  if (collapsed) {
    set.add(noteId);
  } else {
    set.delete(noteId);
  }
  return { ...prefs, collapsed_note_ids: [...set] };
}

export function withSectionCollapsed(
  prefs: NoteUiPrefs,
  section: "personal" | "family",
  collapsed: boolean,
): NoteUiPrefs {
  if (section === "personal") {
    return { ...prefs, personal_section_collapsed: collapsed };
  }
  return { ...prefs, family_section_collapsed: collapsed };
}

export function prefsFromRow(row: Partial<NoteUiPrefs> | null): NoteUiPrefs {
  if (!row) {
    return { ...DEFAULT_NOTE_UI_PREFS, collapsed_note_ids: [] };
  }
  return {
    personal_section_collapsed: Boolean(row.personal_section_collapsed),
    family_section_collapsed: Boolean(row.family_section_collapsed),
    collapsed_note_ids: Array.isArray(row.collapsed_note_ids)
      ? row.collapsed_note_ids.filter((id) => typeof id === "string")
      : [],
  };
}
