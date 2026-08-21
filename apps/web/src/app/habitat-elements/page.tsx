import type { Metadata } from "next";
import { CatalogEntityCard } from "@/components/catalog-entity-card";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { EditorialActionLink, EditorialEmptyState, EditorialEyebrow } from "@/components/editorial-primitives";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = {
  title: "Habitatelemente entdecken",
  description: "Planungsbausteine, Maßnahmen und Pflegehinweise für tiergerechte Lebensräume."
};

type PageProps = { searchParams: Promise<{ q?: string; type?: string }> };

export default async function HabitatElementsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const habitats = (await catalogApi.listHabitats(query)).filter((item) => item.status === "published");

  return (
    <main>
      <div className="page-shell">
        <SiteHeader />
        <section className="catalog-intro catalog-intro-habitat">
          <EditorialEyebrow>Planungsbibliothek</EditorialEyebrow>
          <h1>Strukturen schaffen.<br /><em>Lebensräume verbinden.</em></h1>
          <p>{habitats.length} Habitatelemente entsprechen der aktuellen Auswahl.</p>
          <CatalogToolbar
            action="/habitat-elements"
            query={query.q}
            type={query.type}
            types={["Vegetation", "Ausstattungselement"]}
            searchLabel="Nach Element, Typ oder Standort suchen"
          />
        </section>
        {habitats.length ? (
          <section className="entity-grid catalog-grid" aria-label="Habitatelemente">
            {habitats.map((habitat, index) => (
              <CatalogEntityCard key={habitat.slug} kind="habitat" item={habitat} priority={index === 0} />
            ))}
          </section>
        ) : (
          <EditorialEmptyState
            title="Kein Habitatelement entspricht dieser Auswahl."
            action={<EditorialActionLink href="/habitat-elements">Filter zurücksetzen</EditorialActionLink>}
          >
            Versuchen Sie einen anderen Suchbegriff oder setzen Sie die Filter zurück.
          </EditorialEmptyState>
        )}
        <PublicFooter />
      </div>
    </main>
  );
}
