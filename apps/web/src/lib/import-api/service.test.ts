import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applySync: vi.fn(),
  buildSnapshot: vi.fn(),
  getImportRun: vi.fn(),
  markImportRunExpired: vi.fn(),
  markImportRunFailed: vi.fn(),
  revalidatePath: vi.fn(),
  removeStagedRun: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@aad/database", () => ({
  applySync: mocks.applySync,
  buildSnapshot: mocks.buildSnapshot,
  createDryRun: vi.fn(),
  findImportRunByIdempotencyKey: vi.fn(),
  getImportRun: mocks.getImportRun,
  markImportRunExpired: mocks.markImportRunExpired,
  markImportRunFailed: mocks.markImportRunFailed,
  planSync: vi.fn(),
  SnapshotValidationError: class SnapshotValidationError extends Error {},
  withDatabase: (callback: (client: object) => unknown) => callback({}),
}));
vi.mock("./auth", () => ({
  authenticateImportRequest: vi.fn(),
  requireIdempotencyKey: () => "apply-key",
}));
vi.mock("./staging", () => ({
  removeStagedRun: mocks.removeStagedRun,
  resolveStagedRunRoot: () => "/staging/run-1",
  stageImportForm: vi.fn(),
}));

import { applyImportRun } from "./service";

const report = {
  generatedAt: "2026-09-22T00:00:00.000Z",
  manifestChecksum: "manifest-1",
  mode: "sync" as const,
  applied: false,
  sourceFiles: [],
  datasets: {},
  diagnostics: [],
};

const run = {
  id: "00000000-0000-4000-8000-000000000001",
  manifestChecksum: "manifest-1",
  mode: "sync" as const,
  status: "dry_run_succeeded" as const,
  stagingKey: "00000000-0000-4000-8000-000000000001",
  report,
  expiresAt: "2099-01-01T00:00:00.000Z",
  dryRunIdempotencyKey: "dry-key",
  applyIdempotencyKey: null,
  startedAt: "2026-09-22T00:00:00.000Z",
  finishedAt: null,
};

describe("import apply orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IMPORT_API_ENABLED", "true");
    vi.stubEnv("IMPORT_API_TOKEN_HASH", "scrypt$c2FsdA$aGFzaA");
    vi.stubEnv("CATALOG_DATA_SOURCE", "postgres");
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    mocks.getImportRun.mockResolvedValue(run);
    mocks.buildSnapshot.mockResolvedValue({ manifestChecksum: "manifest-1" });
    mocks.applySync.mockResolvedValue({ ...report, applied: true });
  });

  it("refreshes public reads only after a successful transactional apply", async () => {
    const applied = await applyImportRun(new Request("http://localhost"), run.id, "manifest-1");
    expect(applied.status).toBe("applied");
    expect(mocks.applySync).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.removeStagedRun).toHaveBeenCalledOnce();
  });

  it("returns an already applied run without requiring staged files", async () => {
    mocks.getImportRun.mockResolvedValue({ ...run, status: "applied", report: { ...report, applied: true } });
    const repeated = await applyImportRun(new Request("http://localhost"), run.id, "manifest-1");
    expect(repeated.status).toBe("applied");
    expect(mocks.buildSnapshot).not.toHaveBeenCalled();
    expect(mocks.applySync).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not refresh public reads when apply fails", async () => {
    mocks.applySync.mockRejectedValue(new Error("database constraint failed"));
    await expect(applyImportRun(new Request("http://localhost"), run.id, "manifest-1")).rejects.toThrow(/constraint/);
    expect(mocks.markImportRunFailed).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.removeStagedRun).not.toHaveBeenCalled();
  });

  it("expires stale runs and removes their staged bytes", async () => {
    mocks.getImportRun.mockResolvedValue({ ...run, expiresAt: "2020-01-01T00:00:00.000Z" });
    await expect(applyImportRun(new Request("http://localhost"), run.id, "manifest-1")).rejects.toMatchObject({ status: 410 });
    expect(mocks.markImportRunExpired).toHaveBeenCalledOnce();
    expect(mocks.removeStagedRun).toHaveBeenCalledOnce();
    expect(mocks.applySync).not.toHaveBeenCalled();
  });
});
