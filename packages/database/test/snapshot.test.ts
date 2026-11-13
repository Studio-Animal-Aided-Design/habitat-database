import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { buildSnapshot } from "../src/snapshot.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("authoritative CSV snapshot", () => {
  it("loads, validates and deterministically reconciles the current export", async () => {
    const snapshot = await buildSnapshot(repoRoot);
    expect(snapshot.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
    expect(snapshot.species).toHaveLength(14);
    expect(snapshot.definitions).toHaveLength(49);
    expect(snapshot.plants).toHaveLength(259);
    expect(snapshot.habitats).toHaveLength(57);
    expect(snapshot.attributes).toHaveLength(685);
    expect(snapshot.speciesImages).toHaveLength(28);
    expect(snapshot.habitatImages).toHaveLength(57);
    expect(snapshot.plantRelations).toHaveLength(321);
    expect(snapshot.habitatRelations).toHaveLength(294);
    expect(snapshot.lifecyclePhases).toHaveLength(62);
    expect(new Set(snapshot.lifecyclePhases.map((item) => item.speciesKey)).size).toBe(14);
    expect(snapshot.diagnostics.filter((item) => item.code === "plant_duplicate")).toHaveLength(3);
    expect(snapshot.diagnostics.filter((item) => item.code === "duplicate_habitat_relation")).toHaveLength(6);
  });

  it("produces the same manifest and canonical content on repeated reads", async () => {
    const first = await buildSnapshot(repoRoot);
    const second = await buildSnapshot(repoRoot);
    expect(second.manifestChecksum).toBe(first.manifestChecksum);
    expect(second.plants).toEqual(first.plants);
    expect(second.habitatRelations).toEqual(first.habitatRelations);
    expect(second.lifecyclePhases).toEqual(first.lifecyclePhases);
  });

  it("reports a deliberately invalid row with its logical filename and CSV row", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "aad-invalid-row-"));
    try {
      await cp(path.join(repoRoot, "data"), path.join(temporaryRoot, "data"), { recursive: true });
      const lifecycleFile = path.join(temporaryRoot, "data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv");
      const contents = await readFile(lifecycleFile, "utf8");
      await writeFile(lifecycleFile, contents.replace(",0,180,false,180,", ",999,180,false,180,"), "utf8");

      const snapshot = await buildSnapshot(temporaryRoot);
      const diagnostic = snapshot.diagnostics.find((item) => item.code === "invalid_lifecycle_interval");
      expect(diagnostic?.severity).toBe("error");
      expect(diagnostic?.sources).toEqual([
        "data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv:2",
      ]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
