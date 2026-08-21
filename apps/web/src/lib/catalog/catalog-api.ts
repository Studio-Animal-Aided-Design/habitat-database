import type { CatalogApi } from "./types";
import { MockCatalogApi } from "./mock-api";
import { createPostgresCatalogApi } from "./postgres-api";

type CatalogDataSource = "auto" | "postgres" | "mock";

const isDevelopmentOrTest = process.env.NODE_ENV !== "production";
const configuredSource = (process.env.CATALOG_DATA_SOURCE || (isDevelopmentOrTest ? "auto" : "postgres")) as CatalogDataSource;

if (!["auto", "postgres", "mock"].includes(configuredSource)) {
  throw new Error("CATALOG_DATA_SOURCE must be auto, postgres, or mock.");
}
if (configuredSource === "mock" && !isDevelopmentOrTest) {
  throw new Error("The mock catalog is restricted to development and test environments.");
}

class DevelopmentFallbackCatalogApi implements CatalogApi {
  private warned = false;

  constructor(private readonly primary: CatalogApi, private readonly fallback: CatalogApi) {}

  private async call<T>(operation: keyof CatalogApi, run: (api: CatalogApi) => Promise<T>): Promise<T> {
    try {
      return await run(this.primary);
    } catch (error) {
      if (!this.warned) {
        this.warned = true;
        console.warn(`[catalog] PostgreSQL operation ${operation} failed; using development mock data.`, error);
      }
      return run(this.fallback);
    }
  }

  getOverview = () => this.call("getOverview", (api) => api.getOverview());
  getCatalogTypes = () => this.call("getCatalogTypes", (api) => api.getCatalogTypes());
  listSpecies = (query?: Parameters<CatalogApi["listSpecies"]>[0]) => this.call("listSpecies", (api) => api.listSpecies(query));
  getSpeciesBySlug = (slug: string) => this.call("getSpeciesBySlug", (api) => api.getSpeciesBySlug(slug));
  listPlants = (query?: Parameters<CatalogApi["listPlants"]>[0]) => this.call("listPlants", (api) => api.listPlants(query));
  getPlantBySlug = (slug: string) => this.call("getPlantBySlug", (api) => api.getPlantBySlug(slug));
  listHabitats = (query?: Parameters<CatalogApi["listHabitats"]>[0]) => this.call("listHabitats", (api) => api.listHabitats(query));
  getHabitatBySlug = (slug: string) => this.call("getHabitatBySlug", (api) => api.getHabitatBySlug(slug));
}

function selectCatalogApi(): CatalogApi {
  const mock = new MockCatalogApi();
  if (configuredSource === "mock") return mock;
  const postgres = createPostgresCatalogApi(process.env.DATABASE_URL || (isDevelopmentOrTest ? "postgresql://aad:aad-local-only@localhost:5432/aad_habitat" : undefined));
  return configuredSource === "auto" && isDevelopmentOrTest
    ? new DevelopmentFallbackCatalogApi(postgres, mock)
    : postgres;
}

export const catalogApi: CatalogApi = selectCatalogApi();
