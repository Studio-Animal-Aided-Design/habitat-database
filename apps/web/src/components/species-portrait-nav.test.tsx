import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { selectActivePortraitSection, SpeciesPortraitNav } from "./species-portrait-nav";

const image = {
  url: "/landing/bird.webp",
  alt: "Gimpel im Schnee",
  attribution: "Beispielquelle",
  type: "portrait" as const
};

describe("SpeciesPortraitNav", () => {
  it("server-renders species context and all section links", () => {
    const html = renderToStaticMarkup(
      <SpeciesPortraitNav commonName="Gimpel" scientificName="Pyrrhula pyrrhula" image={image} />
    );

    expect(html).toContain('aria-label="Abschnitte des Artenportraits"');
    expect(html).toContain("Gimpel");
    expect(html).toContain("Pyrrhula pyrrhula");
    expect(html).toContain('href="#characteristics"');
    expect(html).toContain('href="#lifecycle"');
    expect(html).toContain('href="#planning"');
    expect(html).toContain('aria-current="location"');
    expect(html).toContain('alt=""');
  });

  it("selects the last section whose top crossed the viewport marker", () => {
    const positions = [
      { id: "characteristics", top: -500 },
      { id: "lifecycle", top: 120 },
      { id: "planning", top: 900 }
    ];

    expect(selectActivePortraitSection(positions, 240)).toBe("lifecycle");
    expect(selectActivePortraitSection(positions, 80)).toBe("characteristics");
  });
});
