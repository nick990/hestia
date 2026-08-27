import type { ChecklistItem, NoteContent } from "@/lib/notes/types";

export function partitionChecklistItems(items: ChecklistItem[]) {
  return {
    open: items.filter((item) => !item.checked),
    completed: items.filter((item) => item.checked),
  };
}

export function summarizeChecklist(items: ChecklistItem[], limit: number) {
  const { open, completed } = partitionChecklistItems(items);
  const ordered = [...open, ...completed];

  return {
    visible: ordered.slice(0, limit),
    remaining: Math.max(ordered.length - limit, 0),
  };
}

export function removeChecklistItem(
  items: ChecklistItem[],
  id: string,
): ChecklistItem[] {
  return items.filter((item) => item.id !== id);
}

export function hasNoteContent(title: string, content: NoteContent): boolean {
  if (title.trim() !== "") {
    return true;
  }

  if ("body" in content) {
    return content.body.trim() !== "";
  }

  return content.items.some((item) => item.text.trim() !== "");
}
