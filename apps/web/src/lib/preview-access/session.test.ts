import { describe, expect, it } from "vitest";
import { createPreviewSessionToken, verifyPreviewSessionToken } from "./session";

describe("preview access sessions", () => {
  const secret = "a-preview-session-secret-that-is-sufficiently-long";

  it("accepts an authentic unexpired session", async () => {
    const token = await createPreviewSessionToken(secret, 2_000);
    await expect(verifyPreviewSessionToken(token, secret, 1_000)).resolves.toBe(true);
  });

  it("rejects expired, tampered, and differently signed sessions", async () => {
    const token = await createPreviewSessionToken(secret, 2_000);
    await expect(verifyPreviewSessionToken(token, secret, 2_000)).resolves.toBe(false);
    await expect(verifyPreviewSessionToken(`${token}x`, secret, 1_000)).resolves.toBe(false);
    await expect(verifyPreviewSessionToken(token, `${secret}-other`, 1_000)).resolves.toBe(false);
  });
});
