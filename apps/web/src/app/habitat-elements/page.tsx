import type { Metadata } from "next";
import Link from "next/link";
import { CatalogEntityCard } from "@/components/catalog-entity-card";
import { CatalogToolbar } from "@/components/catalog-toolbar";
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
          <p className="eyebrow">Planungsbibliothek</p>
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
          <section className="empty-state">
            <p className="eyebrow">Keine Treffer</p>
            <h2>Kein Habitatelement entspricht dieser Auswahl.</h2>
            <Link className="outline-link" href="/habitat-elements">Filter zurücksetzen</Link>
          </section>
        )}
        <PublicFooter />
      </div>
    </main>
  );
}
