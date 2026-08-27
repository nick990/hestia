import type { Note, NoteScope } from "@/lib/notes/types";

type ScopeFields = Pick<Note, "user_id"> & { scope: NoteScope };

export function canChangeNoteScope(
  currentUserId: string,
  note: Pick<Note, "user_id">,
): boolean {
  return currentUserId === note.user_id;
}

export function canShowShare(
  currentUserId: string,
  note: ScopeFields,
  hasFamily: boolean,
): boolean {
  return (
    hasFamily &&
    canChangeNoteScope(currentUserId, note) &&
    note.scope === "personal"
  );
}

export function canShowUnshare(
  currentUserId: string,
  note: ScopeFields,
): boolean {
  return canChangeNoteScope(currentUserId, note) && note.scope === "family";
}

export function noteDisplayTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed === "" ? "Senza titolo" : title;
}
