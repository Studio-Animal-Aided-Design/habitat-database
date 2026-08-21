import path from "node:path";
import { fileURLToPath } from "node:url";
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
    expect(snapshot.diagnostics.filter((item) => item.code === "plant_duplicate")).toHaveLength(3);
    expect(snapshot.diagnostics.filter((item) => item.code === "duplicate_habitat_relation")).toHaveLength(6);
  });

  it("produces the same manifest and canonical content on repeated reads", async () => {
    const first = await buildSnapshot(repoRoot);
    const second = await buildSnapshot(repoRoot);
    expect(second.manifestChecksum).toBe(first.manifestChecksum);
    expect(second.plants).toEqual(first.plants);
    expect(second.habitatRelations).toEqual(first.habitatRelations);
  });
});
