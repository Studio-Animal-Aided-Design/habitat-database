import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RelatedHabitat, RelatedPlant } from "@/lib/catalog/types";
import {
  buildPlanningItems,
  filterPlanningItems,
  groupPlanningItems,
  planningFunctionIds,
  SpeciesPlanningBrowser
} from "./species-planning-browser";

const plants: RelatedPlant[] = [
  { slug: "acer-campestre", commonName: "Feld-Ahorn", scientificName: "Acer campestre", purpose: "Nahrung (Samen, Knospen)" },
  { slug: "cornus-mas", commonName: "Kornelkirsche", scientificName: "Cornus mas", purpose: "Schutzgehölz, Nahrung (Samen, Früchte)" },
  { slug: "picea-abies", commonName: "Fichte", scientificName: "Picea abies", purpose: "Schutz- und Nistgehölz" },
  { slug: "plant-4", commonName: "Pflanze vier", scientificName: "Planta IV", purpose: "Nahrung (Samen)" },
  { slug: "plant-5", commonName: "Pflanze fünf", scientificName: "Planta V", purpose: "Nahrung (Samen)" },
  { slug: "plant-6", commonName: "Pflanze sechs", scientificName: "Planta VI", purpose: "Nahrung (Samen)" },
  { slug: "plant-7", commonName: "Pflanze sieben", scientificName: "Planta VII", purpose: "Nahrung (Samen)" }
];

const habitats: RelatedHabitat[] = [
  {
    slug: "wild-hecken",
    name: "(Wild-)Hecken",
    purpose: "Brutplatz",
    purposeElement: "Dichte Zweige",
    lifecycleStage: "adult"
  },
  {
    slug: "altgrasstreifen",
    name: "Altgrasstreifen",
    purpose: "Nahrung",
    purposeElement: "Samen",
    lifecycleStage: "adult, juvenil"
  },
  {
    slug: "dichte-straeucher",
    name: "Dichte Sträucher",
    purpose: "Schlafplatz",
    purposeElement: "Deckung",
    lifecycleStage: "adult, juvenil"
  }
];

describe("SpeciesPlanningBrowser", () => {
  it("maps raw relationship purposes into stable planning-function families", () => {
    expect(planningFunctionIds("Schutz- und Nistgehölz, Nahrung (Samen)")).toEqual([
      "food",
      "shelter",
      "nesting"
    ]);
    expect(planningFunctionIds("Schlafplatz")).toEqual(["sleeping"]);
    expect(planningFunctionIds("Sonderfunktion")).toEqual(["other"]);
  });

  it("filters relationships by entity, lifecycle stage, and searchable content", () => {
    const items = buildPlanningItems(plants, habitats);

    expect(filterPlanningItems(items, "", "plant", "all")).toHaveLength(7);
    expect(filterPlanningItems(items, "", "all", "juvenil").map((item) => item.name)).toEqual([
      "Altgrasstreifen",
      "Dichte Sträucher"
    ]);
    expect(filterPlanningItems(items, "Zweige", "all", "all").map((item) => item.name)).toEqual([
      "(Wild-)Hecken"
    ]);
  });

  it("groups multi-function relationships into each relevant editorial chapter", () => {
    const groups = groupPlanningItems(buildPlanningItems(plants, habitats));
    const fichteGroups = groups
      .filter((group) => group.items.some((item) => item.name === "Fichte"))
      .map((group) => group.id);

    expect(fichteGroups).toEqual(["shelter", "nesting"]);
    expect(groups.map((group) => group.name)).toEqual([
      "Nahrung",
      "Schutz und Rückzug",
      "Brut und Nisten",
      "Schlafplatz"
    ]);
  });

  it("server-renders filters, chapters, all relationship content, and progressive reveal", () => {
    const html = renderToStaticMarkup(<SpeciesPlanningBrowser plants={plants} habitats={habitats} />);

    expect(html).toContain('aria-label="Entitätstyp filtern"');
    expect(html).toContain('aria-label="Lebensphase filtern"');
    expect(html).toContain("Nahrung");
    expect(html).toContain("Brut und Nisten");
    expect(html).toContain("Pflanze sieben");
    expect(html).toContain("Weitere 1 anzeigen");
    expect(html).toContain("Dichte Zweige");
    expect(html).not.toContain("overflow");
  });

  it("renders a useful sparse-data state", () => {
    const html = renderToStaticMarkup(<SpeciesPlanningBrowser plants={[]} habitats={[]} />);

    expect(html).toContain("keine Planungsbausteine veröffentlicht");
    expect(html).not.toContain("planning-browser-toolbar");
  });
});
