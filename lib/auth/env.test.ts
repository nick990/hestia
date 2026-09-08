import { afterEach, describe, expect, it, vi } from "vitest";
import { isMockAuthEnabled } from "@/lib/auth/env";

describe("isMockAuthEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when mode is mock and password is set", () => {
    vi.stubEnv("HESTIA_AUTH_MODE", "mock");
    vi.stubEnv("MOCK_AUTH_PASSWORD", "dev123456");
    expect(isMockAuthEnabled()).toBe(true);
  });

  it("returns false when mode is oauth", () => {
    vi.stubEnv("HESTIA_AUTH_MODE", "oauth");
    vi.stubEnv("MOCK_AUTH_PASSWORD", "dev123456");
    expect(isMockAuthEnabled()).toBe(false);
  });

  it("returns false when password is missing", () => {
    vi.stubEnv("HESTIA_AUTH_MODE", "mock");
    vi.stubEnv("MOCK_AUTH_PASSWORD", "");
    expect(isMockAuthEnabled()).toBe(false);
  });

  it("returns false when mode is unset", () => {
    vi.stubEnv("HESTIA_AUTH_MODE", "");
    vi.stubEnv("MOCK_AUTH_PASSWORD", "dev123456");
    expect(isMockAuthEnabled()).toBe(false);
  });
});
