import { resolveAppEnvironment, type AppEnvironment } from "../runtime-environment";

export const catalogDataSources = ["auto", "postgres", "mock"] as const;
export type CatalogDataSource = (typeof catalogDataSources)[number];

type RuntimeEnvironment = Record<string, string | undefined>;

export type CatalogRuntimeConfig = {
  appEnvironment: AppEnvironment;
  source: CatalogDataSource;
  allowPostgresFallback: boolean;
  databaseUrl?: string;
};

const truthy = (value: string | undefined) => value?.toLowerCase() === "true";

export function resolveCatalogRuntimeConfig(environment: RuntimeEnvironment = process.env): CatalogRuntimeConfig {
  const appEnvironment = resolveAppEnvironment(environment);
  const isDevelopmentOrTest = appEnvironment === "development" || appEnvironment === "test";
  const defaultSource: CatalogDataSource = isDevelopmentOrTest ? "auto" : "postgres";
  const source = (environment.CATALOG_DATA_SOURCE?.trim() || defaultSource) as CatalogDataSource;

  if (!catalogDataSources.includes(source)) {
    throw new Error(`CATALOG_DATA_SOURCE must be one of: ${catalogDataSources.join(", ")}.`);
  }

  if (source === "auto" && !isDevelopmentOrTest) {
    throw new Error("CATALOG_DATA_SOURCE=auto is restricted to development and test environments.");
  }

  if (source === "mock") {
    const allowedInPreview = appEnvironment === "preview" && truthy(environment.ALLOW_MOCK_CATALOG_IN_PREVIEW);
    if (!isDevelopmentOrTest && !allowedInPreview) {
      throw new Error(
        "The mock catalog is restricted to development/test or an explicit preview with " +
        "APP_ENV=preview and ALLOW_MOCK_CATALOG_IN_PREVIEW=true."
      );
    }
  }

  const localDatabaseUrl = "postgresql://aad:aad-local-only@localhost:5432/aad_habitat";
  const databaseUrl = environment.DATABASE_URL || (isDevelopmentOrTest ? localDatabaseUrl : undefined);
  if (source === "postgres" && !databaseUrl) {
    throw new Error("DATABASE_URL is required when CATALOG_DATA_SOURCE=postgres.");
  }

  return {
    appEnvironment,
    source,
    allowPostgresFallback: source === "auto" && isDevelopmentOrTest,
    databaseUrl
  };
}
