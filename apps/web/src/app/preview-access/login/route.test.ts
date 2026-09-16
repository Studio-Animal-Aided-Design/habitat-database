import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { POST } from "./route";

const password = "customer-preview-test-only";
const passwordHash = "scrypt$Dbx3mtni2sa8jKGKAzx8EQ$U0MeNR0feb7qfoQ30xt1sHIWoLlT9b_7s2aaM0YAs8syDeVGolThOtrhPe_Xv8FwT6lPXZl1fIcMI-7k7jDO-A";

function loginRequest(candidate: string, returnTo = "/") {
  return new NextRequest("http://0.0.0.0:10000/preview-access/login", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-host": "aad-habitat-preview.onrender.com",
      "x-forwarded-proto": "https"
    },
    body: new URLSearchParams({ password: candidate, returnTo })
  });
}

describe("preview access login redirects", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("PREVIEW_ACCESS_MODE", "shared-password");
    vi.stubEnv("PREVIEW_ACCESS_PASSWORD_HASH", passwordHash);
    vi.stubEnv("PREVIEW_ACCESS_SESSION_SECRET", "a-preview-session-secret-longer-than-32-characters");
    vi.stubEnv("PREVIEW_ACCESS_SESSION_DURATION_SECONDS", "604800");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("redirects a successful login with a relative Location header", async () => {
    const response = await POST(loginRequest(password, "/species/gimpel?tab=life"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/species/gimpel?tab=life");
    expect(response.headers.get("location")).not.toContain("0.0.0.0");
    expect(response.headers.get("set-cookie")).toContain("aad_preview_access=");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("keeps an invalid-login redirect relative as well", async () => {
    const response = await POST(loginRequest("incorrect", "/plants"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/preview-access?error=invalid&returnTo=%2Fplants");
  });
});
