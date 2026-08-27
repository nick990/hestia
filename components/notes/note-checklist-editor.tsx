"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { ChecklistItem } from "@/lib/notes/types";
import type { KeyboardEvent } from "react";

type NoteChecklistEditorProps = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
};

function withTrailingBlank(items: ChecklistItem[]): ChecklistItem[] {
  const last = items[items.length - 1];
  if (last && last.text === "") {
    return items;
  }

  return [...items, { id: crypto.randomUUID(), text: "", checked: false }];
}

export function NoteChecklistEditor({
  items,
  onChange,
}: NoteChecklistEditorProps) {
  const rows = withTrailingBlank(items);

  function updateRow(index: number, next: ChecklistItem) {
    const updated = rows.map((row, rowIndex) =>
      rowIndex === index ? next : row,
    );
    onChange(updated);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      const next = [...rows];
      next.splice(index + 1, 0, {
        id: crypto.randomUUID(),
        text: "",
        checked: false,
      });
      onChange(next);
      return;
    }

    if (
      event.key === "Backspace" &&
      rows[index]?.text === "" &&
      rows.length > 1
    ) {
      event.preventDefault();
      onChange(rows.filter((_, rowIndex) => rowIndex !== index));
    }
  }

  return (
    <ul className="space-y-1.5">
      {rows.map((item, index) => (
        <li key={item.id} className="flex items-center gap-2">
          <Checkbox
            checked={item.checked}
            aria-label={`Voce ${index + 1}`}
            onCheckedChange={(checked) =>
              updateRow(index, { ...item, checked: checked === true })
            }
          />
          <Input
            value={item.text}
            placeholder="Nuova voce"
            onChange={(event) =>
              updateRow(index, { ...item, text: event.target.value })
            }
            onKeyDown={(event) => handleKeyDown(event, index)}
          />
        </li>
      ))}
    </ul>
  );
}
