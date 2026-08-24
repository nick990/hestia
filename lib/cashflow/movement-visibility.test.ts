import { describe, expect, it } from "vitest";
import {
  canSetPrivate,
  hasAssigneeChanged,
  isPrivateChangeAllowed,
} from "@/lib/cashflow/movement-visibility";

describe("hasAssigneeChanged", () => {
  const existing = {
    assignee_kind: "family" as const,
    assignee_user_id: null,
    is_private: false,
  };

  it("returns false when assignee unchanged", () => {
    expect(
      hasAssigneeChanged(existing, {
        assignee_kind: "family",
        assignee_user_id: null,
        is_private: false,
      }),
    ).toBe(false);
  });

  it("returns true when assignee kind changes", () => {
    expect(
      hasAssigneeChanged(existing, {
        assignee_kind: "member",
        assignee_user_id: "u1",
        is_private: false,
      }),
    ).toBe(true);
  });
});

describe("isPrivateChangeAllowed", () => {
  const existing = {
    assignee_kind: "member" as const,
    assignee_user_id: "u1",
    is_private: false,
  };

  it("allows unchanged private flag", () => {
    expect(isPrivateChangeAllowed("u1", "u2", existing, existing)).toBe(true);
  });

  it("allows private change when next assignee is current user", () => {
    expect(
      isPrivateChangeAllowed("u2", "u2", existing, {
        ...existing,
        assignee_user_id: "u2",
        is_private: true,
      }),
    ).toBe(true);
  });

  it("denies private change when next assignee is not current user", () => {
    expect(
      isPrivateChangeAllowed("u1", "u2", existing, {
        ...existing,
        is_private: true,
      }),
    ).toBe(false);
  });
});

describe("canSetPrivate", () => {
  it("returns true only for self assignee", () => {
    expect(canSetPrivate("u1", "u1")).toBe(true);
    expect(canSetPrivate("u1", "u2")).toBe(false);
  });
});
