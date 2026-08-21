import type { Metadata } from "next";
import Link from "next/link";
import { CatalogToolbar } from "@/components/catalog-toolbar";
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
  const species = (await catalogApi.listSpecies(query)).filter((item) => item.status === "published");

  return (
    <main>
      <div className="page-shell">
        <SiteHeader />
        <section className="catalog-intro">
          <p className="eyebrow">Artenbibliothek</p>
          <h1>Arten entdecken.<br /><em>Bedürfnisse verstehen.</em></h1>
          <p>{species.length} Artenportraits entsprechen der aktuellen Auswahl.</p>
          <CatalogToolbar
            action="/species"
            query={query.q}
            type={query.type}
            types={["Vögel", "Insekten", "Reptilien", "Säugetiere"]}
            searchLabel="Nach Name, Klasse oder Familie suchen"
          />
        </section>
        {species.length ? (
          <section className="species-grid catalog-grid" aria-label="Artenportraits">
            {species.map((item, index) => <SpeciesCard key={item.slug} species={item} priority={index === 0} />)}
          </section>
        ) : (
          <section className="empty-state">
            <p className="eyebrow">Keine Treffer</p>
            <h2>Keine Art entspricht dieser Auswahl.</h2>
            <Link className="outline-link" href="/species">Filter zurücksetzen</Link>
          </section>
        )}
        <PublicFooter />
      </div>
    </main>
  );
}
