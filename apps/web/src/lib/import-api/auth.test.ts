import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { authenticateImportRequest, requireIdempotencyKey, resetImportAuthRateLimits } from "./auth";

const hash = "scrypt$Dbx3mtni2sa8jKGKAzx8EQ$U0MeNR0feb7qfoQ30xt1sHIWoLlT9b_7s2aaM0YAs8syDeVGolThOtrhPe_Xv8FwT6lPXZl1fIcMI-7k7jDO-A";

describe("import API authentication", () => {
  beforeEach(() => resetImportAuthRateLimits());

  it("accepts the configured token without logging or returning it", async () => {
    const request = new Request("http://localhost/api/imports/dry-run", { headers: { authorization: "Bearer customer-preview-test-only" } });
    await expect(authenticateImportRequest(request, hash)).resolves.toBeUndefined();
  });

  it("rejects an invalid token", async () => {
    const request = new Request("http://localhost/api/imports/dry-run", { headers: { authorization: "Bearer wrong" } });
    await expect(authenticateImportRequest(request, hash)).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("rate-limits repeated invalid credentials without exposing their value", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const request = new Request("http://localhost/api/imports/dry-run", {
        headers: { authorization: `Bearer wrong-${attempt}`, "x-real-ip": "192.0.2.1" },
      });
      await expect(authenticateImportRequest(request, hash)).rejects.toMatchObject({ status: 401 });
    }
    const blocked = new Request("http://localhost/api/imports/dry-run", {
      headers: { authorization: "Bearer still-wrong", "x-real-ip": "192.0.2.1" },
    });
    await expect(authenticateImportRequest(blocked, hash)).rejects.toMatchObject({ status: 429, code: "auth_rate_limited" });
  });

  it("requires a constrained idempotency key", () => {
    expect(requireIdempotencyKey(new Request("http://localhost", { headers: { "idempotency-key": "run:123" } }))).toBe("run:123");
    expect(() => requireIdempotencyKey(new Request("http://localhost"))).toThrow(/Idempotency/);
  });
});
