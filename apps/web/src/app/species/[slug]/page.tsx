import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PublicFooter } from "@/components/public-footer";
import { EditorialEyebrow, EditorialFactList } from "@/components/editorial-primitives";
import { SpeciesAttributeBrowser } from "@/components/species-attribute-browser";
import { SpeciesPlanningBrowser } from "@/components/species-planning-browser";
import { SpeciesPortraitNav } from "@/components/species-portrait-nav";
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
              <EditorialEyebrow>Artenportrait</EditorialEyebrow>
              <h1>{species.commonName}</h1>
              <p className="portrait-scientific">{species.scientificName}</p>
              {species.alternativeName && <p className="alternative">Auch bekannt als {species.alternativeName}</p>}
              <p className="portrait-teaser">{species.teaser}</p>
              <EditorialFactList
                className="taxonomy-list"
                items={[
                  { label: "Klasse", value: <>{species.taxonomy.classCommon} <i>{species.taxonomy.classScientific}</i></> },
                  { label: "Ordnung", value: <>{species.taxonomy.orderCommon} <i>{species.taxonomy.orderScientific}</i></> },
                  { label: "Familie", value: <>{species.taxonomy.familyCommon} <i>{species.taxonomy.familyScientific}</i></> }
                ]}
              />
            </div>
          </section>

          <SpeciesPortraitNav
            commonName={species.commonName}
            scientificName={species.scientificName}
            image={species.image}
          />

          <section className="portrait-section" id="characteristics">
            <div className="portrait-section-title">
              <p className="eyebrow">01 · Art verstehen</p>
              <h2>Kurzcharakteristik</h2>
            </div>
            <SpeciesAttributeBrowser attributes={species.attributes} />
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
            <SpeciesPlanningBrowser plants={species.plants} habitats={species.habitats} />
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
