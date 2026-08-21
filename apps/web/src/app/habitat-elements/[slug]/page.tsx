import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bird, Hammer, MapPin, Ruler, Scissors, Workflow } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";
import { EditorialSectionHeading } from "@/components/editorial-primitives";
import { catalogApi } from "@/lib/catalog/catalog-api";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const habitats = await catalogApi.listHabitats();
  return habitats.filter((habitat) => habitat.status === "published").map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const habitat = await catalogApi.getHabitatBySlug((await params).slug);
  return habitat?.status === "published" ? {
    title: habitat.name,
    description: habitat.teaser,
    openGraph: habitat.image ? { images: [{ url: habitat.image.url, alt: habitat.image.alt }] } : undefined
  } : {};
}

export default async function HabitatDetailPage({ params }: PageProps) {
  const habitat = await catalogApi.getHabitatBySlug((await params).slug);
  if (!habitat || habitat.status !== "published") notFound();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: habitat.name,
            description: habitat.teaser,
            image: habitat.image?.url
          })
        }}
      />
      <div className="page-shell">
        <SiteHeader />
        <div className="breadcrumb">
          <Link href="/habitat-elements"><ArrowLeft size={16} /> Alle Habitatelemente</Link>
          <span>Planungsbaustein</span>
        </div>
        <article>
          <section className="entity-detail-hero habitat-detail-hero">
            <div className="habitat-detail-image">
              {habitat.image && <Image src={habitat.image.url} alt={habitat.image.alt} fill priority sizes="(max-width: 900px) 92vw, 48vw" />}
              {habitat.image && <p>{habitat.image.attribution}</p>}
            </div>
            <div className="entity-detail-heading">
              <div className="taxonomy-pills"><span>{habitat.type}</span></div>
              <p className="eyebrow">Habitatelement</p>
              <h1>{habitat.name}</h1>
              <p className="portrait-teaser">{habitat.teaser}</p>
              <div className="quick-facts">
                {habitat.size && <span><Ruler /><small>Größe</small><strong>{habitat.size}</strong></span>}
                {habitat.location && <span><MapPin /><small>Standort</small><strong>{habitat.location}</strong></span>}
              </div>
            </div>
          </section>

          <section className="measure-grid">
            <article><Hammer /><p className="eyebrow">Maßnahme</p><h2>Anlegen und entwickeln</h2><p>{habitat.measureDescription}</p></article>
            <article><Scissors /><p className="eyebrow">Pflege</p><h2>Qualität langfristig sichern</h2><p>{habitat.maintenance}</p></article>
          </section>

          <section className="related-section">
            <EditorialSectionHeading eyebrow="Beziehungen" title="Als Teil eines vernetzten Lebensraums" />
            <div className="habitat-relations">
              <div>
                <p className="eyebrow"><Workflow /> In Kombination mit</p>
                {habitat.combinedWith.length ? habitat.combinedWith.map((related) => (
                  <Link href={`/habitat-elements/${related.slug}`} key={related.slug}>{related.name}<ArrowRight /></Link>
                )) : <p className="empty-note">Keine Kombinationen im Mock erfasst.</p>}
              </div>
              <div>
                <p className="eyebrow"><Bird /> Zielarten</p>
                {habitat.relatedSpecies.length ? habitat.relatedSpecies.map((species) => (
                  <Link href={`/species/${species.slug}`} key={species.slug}>
                    <span><strong>{species.commonName}</strong><i>{species.scientificName}</i></span>
                    <small>{species.purpose} · {species.lifecycleStage}</small>
                  </Link>
                )) : <p className="empty-note">Zielart-Beziehungen folgen mit der Datenmigration.</p>}
              </div>
            </div>
          </section>
        </article>
        <PublicFooter />
      </div>
    </main>
  );
}
