import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SpeciesAttribute } from "@/lib/catalog/types";
import { groupSpeciesAttributes, SpeciesAttributeBrowser } from "./species-attribute-browser";

const attributes: SpeciesAttribute[] = [
  {
    category: "Kurzcharakteristik",
    subcategory: "Aussehen und Körperbau",
    label: "Aussehen",
    value: "Rote Unterseite.",
    sources: "Beispielquelle"
  },
  {
    category: "Kurzcharakteristik",
    subcategory: "Aussehen und Körperbau",
    label: "Morphologie",
    value: "Kompakter Körperbau."
  },
  {
    category: "Bedeutung für den Menschen",
    subcategory: "Wahrnehmung",
    label: "Beobachtbarkeit",
    value: "Gut zu erkennen."
  }
];

describe("SpeciesAttributeBrowser", () => {
  it("preserves canonical category and subgroup order while deriving counts", () => {
    const grouped = groupSpeciesAttributes(attributes);

    expect(grouped.map((category) => [category.name, category.count])).toEqual([
      ["Kurzcharakteristik", 2],
      ["Bedeutung für den Menschen", 1]
    ]);
    expect(grouped[0].subgroups.map((subgroup) => subgroup.name)).toEqual(["Aussehen und Körperbau"]);
    expect(grouped[0].subgroups[0].attributes.map((attribute) => attribute.label)).toEqual(["Aussehen", "Morphologie"]);
  });

  it("server-renders the full editorial index, disclosures, values, and sources", () => {
    const html = renderToStaticMarkup(<SpeciesAttributeBrowser attributes={attributes} />);

    expect(html).toContain('aria-label="Themenfilter für die Artenmerkmale"');
    expect(html).toContain('href="#merkmale-kurzcharakteristik"');
    expect(html).toContain("Aussehen und Körperbau");
    expect(html).toContain("Rote Unterseite.");
    expect(html).toContain("Beispielquelle");
    expect(html).toContain("<details");
    expect(html).not.toContain("overflow");
  });

  it("renders a useful sparse-data state", () => {
    const html = renderToStaticMarkup(<SpeciesAttributeBrowser attributes={[]} />);

    expect(html).toContain("keine Merkmale veröffentlicht");
    expect(html).not.toContain("<nav");
  });
});
