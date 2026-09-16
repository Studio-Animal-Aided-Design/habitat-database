import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("preview access logout redirect", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("PREVIEW_ACCESS_MODE", "shared-password");
    vi.stubEnv("PREVIEW_ACCESS_PASSWORD_HASH", "scrypt$c2FsdA$aGFzaA");
    vi.stubEnv("PREVIEW_ACCESS_SESSION_SECRET", "a-preview-session-secret-longer-than-32-characters");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns to the access page without exposing the internal server origin", async () => {
    const response = await POST();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/preview-access");
    expect(response.headers.get("set-cookie")).toContain("aad_preview_access=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
