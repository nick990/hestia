import { describe, expect, it } from "vitest";
import {
  checklistToText,
  contentForKind,
  normalizeChecklistItems,
  parseNoteContent,
  textToChecklist,
} from "@/lib/notes/content";

const idSeq = () => {
  let n = 0;
  return () => `id-${++n}`;
};

describe("textToChecklist", () => {
  it("splits lines and drops trailing empty lines", () => {
    expect(textToChecklist("latte\npane\n\n", idSeq())).toEqual([
      { id: "id-1", text: "latte", checked: false },
      { id: "id-2", text: "pane", checked: false },
    ]);
  });

  it("keeps empty lines in the middle", () => {
    expect(textToChecklist("a\n\nb", idSeq())).toEqual([
      { id: "id-1", text: "a", checked: false },
      { id: "id-2", text: "", checked: false },
      { id: "id-3", text: "b", checked: false },
    ]);
  });

  it("returns empty items for empty body", () => {
    expect(textToChecklist("", idSeq())).toEqual([]);
    expect(textToChecklist("\n\n", idSeq())).toEqual([]);
  });
});

describe("checklistToText", () => {
  it("joins item texts with newlines and drops checked state", () => {
    expect(
      checklistToText([
        { id: "1", text: "latte", checked: true },
        { id: "2", text: "pane", checked: false },
      ]),
    ).toBe("latte\npane");
  });
});

describe("contentForKind", () => {
  it("converts text to checklist and back", () => {
    const checklist = contentForKind(
      "checklist",
      { body: "latte\npane" },
      idSeq(),
    );
    expect(checklist).toEqual({
      items: [
        { id: "id-1", text: "latte", checked: false },
        { id: "id-2", text: "pane", checked: false },
      ],
    });
    expect(contentForKind("text", checklist)).toEqual({
      body: "latte\npane",
    });
  });

  it("returns the same shape when kind is unchanged", () => {
    expect(contentForKind("text", { body: "x" })).toEqual({ body: "x" });
  });
});

describe("parseNoteContent", () => {
  it("parses text body", () => {
    expect(parseNoteContent("text", { body: "ciao" })).toEqual({
      body: "ciao",
    });
  });

  it("falls back to empty text", () => {
    expect(parseNoteContent("text", null)).toEqual({ body: "" });
  });

  it("parses checklist items and ignores malformed entries", () => {
    expect(
      parseNoteContent("checklist", {
        items: [
          { id: "a", text: "latte", checked: true },
          { text: "no-id" },
          "skip",
        ],
      }),
    ).toEqual({
      items: [{ id: "a", text: "latte", checked: true }],
    });
  });
});

describe("normalizeChecklistItems", () => {
  it("drops items whose text is empty after trim", () => {
    expect(
      normalizeChecklistItems([
        { id: "1", text: "latte", checked: false },
        { id: "2", text: "  ", checked: false },
      ]),
    ).toEqual([{ id: "1", text: "latte", checked: false }]);
  });
});
