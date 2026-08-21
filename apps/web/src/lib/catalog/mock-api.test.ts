import { describe, expect, it } from "vitest";
import { catalogApi } from "./mock-api";

describe("MockCatalogApi", () => {
  it("filters catalogues with case-insensitive German search terms", async () => {
    const plants = await catalogApi.listPlants({ q: "FELD-ahorn" });
    const habitats = await catalogApi.listHabitats({ q: "sonnig" });

    expect(plants.map((plant) => plant.slug)).toEqual(["acer-campestre"]);
    expect(habitats.map((habitat) => habitat.slug)).toContain("ruderalflaeche");
  });

  it("combines text and type filters", async () => {
    const matches = await catalogApi.listPlants({ q: "heimische", type: "Staude" });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((plant) => plant.type === "Staude")).toBe(true);
  });

  it("returns null for unknown detail routes", async () => {
    await expect(catalogApi.getSpeciesBySlug("unbekannt")).resolves.toBeNull();
    await expect(catalogApi.getPlantBySlug("unbekannt")).resolves.toBeNull();
    await expect(catalogApi.getHabitatBySlug("unbekannt")).resolves.toBeNull();
  });

  it("keeps mocked cross-entity links referentially valid", async () => {
    const species = await catalogApi.getSpeciesBySlug("gimpel");
    expect(species).not.toBeNull();

    for (const plant of species?.plants ?? []) {
      await expect(catalogApi.getPlantBySlug(plant.slug)).resolves.not.toBeNull();
    }
    for (const habitat of species?.habitats ?? []) {
      await expect(catalogApi.getHabitatBySlug(habitat.slug)).resolves.not.toBeNull();
    }
  });
});
