import { describe, expect, it } from "vitest";
import { resolveAppEnvironment } from "./runtime-environment";

describe("resolveAppEnvironment", () => {
  it("uses the explicit application environment independently of NODE_ENV", () => {
    expect(resolveAppEnvironment({ APP_ENV: "preview", NODE_ENV: "production" })).toBe("preview");
  });

  it("defaults production builds to the production application environment", () => {
    expect(resolveAppEnvironment({ NODE_ENV: "production" })).toBe("production");
  });

  it("rejects unknown values", () => {
    expect(() => resolveAppEnvironment({ APP_ENV: "staging" })).toThrow(/APP_ENV/);
  });
});
