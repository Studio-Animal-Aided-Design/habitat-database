import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bird, Leaf, MapPin, Quote, Sprout } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PublicFooter } from "@/components/public-footer";
import { catalogApi } from "@/lib/catalog/catalog-api";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const species = await catalogApi.listSpecies();
  return species.filter((item) => item.status === "published").map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const species = await catalogApi.getSpeciesBySlug(slug);
  if (!species || species.status !== "published") return {};
  return {
    title: species.commonName,
    description: species.teaser,
    openGraph: { images: [{ url: species.image.url, alt: species.image.alt }] }
  };
}

export default async function SpeciesDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const species = await catalogApi.getSpeciesBySlug(slug);
  if (!species || species.status !== "published") notFound();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: species.commonName,
            alternateName: species.alternativeName,
            description: species.teaser,
            image: species.image.url,
            about: { "@type": "Taxon", name: species.scientificName }
          })
        }}
      />
      <div className="page-shell">
        <SiteHeader />
        <div className="breadcrumb">
          <Link href="/species"><ArrowLeft size={16} /> Alle Arten</Link>
          <span>Artenportrait</span>
        </div>

        <article>
          <section className="portrait-hero">
            <div className="portrait-image">
              <Image src={species.image.url} alt={species.image.alt} fill priority sizes="(max-width: 820px) 92vw, 46vw" />
              <p>{species.image.attribution}</p>
            </div>
            <div className="portrait-heading">
              <div className="taxonomy-pills">
                <span>{species.taxonomy.classCommon}</span>
                <span>{species.taxonomy.orderCommon}</span>
                <span>{species.taxonomy.familyCommon}</span>
              </div>
              <p className="eyebrow">Artenportrait</p>
              <h1>{species.commonName}</h1>
              <p className="portrait-scientific">{species.scientificName}</p>
              {species.alternativeName && <p className="alternative">Auch bekannt als {species.alternativeName}</p>}
              <p className="portrait-teaser">{species.teaser}</p>
              <dl className="taxonomy-list">
                <div><dt>Klasse</dt><dd>{species.taxonomy.classCommon} <i>{species.taxonomy.classScientific}</i></dd></div>
                <div><dt>Ordnung</dt><dd>{species.taxonomy.orderCommon} <i>{species.taxonomy.orderScientific}</i></dd></div>
                <div><dt>Familie</dt><dd>{species.taxonomy.familyCommon} <i>{species.taxonomy.familyScientific}</i></dd></div>
              </dl>
            </div>
          </section>

          <nav className="portrait-nav" aria-label="Abschnitte des Artenportraits">
            <a href="#characteristics">Kurzcharakteristik</a>
            <a href="#lifecycle">Lebenszyklus</a>
            <a href="#planning">Planungsbausteine</a>
          </nav>

          <section className="portrait-section" id="characteristics">
            <div className="portrait-section-title">
              <p className="eyebrow">01 · Art verstehen</p>
              <h2>Kurzcharakteristik</h2>
            </div>
            <div className="attribute-list">
              {species.attributes.map((attribute) => (
                <div className="attribute-item" key={`${attribute.category}-${attribute.label}`}>
                  <p>{attribute.category}</p>
                  <h3>{attribute.label}</h3>
                  <blockquote><Quote size={18} />{attribute.value}</blockquote>
                  {attribute.sources && <small>{attribute.sources}</small>}
                </div>
              ))}
            </div>
          </section>

          <section className="lifecycle-section" id="lifecycle">
            <div>
              <p className="eyebrow">02 · Im Jahresverlauf</p>
              <h2>Lebenszyklus</h2>
              <p>
                Zeitliche Anforderungen zeigen, wann eine Maßnahme wirksam sein muss – und wann Pflege
                besonders sensibel geplant wird.
              </p>
            </div>
            <div className="lifecycle-image">
              <Image src={species.lifecycleImage.url} alt={species.lifecycleImage.alt} fill sizes="(max-width: 820px) 90vw, 44vw" />
            </div>
          </section>

          <section className="planning-section" id="planning">
            <div className="portrait-section-title">
              <p className="eyebrow">03 · In den Entwurf übersetzen</p>
              <h2>Planungsbausteine für den {species.commonName}</h2>
            </div>
            <div className="planning-columns">
              <div>
                <div className="planning-heading"><Leaf /><span><small>Verknüpfte</small>Pflanzen</span></div>
                {species.plants.length ? species.plants.map((plant) => (
                  <Link className="relation-row" href={`/plants/${plant.slug}`} key={`${plant.scientificName}-${plant.purpose}`}>
                    <Sprout size={18} />
                    <div><strong>{plant.commonName}</strong><i>{plant.scientificName}</i></div>
                    <span>{plant.purpose}</span>
                  </Link>
                )) : <p className="empty-note">Beziehungen folgen mit der Datenmigration.</p>}
              </div>
              <div>
                <div className="planning-heading"><MapPin /><span><small>Verknüpfte</small>Habitatelemente</span></div>
                {species.habitats.length ? species.habitats.map((habitat) => (
                  <Link className="relation-row" href={`/habitat-elements/${habitat.slug}`} key={`${habitat.slug}-${habitat.purpose}`}>
                    <Bird size={18} />
                    <div><strong>{habitat.name}</strong><i>{habitat.lifecycleStage}</i></div>
                    <span>{habitat.purpose}</span>
                  </Link>
                )) : <p className="empty-note">Beziehungen folgen mit der Datenmigration.</p>}
              </div>
            </div>
          </section>

          <section className="portrait-cta">
            <div>
              <p className="eyebrow">Weiter entdecken</p>
              <h2>Welche Arten teilen diesen Lebensraum?</h2>
            </div>
            <Link href="/species">Alle Arten ansehen <ArrowRight size={18} /></Link>
          </section>
        </article>
        <PublicFooter />
      </div>
    </main>
  );
}
