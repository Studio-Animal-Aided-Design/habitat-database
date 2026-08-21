import { mockHabitats, mockPlants, mockSpecies } from "./mock-data";
import { featuredSlugs, selectFeatured, uniquePublishedTypes } from "./featured-content";
import type {
  CatalogApi,
  CatalogOverview,
  CatalogQuery,
  CatalogTypes,
  HabitatDetail,
  HabitatSummary,
  PlantDetail,
  PlantSummary,
  SpeciesDetail,
  SpeciesSummary
} from "./types";

function includesQuery(values: Array<string | undefined>, q?: string) {
  if (!q?.trim()) return true;
  const normalized = q.trim().toLocaleLowerCase("de");
  return values.some((value) => value?.toLocaleLowerCase("de").includes(normalized));
}

export class MockCatalogApi implements CatalogApi {
  async getOverview(): Promise<CatalogOverview> {
    return {
      speciesCount: 14,
      plantCount: 262,
      habitatCount: 57,
      featuredSpecies: selectFeatured(mockSpecies, featuredSlugs.species),
      featuredPlants: selectFeatured(mockPlants, featuredSlugs.plants),
      featuredHabitats: selectFeatured(mockHabitats, featuredSlugs.habitats)
    };
  }

  async getCatalogTypes(): Promise<CatalogTypes> {
    return {
      speciesTypes: uniquePublishedTypes(mockSpecies),
      plantTypes: uniquePublishedTypes(mockPlants),
      habitatTypes: uniquePublishedTypes(mockHabitats)
    };
  }

  async listSpecies(query: CatalogQuery = {}): Promise<SpeciesSummary[]> {
    return mockSpecies.filter(
      (species) =>
        (!query.type || species.className === query.type) &&
        includesQuery([species.commonName, species.scientificName, species.className, species.familyName], query.q)
    );
  }

  async getSpeciesBySlug(slug: string): Promise<SpeciesDetail | null> {
    return mockSpecies.find((species) => species.slug === slug) ?? null;
  }

  async listPlants(query: CatalogQuery = {}): Promise<PlantSummary[]> {
    return mockPlants.filter(
      (plant) =>
        (!query.type || plant.type === query.type) &&
        includesQuery([plant.commonName, plant.scientificName, plant.type, plant.ecologicalValue], query.q)
    );
  }

  async getPlantBySlug(slug: string): Promise<PlantDetail | null> {
    return mockPlants.find((plant) => plant.slug === slug) ?? null;
  }

  async listHabitats(query: CatalogQuery = {}): Promise<HabitatSummary[]> {
    return mockHabitats.filter(
      (habitat) =>
        (!query.type || habitat.type === query.type) &&
        includesQuery([habitat.name, habitat.type, habitat.location, habitat.teaser], query.q)
    );
  }

  async getHabitatBySlug(slug: string): Promise<HabitatDetail | null> {
    return mockHabitats.find((habitat) => habitat.slug === slug) ?? null;
  }
}

export const catalogApi: CatalogApi = new MockCatalogApi();
