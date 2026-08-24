import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { verifyPreviewPassword } from "./password";

describe("verifyPreviewPassword", () => {
  const hash = "scrypt$Dbx3mtni2sa8jKGKAzx8EQ$U0MeNR0feb7qfoQ30xt1sHIWoLlT9b_7s2aaM0YAs8syDeVGolThOtrhPe_Xv8FwT6lPXZl1fIcMI-7k7jDO-A";

  it("accepts only the password represented by the generated hash", async () => {
    await expect(verifyPreviewPassword("customer-preview-test-only", hash)).resolves.toBe(true);
    await expect(verifyPreviewPassword("incorrect", hash)).resolves.toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPreviewPassword("anything", "plaintext")).resolves.toBe(false);
  });
});
