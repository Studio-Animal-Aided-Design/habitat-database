import { describe, expect, it } from "vitest";
import { resolvePreviewAccessConfig, sanitizePreviewReturnTo } from "./config";

const enabledEnvironment = {
  APP_ENV: "preview",
  PREVIEW_ACCESS_MODE: "shared-password",
  PREVIEW_ACCESS_PASSWORD_HASH: "scrypt$c2FsdA$aGFzaA",
  PREVIEW_ACCESS_SESSION_SECRET: "a-secret-that-is-longer-than-thirty-two-characters"
};

describe("resolvePreviewAccessConfig", () => {
  it("enables a shared-password gate only for previews", () => {
    expect(resolvePreviewAccessConfig(enabledEnvironment)).toMatchObject({ enabled: true });
    expect(() => resolvePreviewAccessConfig({ ...enabledEnvironment, APP_ENV: "production" })).toThrow(/APP_ENV=preview/);
  });

  it("requires a password hash and a strong session secret", () => {
    expect(() => resolvePreviewAccessConfig({ ...enabledEnvironment, PREVIEW_ACCESS_PASSWORD_HASH: "plaintext" })).toThrow(/scrypt/);
    expect(() => resolvePreviewAccessConfig({ ...enabledEnvironment, PREVIEW_ACCESS_SESSION_SECRET: "short" })).toThrow(/32/);
  });
});

describe("sanitizePreviewReturnTo", () => {
  it("accepts local paths and rejects external or authentication paths", () => {
    expect(sanitizePreviewReturnTo("/species/gimpel?tab=life")).toBe("/species/gimpel?tab=life");
    expect(sanitizePreviewReturnTo("//example.com")).toBe("/");
    expect(sanitizePreviewReturnTo("https://example.com")).toBe("/");
    expect(sanitizePreviewReturnTo("/preview-access?loop=1")).toBe("/");
  });
});
