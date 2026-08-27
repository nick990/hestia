import type {
  ChecklistItem,
  NoteContent,
  NoteKind,
  TextContent,
} from "@/lib/notes/types";
import {
  EMPTY_CHECKLIST_CONTENT,
  EMPTY_TEXT_CONTENT,
} from "@/lib/notes/types";

function defaultId(): string {
  return crypto.randomUUID();
}

export function textToChecklist(
  body: string,
  createId: () => string = defaultId,
): ChecklistItem[] {
  const lines = body.split("\n");

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((text) => ({
    id: createId(),
    text,
    checked: false,
  }));
}

export function checklistToText(items: ChecklistItem[]): string {
  return items.map((item) => item.text).join("\n");
}

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.text === "string" &&
    typeof item.checked === "boolean"
  );
}

export function parseNoteContent(kind: NoteKind, raw: unknown): NoteContent {
  if (kind === "text") {
    if (raw && typeof raw === "object" && "body" in raw) {
      const body = (raw as { body: unknown }).body;

      if (typeof body === "string") {
        return { body };
      }
    }

    return { ...EMPTY_TEXT_CONTENT };
  }

  if (raw && typeof raw === "object" && "items" in raw) {
    const items = (raw as { items: unknown }).items;

    if (Array.isArray(items)) {
      return { items: items.filter(isChecklistItem) };
    }
  }

  return { ...EMPTY_CHECKLIST_CONTENT, items: [] };
}

export function contentForKind(
  kind: NoteKind,
  previous: NoteContent,
  createId: () => string = defaultId,
): NoteContent {
  if (kind === "text") {
    if ("body" in previous) {
      return previous;
    }

    return { body: checklistToText(previous.items) };
  }

  if ("items" in previous) {
    return previous;
  }

  return { items: textToChecklist(previous.body, createId) };
}

export function normalizeChecklistItems(
  items: ChecklistItem[],
): ChecklistItem[] {
  return items.filter((item) => item.text.trim() !== "");
}

export function isTextContent(content: NoteContent): content is TextContent {
  return "body" in content;
}
