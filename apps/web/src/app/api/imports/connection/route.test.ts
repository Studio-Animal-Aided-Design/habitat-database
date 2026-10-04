import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/import-api/service", () => ({
  authorizeImportRequest: vi.fn(),
}));

import { authorizeImportRequest } from "@/lib/import-api/service";
import { GET } from "./route";

describe("import API connection check", () => {
  beforeEach(() => vi.mocked(authorizeImportRequest).mockReset());

  it("confirms that the feature and bearer token are valid", async () => {
    vi.mocked(authorizeImportRequest).mockResolvedValue({
      enabled: true,
      tokenHash: "scrypt$test",
      stagingRoot: "/tmp/test",
      maxUploadBytes: 1,
      maxFiles: 1,
      runTtlSeconds: 1,
    });
    const response = await GET(new Request("https://example.test/api/imports/connection"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      connection: { authenticated: true, importApiEnabled: true },
    });
  });
});
