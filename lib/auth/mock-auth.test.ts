import { describe, expect, it } from "vitest";
import { toMockAuthCandidate } from "@/lib/auth/mock-auth";

describe("toMockAuthCandidate", () => {
  it("maps member row to candidate", () => {
    expect(
      toMockAuthCandidate({
        id: "m1",
        email: "admin@hestia.dev",
        full_name: "Admin Dev",
        role: "admin",
        auth_user_id: "u1",
      }),
    ).toEqual({
      id: "m1",
      email: "admin@hestia.dev",
      full_name: "Admin Dev",
      role: "admin",
      has_auth_user: true,
    });
  });

  it("sets has_auth_user false when auth_user_id is null", () => {
    expect(
      toMockAuthCandidate({
        id: "m2",
        email: "new@hestia.dev",
        full_name: null,
        role: "user",
        auth_user_id: null,
      }).has_auth_user,
    ).toBe(false);
  });
});
