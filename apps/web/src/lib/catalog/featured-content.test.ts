import { describe, expect, it } from "vitest";
import { selectFeatured, uniquePublishedTypes } from "./featured-content";

const records = [
  { slug: "zeta", status: "published" as const, type: "Staude" },
  { slug: "preferred", status: "published" as const, type: "Gehölz" },
  { slug: "alpha", status: "published" as const, type: "Staude" },
  { slug: "draft", status: "draft" as const, type: "Einjährige" }
];

describe("featured content policy", () => {
  it("keeps editorial preferences and fills gaps deterministically", () => {
    expect(selectFeatured(records, ["missing", "preferred"], 3).map((item) => item.slug))
      .toEqual(["preferred", "alpha", "zeta"]);
  });

  it("excludes unpublished records from features and filter facets", () => {
    expect(selectFeatured(records, ["draft"], 5).map((item) => item.slug))
      .toEqual(["alpha", "preferred", "zeta"]);
    expect(uniquePublishedTypes(records)).toEqual(["Gehölz", "Staude"]);
  });
});
