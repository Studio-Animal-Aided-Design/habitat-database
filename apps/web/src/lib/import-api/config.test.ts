import { describe, expect, it } from "vitest";
import { resolveImportApiConfig } from "./config";

const enabled = {
  IMPORT_API_ENABLED: "true",
  IMPORT_API_TOKEN_HASH: "scrypt$c2FsdA$aGFzaA",
  CATALOG_DATA_SOURCE: "postgres",
  DATABASE_URL: "postgresql://example",
};

describe("import API configuration", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(resolveImportApiConfig({}).enabled).toBe(false);
  });

  it("requires PostgreSQL and a hashed token when enabled", () => {
    expect(resolveImportApiConfig(enabled).enabled).toBe(true);
    expect(() => resolveImportApiConfig({ ...enabled, CATALOG_DATA_SOURCE: "mock" })).toThrow(/postgres/);
    expect(() => resolveImportApiConfig({ ...enabled, IMPORT_API_TOKEN_HASH: "plain" })).toThrow(/scrypt/);
  });

  it("validates numeric limits", () => {
    expect(() => resolveImportApiConfig({ ...enabled, IMPORT_MAX_FILES: "0" })).toThrow(/positive integer/);
  });
});
