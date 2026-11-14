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

  it.each([
    "/brand/studio-aad-color.jpg",
    "/brand/studio-aad-white.png",
    "/fonts/lato/lato-latin-400.woff2",
    "/fonts/lato/lato-latin-700.woff2",
    "/fonts/lato/lato-latin-ext-400.woff2",
    "/fonts/lato/lato-latin-ext-700.woff2"
  ])("loads the login screen's CI asset %s without a session", async (path) => {
    enablePreviewGate();
    const response = await proxy(new NextRequest(`https://preview.example${path}`));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it.each(["/species", "/management", "/brand/private.csv", "/fonts/private.json"])(
    "keeps %s protected without a session",
    async (path) => {
      enablePreviewGate();
      const response = await proxy(new NextRequest(`https://preview.example${path}`));
      expect(response.status).toBe(307);
      const target = new URL(response.headers.get("location")!);
      expect(target.pathname).toBe("/preview-access");
      expect(target.searchParams.get("returnTo")).toBe(path);
    }
  );

});
