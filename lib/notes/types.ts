export type NoteKind = "text" | "checklist";
export type NoteScope = "personal" | "family";

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type TextContent = {
  body: string;
};

export type ChecklistContent = {
  items: ChecklistItem[];
};

export type NoteContent = TextContent | ChecklistContent;

export type Note = {
  id: string;
  user_id: string;
  scope: NoteScope;
  family_id: string | null;
  title: string;
  kind: NoteKind;
  content: NoteContent;
  created_at: string;
  updated_at: string;
};

export type NoteSaveStatus = "idle" | "saving" | "saved" | "error";

export type NoteUiPrefs = {
  personal_section_collapsed: boolean;
  family_section_collapsed: boolean;
  collapsed_note_ids: string[];
};

export const EMPTY_TEXT_CONTENT: TextContent = { body: "" };
export const EMPTY_CHECKLIST_CONTENT: ChecklistContent = { items: [] };

export const DEFAULT_NOTE_UI_PREFS: NoteUiPrefs = {
  personal_section_collapsed: false,
  family_section_collapsed: false,
  collapsed_note_ids: [],
};
