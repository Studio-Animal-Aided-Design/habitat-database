import Link from "next/link";
import { Bird, CircleCheck, Clock3, Database, FilePenLine, Leaf, LogIn } from "lucide-react";
import { catalogApi } from "@/lib/catalog/catalog-api";

export default async function ManagementPage() {
  const overview = await catalogApi.getOverview();

  return (
    <>
        <header>
          <div><p className="eyebrow">Redaktionsbereich</p><h1>Guten Morgen.</h1></div>
          <Link className="management-button" href="/management/settings"><LogIn size={17} /> Lokale Anmeldung folgt</Link>
        </header>
        <div className="management-notice">
          <CircleCheck />
          <div><strong>Frontend-Grundlage aktiv</strong><p>Diese Ansicht verwendet noch die typisierte Mock-API.</p></div>
          <span>Foundation · M1</span>
        </div>
        <div className="metric-grid">
          <article><Bird /><small>Arten</small><strong>{overview.speciesCount}</strong><span>3 im Mock verfügbar</span></article>
          <article><Leaf /><small>Pflanzen</small><strong>{overview.plantCount}</strong><span>CSV-Bestand erkannt</span></article>
          <article><Database /><small>Habitatelemente</small><strong>{overview.habitatCount}</strong><span>CSV-Bestand erkannt</span></article>
          <article><Clock3 /><small>Offene Entwürfe</small><strong>0</strong><span>Publikationsmodell vorbereitet</span></article>
        </div>
        <div className="management-panel">
          <div className="panel-heading"><div><p className="eyebrow">Inhalt</p><h2>Zuletzt bearbeitet</h2></div><button><FilePenLine size={16} /> Neuer Entwurf</button></div>
          <div className="content-table" role="table" aria-label="Zuletzt bearbeitete Inhalte">
            <div role="row" className="table-head"><span>Name</span><span>Typ</span><span>Status</span><span>Aktualisiert</span></div>
            {overview.featuredSpecies.map((species) => (
              <div role="row" key={species.slug}>
                <span><strong>{species.commonName}</strong><small>{species.scientificName}</small></span>
                <span>Artenportrait</span><span><i>Veröffentlicht</i></span><span>Mock-Daten</span>
              </div>
            ))}
          </div>
        </div>
    </>
  );
}
