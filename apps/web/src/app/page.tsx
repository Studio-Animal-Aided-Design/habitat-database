import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Bird, Building2, Leaf, Search, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SpeciesCard } from "@/components/species-card";
import { CatalogEntityCard } from "@/components/catalog-entity-card";
import { PublicFooter } from "@/components/public-footer";
import { EditorialActionLink, EditorialSectionHeading } from "@/components/editorial-primitives";
import { catalogApi } from "@/lib/catalog/catalog-api";

export default async function Home() {
  const overview = await catalogApi.getOverview();

  return (
    <main>
      <div className="page-shell">
        <SiteHeader />

        <section className="hero">
          <div className="hero-copy">
            <p className="kicker"><Sparkles size={15} /> Wissen, das Lebensräume schafft</p>
            <h1>
              Planen für <em>Artenvielfalt.</em>
            </h1>
            <p className="hero-intro">
              Entdecken Sie, was Tiere in jeder Lebensphase brauchen – und übersetzen Sie ökologische
              Anforderungen in konkrete Pflanzen, Strukturen und Maßnahmen.
            </p>
            <form className="search-box" action="/species">
              <Search aria-hidden="true" size={19} />
              <label className="sr-only" htmlFor="catalog-search">Arten durchsuchen</label>
              <input id="catalog-search" name="q" placeholder="Art oder wissenschaftlichen Namen suchen" />
              <button type="submit">Suchen</button>
            </form>
            <div className="hero-stats" aria-label="Umfang der Datenbank">
              <span><strong>{overview.speciesCount}</strong> Artenportraits</span>
              <span><strong>{overview.plantCount}</strong> Pflanzen</span>
              <span><strong>{overview.habitatCount}</strong> Habitatelemente</span>
            </div>
          </div>
          <div className="hero-art">
            <Image
              className="hero-core"
              src="/landing/hero-circle.webp"
              width={1186}
              height={1185}
              alt=""
              loading="eager"
              unoptimized
            />
            <Image
              className="hero-orbit"
              src="/landing/decorative-circle.webp"
              width={807}
              height={767}
              alt=""
              loading="eager"
              unoptimized
            />
            <div className="hero-media hero-media-bird">
              <Image src="/landing/bird.webp" width={880} height={865} alt="Illustrierter Gimpel auf einem Zweig" loading="eager" unoptimized />
            </div>
            <div className="hero-media hero-media-leaf">
              <Image src="/landing/leaf.webp" width={1043} height={1102} alt="Illustriertes Eichenblatt" loading="eager" unoptimized />
            </div>
            <div className="hero-media hero-media-habitat">
              <Image
                src="/landing/habitat.webp"
                width={1085}
                height={1211}
                alt="Illustrierte Trockenmauer mit integriertem Insektenquartier"
                loading="eager"
                unoptimized
              />
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="featured-title">
          <EditorialSectionHeading
            eyebrow="Arten im Fokus"
            title="Lebensräume aus Sicht der Tiere verstehen"
            titleId="featured-title"
            action={<EditorialActionLink href="/species">Alle Arten</EditorialActionLink>}
          />
          <div className="species-grid">
            {overview.featuredSpecies.map((species, index) => (
              <SpeciesCard key={species.slug} species={species} priority={index === 0} />
            ))}
          </div>
        </section>

        <section className="catalog-preview-section" aria-labelledby="catalog-preview-title">
          <EditorialSectionHeading
            eyebrow="Planungswissen entdecken"
            title="Pflanzen und Strukturen, die Arten unterstützen."
            titleId="catalog-preview-title"
            lede="Von der ökologischen Funktion zur umsetzbaren Auswahl: Entdecken Sie veröffentlichte Pflanzen und Habitatelemente aus der Datenbank."
          />
          <div className="catalog-preview-columns">
            <section className="catalog-preview-group" aria-labelledby="featured-plants-title">
              <header>
                <div><Leaf aria-hidden="true" /><h3 id="featured-plants-title">Pflanzen</h3></div>
                <EditorialActionLink href="/plants" variant="text">Alle Pflanzen</EditorialActionLink>
              </header>
              <div className="catalog-preview-cards">
                {overview.featuredPlants.slice(0, 2).map((plant) => (
                  <CatalogEntityCard key={plant.slug} kind="plant" item={plant} headingLevel={4} />
                ))}
              </div>
            </section>
            <section className="catalog-preview-group" aria-labelledby="featured-habitats-title">
              <header>
                <div><Building2 aria-hidden="true" /><h3 id="featured-habitats-title">Habitatelemente</h3></div>
                <EditorialActionLink href="/habitat-elements" variant="text">Alle Habitatelemente</EditorialActionLink>
              </header>
              <div className="catalog-preview-cards">
                {overview.featuredHabitats.slice(0, 2).map((habitat, index) => (
                  <CatalogEntityCard key={habitat.slug} kind="habitat" item={habitat} priority={index === 0} headingLevel={4} />
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="relationship-section" id="relationships" aria-labelledby="relation-title">
          <div className="relationship-copy">
            <p className="eyebrow">Vom Artenwissen zum Entwurf</p>
            <h2 id="relation-title">Ökologische Anforderungen werden planbar.</h2>
            <p>
              Für jede Zielart zeigt die Datenbank, was sie in einer Lebensphase braucht – und
              welche Pflanzen und Habitatelemente diese Funktion im Entwurf übernehmen.
            </p>
            <p className="relationship-formula" aria-label="Von der Art über Lebensphase und Funktion zum Entwurfsbaustein">
              Art <span>→</span> Lebensphase <span>→</span> Funktion <span>→</span> Entwurfsbaustein
            </p>
            <Link className="primary-link" href="/species/gimpel">
              Gimpel-Beispiel erkunden <ArrowRight size={17} />
            </Link>
          </div>
          <div className="relationship-map" aria-label="Planungskette am Beispiel des Gimpels">
            <div className="relationship-map-heading">
              <span>Beispiel: Gimpel</span>
              <small>Eine Beziehung, konkret gelesen</small>
            </div>

            <div className="relationship-flow">
              <Link className="flow-card flow-species" href="/species/gimpel">
                <span className="flow-step">01 · Zielart</span>
                <span className="flow-card-title"><Bird aria-hidden="true" /> Gimpel</span>
                <small>Pyrrhula pyrrhula</small>
              </Link>

              <span className="flow-arrow" aria-hidden="true"><ArrowRight /></span>

              <div className="flow-card flow-need">
                <span className="flow-step">02 · Lebensphase</span>
                <strong>Brut &amp; Aufzucht</strong>
                <small>Geschützter Nistplatz und Nahrung in direkter Nähe</small>
              </div>

              <span className="flow-arrow" aria-hidden="true"><ArrowRight /></span>

              <div className="flow-result">
                <span className="flow-step">03 · Entwurfsbausteine</span>
                <Link href="/habitat-elements/wild-hecken">
                  <Building2 aria-hidden="true" />
                  <span><small>Brutplatz</small><strong>Wildhecke</strong></span>
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/plants/acer-campestre">
                  <Leaf aria-hidden="true" />
                  <span><small>Nahrung &amp; Schutz</small><strong>Feld-Ahorn</strong></span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>

            <p className="relationship-map-note">
              Beziehungen werden nach Lebensphase und Funktion sichtbar – damit aus Artenwissen
              konkrete Entscheidungen für den Entwurf entstehen.
            </p>
          </div>
        </section>

        <section className="project-context" id="about-database" aria-labelledby="project-context-title">
          <div className="project-context-copy">
            <p className="eyebrow">Über diese Datenbank</p>
            <h2 id="project-context-title">Artenwissen wird zum Werkzeug für Planung.</h2>
            <p>
              Die Datenbank bündelt Artenportraits mit zugehörigen Pflanzen und Habitatelementen für
              Neubau-, Sanierungs- und Umgestaltungsprojekte. Sie zeigt, was ausgewählte Tierarten
              während ihres gesamten Lebenszyklus benötigen – und wie sich diese Anforderungen in
              konkrete Entwurfs- und Pflegemaßnahmen übersetzen lassen.
            </p>
            <p>
              Die ersten 14 Zielarten wurden für München-Neuperlach im Rahmen des EU-geförderten
              Projekts „Creating NEBourhoods Together“ ausgewählt. Das Angebot richtet sich an
              Planende, Bildungseinrichtungen und zivilgesellschaftliche Initiativen.
            </p>
          </div>

          <aside className="project-links" aria-label="Weiterführende Informationen">
            <p className="eyebrow">Weiterführende Informationen</p>
            <a
              href="https://animal-aided-design.de/portfolio-items/creating-nebourhoods-together/"
              target="_blank"
              rel="noreferrer"
            >
              <span><small>EU-Leuchtturmprojekt</small>Creating NEBourhoods Together</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
            <a
              href="https://animal-aided-design.de/methode/"
              target="_blank"
              rel="noreferrer"
            >
              <span><small>Planungsmethode</small>Was ist Animal-Aided Design?</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          </aside>

          <div className="project-partners">
            <p>Entstanden im Rahmen von Creating NEBourhoods Together und finanziert von der Europäischen Union.</p>
            <div className="partner-logos" aria-label="Projekt- und Förderpartner">
              <a
                href="https://animal-aided-design.de/portfolio-items/creating-nebourhoods-together/"
                target="_blank"
                rel="noreferrer"
                aria-label="Mehr über Creating NEBourhoods Together"
              >
                <Image src="/neb.webp" width={820} height={230} alt="Creating NEBourhoods Together" unoptimized />
              </a>
              <Image
                src="/eu-financed.png"
                width={640}
                height={139}
                alt="Finanziert von der Europäischen Union"
                unoptimized
              />
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}
