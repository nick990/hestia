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

export type NoteShareAction = "share" | "unshare";

export function noteShareDialogCopy(
  action: NoteShareAction,
  title: string,
): {
  title: string;
  description: string;
  confirm: string;
  pending: string;
} {
  const display = noteDisplayTitle(title);

  if (action === "share") {
    return {
      title: "Condividi con la famiglia",
      description: `${display} sarà visibile e modificabile da tutti i membri della famiglia.`,
      confirm: "Condividi",
      pending: "Condivisione…",
    };
  }

  return {
    title: "Togli condivisione",
    description: `${display} tornerà solo tua e sparirà dalla sezione Famiglia degli altri.`,
    confirm: "Togli condivisione",
    pending: "Aggiornamento…",
  };
}
