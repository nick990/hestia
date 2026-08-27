import { describe, expect, it } from "vitest";
import { DEFAULT_NOTE_UI_PREFS } from "@/lib/notes/types";
import {
  isNoteCollapsed,
  prefsFromRow,
  withNoteCollapsed,
  withSectionCollapsed,
} from "@/lib/notes/ui-prefs";

describe("withNoteCollapsed", () => {
  it("adds and removes ids without duplicates", () => {
    const closed = withNoteCollapsed(DEFAULT_NOTE_UI_PREFS, "n1", true);
    expect(closed.collapsed_note_ids).toEqual(["n1"]);
    expect(withNoteCollapsed(closed, "n1", true).collapsed_note_ids).toEqual([
      "n1",
    ]);
    expect(withNoteCollapsed(closed, "n1", false).collapsed_note_ids).toEqual(
      [],
    );
  });
});

describe("isNoteCollapsed", () => {
  it("defaults to open", () => {
    expect(isNoteCollapsed(DEFAULT_NOTE_UI_PREFS, "n1")).toBe(false);
  });
});

describe("withSectionCollapsed", () => {
  it("sets only the requested section", () => {
    const next = withSectionCollapsed(DEFAULT_NOTE_UI_PREFS, "family", true);
    expect(next.family_section_collapsed).toBe(true);
    expect(next.personal_section_collapsed).toBe(false);
  });
});

describe("prefsFromRow", () => {
  it("returns defaults for null", () => {
    expect(prefsFromRow(null)).toEqual(DEFAULT_NOTE_UI_PREFS);
  });

  it("ignores unknown extra fields and missing arrays", () => {
    expect(
      prefsFromRow({
        personal_section_collapsed: true,
        family_section_collapsed: false,
        collapsed_note_ids: ["a"],
      }),
    ).toEqual({
      personal_section_collapsed: true,
      family_section_collapsed: false,
      collapsed_note_ids: ["a"],
    });
  });
});
