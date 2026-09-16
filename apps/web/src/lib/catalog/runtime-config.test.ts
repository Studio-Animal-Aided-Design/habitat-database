import { describe, expect, it } from "vitest";
import { resolveCatalogRuntimeConfig } from "./runtime-config";

describe("resolveCatalogRuntimeConfig", () => {
  it("keeps the development PostgreSQL-to-mock fallback", () => {
    const config = resolveCatalogRuntimeConfig({ NODE_ENV: "development" });
    expect(config.source).toBe("auto");
    expect(config.allowPostgresFallback).toBe(true);
    expect(config.databaseUrl).toContain("localhost:5432");
  });

  it("allows explicit mock data in a production-built preview", () => {
    const config = resolveCatalogRuntimeConfig({
      NODE_ENV: "production",
      APP_ENV: "preview",
      CATALOG_DATA_SOURCE: "mock",
      ALLOW_MOCK_CATALOG_IN_PREVIEW: "true"
    });
    expect(config.source).toBe("mock");
    expect(config.allowPostgresFallback).toBe(false);
  });

  it("rejects preview mock data without the acknowledgement flag", () => {
    expect(() => resolveCatalogRuntimeConfig({
      NODE_ENV: "production",
      APP_ENV: "preview",
      CATALOG_DATA_SOURCE: "mock"
    })).toThrow(/ALLOW_MOCK_CATALOG_IN_PREVIEW/);
  });

  it("never permits mock or auto data in production", () => {
    expect(() => resolveCatalogRuntimeConfig({ APP_ENV: "production", CATALOG_DATA_SOURCE: "mock" })).toThrow(/mock catalog/);
    expect(() => resolveCatalogRuntimeConfig({ APP_ENV: "production", CATALOG_DATA_SOURCE: "auto" })).toThrow(/restricted/);
  });

  it("requires a database URL for production PostgreSQL", () => {
    expect(() => resolveCatalogRuntimeConfig({ APP_ENV: "production", CATALOG_DATA_SOURCE: "postgres" })).toThrow(/DATABASE_URL/);
  });
});
