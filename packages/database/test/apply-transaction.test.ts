import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { applySync } from "../src/sync";
import type { ImportReport } from "../src/report";
import type { Snapshot } from "../src/snapshot";

describe("transactional apply", () => {
  it("rolls back the complete batch after a canonical persistence error", async () => {
    const statements: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        statements.push(sql);
        if (sql.startsWith("INSERT INTO species(")) throw new Error("simulated constraint failure");
        return { rows: [] };
      }),
    } as unknown as pg.PoolClient;
    const snapshot = {
      manifestChecksum: "manifest-1",
      files: [],
      diagnostics: [],
      species: [{ scientific_name: "Testus test", naturalKey: "testus test" }],
      definitions: [],
      plants: [],
      habitats: [],
      attributes: [],
      speciesImages: [],
      habitatImages: [],
      plantRelations: [],
      habitatRelations: [],
      lifecyclePhases: [],
    } as Snapshot;
    const report: ImportReport = {
      generatedAt: "2026-09-22T00:00:00.000Z",
      manifestChecksum: "manifest-1",
      mode: "merge",
      applied: false,
      sourceFiles: [],
      datasets: {},
      diagnostics: [],
    };

    await expect(applySync(client, snapshot, report)).rejects.toThrow(/constraint/);
    expect(statements[0]).toBe("BEGIN");
    expect(statements.at(-1)).toBe("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
  });
});
