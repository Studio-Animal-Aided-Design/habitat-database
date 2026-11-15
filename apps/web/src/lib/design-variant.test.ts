import { describe, expect, it } from "vitest";
import { resolveDesignVariant } from "../../design.config";

describe("local design selection", () => {
  it("defaults to the Studio design", () => {
    expect(resolveDesignVariant(undefined, true)).toBe("studio");
    expect(resolveDesignVariant(undefined, false)).toBe("studio");
  });

  it("retains classic only for a development server", () => {
    expect(resolveDesignVariant("classic", true)).toBe("classic");
    expect(() => resolveDesignVariant("classic", false)).toThrow("local development");
  });

  it("rejects misspelled variants", () => {
    expect(() => resolveDesignVariant("stduio", true)).toThrow("APP_DESIGN");
  });
});
