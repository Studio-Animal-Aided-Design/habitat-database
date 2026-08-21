import type { Metadata } from "next";
import { CatalogEntityCard } from "@/components/catalog-entity-card";
import { CatalogToolbar } from "@/components/catalog-toolbar";
import { EditorialActionLink, EditorialEmptyState, EditorialEyebrow } from "@/components/editorial-primitives";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { catalogApi } from "@/lib/catalog/catalog-api";

export const metadata: Metadata = {
  title: "Pflanzen entdecken",
  description: "Heimische Pflanzen und ihre ökologische Bedeutung für die Animal-Aided Design Planung."
};

type PageProps = { searchParams: Promise<{ q?: string; type?: string }> };

export default async function PlantsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const plants = (await catalogApi.listPlants(query)).filter((item) => item.status === "published");

  return (
    <main>
      <div className="page-shell">
        <SiteHeader />
        <section className="catalog-intro catalog-intro-plant">
          <EditorialEyebrow>Pflanzenbibliothek</EditorialEyebrow>
          <h1>Pflanzen wählen.<br /><em>Wirkung entfalten.</em></h1>
          <p>{plants.length} Pflanzen entsprechen der aktuellen Auswahl.</p>
          <CatalogToolbar
            action="/plants"
            query={query.q}
            type={query.type}
            types={["Gehölz", "Staude"]}
            searchLabel="Nach deutschem oder wissenschaftlichem Namen suchen"
          />
        </section>
        {plants.length ? (
          <section className="entity-grid catalog-grid" aria-label="Pflanzen">
            {plants.map((plant) => <CatalogEntityCard key={plant.slug} kind="plant" item={plant} />)}
          </section>
        ) : (
          <EditorialEmptyState
            title="Keine Pflanze entspricht dieser Auswahl."
            action={<EditorialActionLink href="/plants">Filter zurücksetzen</EditorialActionLink>}
          >
            Versuchen Sie einen anderen Suchbegriff oder setzen Sie die Filter zurück.
          </EditorialEmptyState>
        )}
        <PublicFooter />
      </div>
    </main>
  );
}
