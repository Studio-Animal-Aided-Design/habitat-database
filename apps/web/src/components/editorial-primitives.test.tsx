import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EditorialActionLink,
  EditorialEmptyState,
  EditorialFactList,
  EditorialSectionHeading,
  EditorialSourceNote
} from "./editorial-primitives";

describe("editorial primitives", () => {
  it("connects a section heading to its title and action", () => {
    const html = renderToStaticMarkup(
      <section aria-labelledby="species-title">
        <EditorialSectionHeading
          eyebrow="Arten im Fokus"
          title="Lebensräume verstehen"
          titleId="species-title"
          action={<EditorialActionLink href="/species">Alle Arten</EditorialActionLink>}
        />
      </section>
    );

    expect(html).toContain('aria-labelledby="species-title"');
    expect(html).toContain('<h2 id="species-title">Lebensräume verstehen</h2>');
    expect(html).toContain('href="/species"');
  });

  it("renders facts and sources with semantic description markup", () => {
    const html = renderToStaticMarkup(
      <>
        <EditorialFactList items={[{ label: "Klasse", value: "Vögel" }]} />
        <EditorialSourceNote sources="Beispielquelle" />
      </>
    );

    expect(html).toContain("<dl");
    expect(html).toContain("<dt>Klasse</dt>");
    expect(html).toContain('aria-label="Quellen"');
  });

  it("announces empty catalogue results without coupling them to one entity", () => {
    const html = renderToStaticMarkup(
      <EditorialEmptyState
        title="Keine Ergebnisse"
        action={<EditorialActionLink href="/species">Filter zurücksetzen</EditorialActionLink>}
      />
    );

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Keine Ergebnisse");
  });
});
