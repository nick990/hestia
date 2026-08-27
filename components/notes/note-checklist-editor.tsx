"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  partitionChecklistItems,
  removeChecklistItem,
} from "@/lib/notes/presentation";
import type { ChecklistItem } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import type { KeyboardEvent } from "react";

type NoteChecklistEditorProps = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  className?: string;
};

function withTrailingBlank(items: ChecklistItem[]): ChecklistItem[] {
  const blank = items.find((item) => item.text === "");
  const filled = items.filter((item) => item.text !== "");

  return [
    ...filled,
    blank ?? { id: crypto.randomUUID(), text: "", checked: false },
  ];
}

export function NoteChecklistEditor({
  items,
  onChange,
  className,
}: NoteChecklistEditorProps) {
  const { open, completed } = partitionChecklistItems(items);
  const openRows = withTrailingBlank(open);
  const rows = [...openRows, ...completed];

  function updateRow(id: string, next: ChecklistItem) {
    const updated = rows.map((row) =>
      row.id === id ? next : row,
    );
    onChange(updated);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    item: ChecklistItem,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      const index = rows.findIndex((row) => row.id === item.id);
      const next = [...rows];
      const id = crypto.randomUUID();
      next.splice(index + 1, 0, {
        id,
        text: "",
        checked: false,
      });
      onChange(next);
      window.requestAnimationFrame(() => {
        document.getElementById(`checklist-item-${id}`)?.focus();
      });
      return;
    }

    if (
      event.key === "Backspace" &&
      item.text === "" &&
      rows.length > 1
    ) {
      event.preventDefault();
      onChange(removeChecklistItem(rows, item.id));
    }
  }

  function removeRow(item: ChecklistItem) {
    onChange(removeChecklistItem(rows, item.id));
  }

  function renderRow(item: ChecklistItem, index: number) {
    const canRemove = item.text !== "" || item.checked;

    return (
      <li key={item.id} className="group/item flex min-w-0 items-center gap-1">
        <Checkbox
          checked={item.checked}
          aria-label={`Voce ${index + 1}: ${item.text || "vuota"}`}
          onCheckedChange={(checked) =>
            updateRow(item.id, { ...item, checked: checked === true })
          }
        />
        <Input
          id={`checklist-item-${item.id}`}
          value={item.text}
          placeholder="Nuova voce"
          className={cn(
            "h-8 min-w-0 flex-1 border-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0",
            item.checked && "text-muted-foreground line-through",
          )}
          onChange={(event) =>
            updateRow(item.id, { ...item, text: event.target.value })
          }
          onKeyDown={(event) => handleKeyDown(event, item)}
        />
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "shrink-0 text-muted-foreground hover:text-foreground",
              "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/item:opacity-100 [@media(hover:hover)]:group-focus-within/item:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100",
            )}
            aria-label={`Elimina voce ${item.text || index + 1}`}
            title="Elimina voce"
            onClick={() => removeRow(item)}
          >
            <XIcon />
          </Button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden="true" />
        )}
      </li>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <ul className="space-y-0.5">
        {openRows.map((item, index) => renderRow(item, index))}
      </ul>
      {completed.length > 0 ? (
        <div className="border-t border-border pt-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {completed.length} {completed.length === 1 ? "voce completata" : "voci completate"}
          </p>
          <ul className="space-y-0.5">
            {completed.map((item, index) =>
              renderRow(item, openRows.length + index),
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
