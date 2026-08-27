import { describe, expect, it } from "vitest";
import {
  canChangeNoteScope,
  canShowShare,
  canShowUnshare,
  noteDisplayTitle,
  noteShareDialogCopy,
} from "@/lib/notes/permissions";

const note = { user_id: "creator", scope: "personal" as const };

describe("canChangeNoteScope", () => {
  it("allows only the creator", () => {
    expect(canChangeNoteScope("creator", note)).toBe(true);
    expect(canChangeNoteScope("other", note)).toBe(false);
  });
});

describe("canShowShare", () => {
  it("shows share only for creator personal notes when user has a family", () => {
    expect(canShowShare("creator", note, true)).toBe(true);
    expect(canShowShare("creator", note, false)).toBe(false);
    expect(canShowShare("other", note, true)).toBe(false);
    expect(
      canShowShare("creator", { user_id: "creator", scope: "family" }, true),
    ).toBe(false);
  });
});

describe("canShowUnshare", () => {
  it("shows unshare only for the creator of a family note", () => {
    expect(
      canShowUnshare("creator", { user_id: "creator", scope: "family" }),
    ).toBe(true);
    expect(
      canShowUnshare("other", { user_id: "creator", scope: "family" }),
    ).toBe(false);
    expect(canShowUnshare("creator", note)).toBe(false);
  });
});

describe("noteDisplayTitle", () => {
  it("uses placeholder for blank titles", () => {
    expect(noteDisplayTitle("")).toBe("Senza titolo");
    expect(noteDisplayTitle("  ")).toBe("Senza titolo");
    expect(noteDisplayTitle("Spesa")).toBe("Spesa");
  });
});

describe("noteShareDialogCopy", () => {
  it("explains sharing a personal note with the family", () => {
    expect(noteShareDialogCopy("share", "Spesa")).toEqual({
      title: "Condividi con la famiglia",
      description:
        "Spesa sarà visibile e modificabile da tutti i membri della famiglia.",
      confirm: "Condividi",
      pending: "Condivisione…",
    });
  });

  it("explains unsharing with the untitled placeholder", () => {
    expect(noteShareDialogCopy("unshare", "")).toEqual({
      title: "Togli condivisione",
      description:
        "Senza titolo tornerà solo tua e sparirà dalla sezione Famiglia degli altri.",
      confirm: "Togli condivisione",
      pending: "Aggiornamento…",
    });
  });
});
