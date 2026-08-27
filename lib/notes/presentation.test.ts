import { describe, expect, it } from "vitest";
import {
  hasNoteContent,
  partitionChecklistItems,
  removeChecklistItem,
  summarizeChecklist,
} from "@/lib/notes/presentation";

const items = [
  { id: "1", text: "Pane", checked: true },
  { id: "2", text: "Latte", checked: false },
  { id: "3", text: "Caffè", checked: true },
  { id: "4", text: "Pasta", checked: false },
];

describe("partitionChecklistItems", () => {
  it("mostra prima le voci aperte senza alterarne l'ordine", () => {
    expect(partitionChecklistItems(items)).toEqual({
      open: [items[1], items[3]],
      completed: [items[0], items[2]],
    });
  });
});

describe("summarizeChecklist", () => {
  it("limita l'anteprima e indica quante voci restano", () => {
    expect(summarizeChecklist(items, 3)).toEqual({
      visible: [items[1], items[3], items[0]],
      remaining: 1,
    });
  });
});

describe("removeChecklistItem", () => {
  it("rimuove la voce indicata e lascia le altre nell'ordine originale", () => {
    expect(removeChecklistItem(items, "2")).toEqual([
      items[0],
      items[2],
      items[3],
    ]);
  });

  it("non cambia l'elenco se l'id non esiste", () => {
    expect(removeChecklistItem(items, "missing")).toEqual(items);
  });
});

describe("hasNoteContent", () => {
  it("considera vuota una bozza senza titolo né corpo", () => {
    expect(hasNoteContent("", { body: "  " })).toBe(false);
    expect(
      hasNoteContent(" ", {
        items: [{ id: "1", text: "", checked: false }],
      }),
    ).toBe(false);
  });

  it("considera compilata una bozza con titolo o contenuto", () => {
    expect(hasNoteContent("Spesa", { body: "" })).toBe(true);
    expect(hasNoteContent("", { body: "Pane" })).toBe(true);
  });
});
