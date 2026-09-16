import { describe, expect, it } from "vitest";
import { sameOriginRedirect } from "./redirect";

describe("sameOriginRedirect", () => {
  it("keeps the Location header relative to the public request origin", () => {
    const response = sameOriginRedirect("/species/gimpel?tab=life", 303);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/species/gimpel?tab=life");
  });

  it("rejects absolute and protocol-relative redirect targets", () => {
    expect(() => sameOriginRedirect("https://example.com")).toThrow(/same-origin/);
    expect(() => sameOriginRedirect("//example.com")).toThrow(/same-origin/);
  });
});
