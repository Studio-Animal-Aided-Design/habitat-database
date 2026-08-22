import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Leaf, MapPin, Sprout } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { EditorialActionLink, EditorialSectionHeading, EditorialSourceNote } from "@/components/editorial-primitives";
import { catalogApi } from "@/lib/catalog/catalog-api";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const plants = await catalogApi.listPlants();
  return plants.filter((plant) => plant.status === "published").map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const plant = await catalogApi.getPlantBySlug((await params).slug);
  return plant?.status === "published" ? { title: plant.commonName, description: plant.teaser } : {};
}

export default async function PlantDetailPage({ params }: PageProps) {
  const plant = await catalogApi.getPlantBySlug((await params).slug);
  if (!plant || plant.status !== "published") notFound();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: plant.commonName,
            alternateName: plant.alternativeName,
            description: plant.teaser,
            about: { "@type": "Taxon", name: plant.scientificName }
          })
        }}
      />
      <div className="page-shell">
        <SiteHeader />
        <div className="breadcrumb">
          <Link href="/plants"><ArrowLeft size={16} /> Alle Pflanzen</Link>
          <span>Pflanzenportrait</span>
        </div>
        <article>
          <section className="entity-detail-hero plant-detail-hero">
            <div className="plant-hero-art" aria-hidden="true">
              <Leaf />
              <span className="plant-ring ring-one" />
              <span className="plant-ring ring-two" />
              <small>{plant.floweringPeriod ?? "Ganzjährig wirksam"}</small>
            </div>
            <div className="entity-detail-heading">
              <div className="taxonomy-pills"><span>{plant.type}</span>{plant.native && <span>heimisch</span>}</div>
              <p className="eyebrow">Pflanzenportrait</p>
              <h1>{plant.commonName}</h1>
              <p className="portrait-scientific">{plant.scientificName}</p>
              {plant.alternativeName && <p className="alternative">Auch bekannt als {plant.alternativeName}</p>}
              <p className="portrait-teaser">{plant.teaser}</p>
              <div className="quick-facts">
                <span><CalendarDays /> <small>Blütezeit</small><strong>{plant.floweringPeriod ?? "nicht erfasst"}</strong></span>
                <span><Sprout /> <small>Pflanzentyp</small><strong>{plant.type}</strong></span>
              </div>
            </div>
          </section>

          <section className="entity-story">
            <div><p className="eyebrow">01 · Ökologische Wirkung</p><h2>Mehr als Gestaltung.</h2></div>
            <div className="story-copy">
              <h3>Bedeutung für die heimische Fauna</h3>
              <p>{plant.ecologicalValue}</p>
              <h3>Hinweise für die Planung</h3>
              <p>{plant.planningNotes}</p>
            </div>
          </section>

          <section className="site-condition-band">
            <div><p className="eyebrow">02 · Standort</p><h2>Wo die Pflanze wirksam wird</h2></div>
            <div className="condition-list">
              {plant.siteConditions.map((condition) => <span key={condition}><MapPin />{condition}</span>)}
            </div>
          </section>

          <section className="related-section">
            <EditorialSectionHeading
              eyebrow="03 · Beziehungen"
              title="Arten, die von dieser Pflanze profitieren"
              action={<EditorialActionLink href="/species">Alle Arten</EditorialActionLink>}
            />
            {plant.relatedSpecies.length ? (
              <div className="related-link-grid">
                {plant.relatedSpecies.map((species) => (
                  <Link href={`/species/${species.slug}`} key={species.slug}>
                    <Leaf />
                    <span><small>{species.purpose}</small><strong>{species.commonName}</strong><i>{species.scientificName}</i></span>
                    <ArrowRight />
                  </Link>
                ))}
              </div>
            ) : <p className="empty-note">Für diese Pflanze sind derzeit keine Zielart-Beziehungen hinterlegt.</p>}
          </section>
          <EditorialSourceNote sources={plant.sources.join(" · ")} />
        </article>
        <PublicFooter />
      </div>
    </main>
  );
}
