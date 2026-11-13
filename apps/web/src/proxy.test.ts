import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { proxy } from "./proxy";

describe("preview proxy import boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  function enablePreviewGate() {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("PREVIEW_ACCESS_MODE", "shared-password");
    vi.stubEnv("PREVIEW_ACCESS_PASSWORD_HASH", "scrypt$c2FsdA$aGFzaA");
    vi.stubEnv("PREVIEW_ACCESS_SESSION_SECRET", "a-preview-session-secret-longer-than-32-characters");
  }

  it("lets the separately authenticated import API reach its Route Handler", async () => {
    enablePreviewGate();
    const response = await proxy(new NextRequest("https://preview.example/api/imports/dry-run", { method: "POST" }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("still rejects other unauthenticated preview writes", async () => {
    enablePreviewGate();
    const response = await proxy(new NextRequest("https://preview.example/management/species", { method: "POST" }));
    expect(response.status).toBe(401);
  });
});
