import { describe, expect, it } from "vitest";
import {
  hasVisibilityChanged,
  isVisibilityChangeAllowed,
  VISIBILITY_CHANGE_DENIED_MESSAGE,
} from "@/lib/cashflow/movement-visibility";

describe("hasVisibilityChanged", () => {
  const existing = { scope: "family" as const, family_id: "f1" };

  it("returns false when scope and family_id unchanged", () => {
    expect(hasVisibilityChanged(existing, { scope: "family", family_id: "f1" })).toBe(false);
  });

  it("returns true when scope changes", () => {
    expect(hasVisibilityChanged(existing, { scope: "private", family_id: null })).toBe(true);
  });

  it("returns true when family_id changes", () => {
    expect(hasVisibilityChanged(existing, { scope: "family", family_id: "f2" })).toBe(true);
  });
});

describe("isVisibilityChangeAllowed", () => {
  it("allows author to change visibility", () => {
    expect(isVisibilityChangeAllowed("u1", "u1", true)).toBe(true);
  });

  it("allows non-author when visibility unchanged", () => {
    expect(isVisibilityChangeAllowed("u1", "u2", false)).toBe(true);
  });

  it("denies non-author when visibility changed", () => {
    expect(isVisibilityChangeAllowed("u1", "u2", true)).toBe(false);
  });
});

describe("VISIBILITY_CHANGE_DENIED_MESSAGE", () => {
  it("is a non-empty Italian message", () => {
    expect(VISIBILITY_CHANGE_DENIED_MESSAGE).toContain("autore");
  });
});
