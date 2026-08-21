import type { Metadata } from "next";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { EditorialActionLink, EditorialEmptyState, EditorialEyebrow } from "@/components/editorial-primitives";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { SpeciesCard } from "@/components/species-card";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = {
  title: "Arten entdecken",
  description: "Artenportraits für eine tiergerechte Stadt- und Freiraumplanung."
};

type PageProps = { searchParams: Promise<{ q?: string; type?: string }> };

export default async function SpeciesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const [listedSpecies, catalogTypes] = await Promise.all([
    catalogApi.listSpecies(query),
    catalogApi.getCatalogTypes()
  ]);
  const species = listedSpecies.filter((item) => item.status === "published");

  return (
    <main>
      <div className="page-shell">
        <SiteHeader />
        <section className="catalog-intro">
          <EditorialEyebrow>Artenbibliothek</EditorialEyebrow>
          <h1>Arten entdecken.<br /><em>Bedürfnisse verstehen.</em></h1>
          <p>{species.length} Artenportraits entsprechen der aktuellen Auswahl.</p>
          <CatalogToolbar
            action="/species"
            query={query.q}
            type={query.type}
            types={catalogTypes.speciesTypes}
            searchLabel="Nach Name, Klasse oder Familie suchen"
          />
        </section>
        {species.length ? (
          <section className="species-grid catalog-grid" aria-label="Artenportraits">
            {species.map((item, index) => <SpeciesCard key={item.slug} species={item} priority={index === 0} headingLevel={2} />)}
          </section>
        ) : (
          <EditorialEmptyState
            title="Keine Art entspricht dieser Auswahl."
            action={<EditorialActionLink href="/species">Filter zurücksetzen</EditorialActionLink>}
          >
            Versuchen Sie einen anderen Suchbegriff oder setzen Sie die Filter zurück.
          </EditorialEmptyState>
        )}
        <PublicFooter />
      </div>
    </main>
  );
}
