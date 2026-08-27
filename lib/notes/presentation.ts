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

export function formatNoteUpdatedAt(iso: string, now = new Date()): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const romeYear = new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    timeZone: "Europe/Rome",
  });
  const sameYear = romeYear.format(date) === romeYear.format(now);
  const formatted = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: "Europe/Rome",
  }).format(date);

  return formatted.replaceAll(".", "");
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
