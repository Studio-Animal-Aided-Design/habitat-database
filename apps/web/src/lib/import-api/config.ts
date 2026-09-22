import path from "node:path";

export type ImportApiConfig = {
  enabled: boolean;
  tokenHash: string | null;
  stagingRoot: string;
  maxUploadBytes: number;
  maxFiles: number;
  runTtlSeconds: number;
};

type RuntimeEnvironment = Record<string, string | undefined>;

const truthy = (value: string | undefined) => value?.trim().toLowerCase() === "true";

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

export function resolveImportApiConfig(environment: RuntimeEnvironment = process.env): ImportApiConfig {
  const enabled = truthy(environment.IMPORT_API_ENABLED);
  const tokenHash = environment.IMPORT_API_TOKEN_HASH?.trim() || null;
  const stagingRoot = path.resolve(environment.IMPORT_STAGING_ROOT?.trim() || ".local/import-staging");

  if (enabled && environment.CATALOG_DATA_SOURCE !== "postgres") {
    throw new Error("IMPORT_API_ENABLED=true requires CATALOG_DATA_SOURCE=postgres.");
  }
  if (enabled && !environment.DATABASE_URL) {
    throw new Error("IMPORT_API_ENABLED=true requires DATABASE_URL.");
  }
  if (enabled && !tokenHash?.startsWith("scrypt$")) {
    throw new Error("IMPORT_API_TOKEN_HASH must contain a generated scrypt hash when the import API is enabled.");
  }

  return {
    enabled,
    tokenHash,
    stagingRoot,
    maxUploadBytes: positiveInteger(environment.IMPORT_MAX_UPLOAD_BYTES, 25 * 1024 * 1024, "IMPORT_MAX_UPLOAD_BYTES"),
    maxFiles: positiveInteger(environment.IMPORT_MAX_FILES, 128, "IMPORT_MAX_FILES"),
    runTtlSeconds: positiveInteger(environment.IMPORT_RUN_TTL_SECONDS, 24 * 60 * 60, "IMPORT_RUN_TTL_SECONDS"),
  };
}
