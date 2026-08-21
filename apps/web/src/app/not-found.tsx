import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <main>
      <div className="page-shell">
        <SiteHeader />
        <section className="route-state">
          <p className="eyebrow">404 · Nicht gefunden</p>
          <h1>Dieser Lebensraum ist noch nicht kartiert.</h1>
          <p>Der Eintrag existiert nicht, ist noch ein Entwurf oder wurde unter einer anderen Adresse veröffentlicht.</p>
          <Link className="primary-link" href="/"><ArrowLeft size={17} /> Zur Startseite</Link>
        </section>
        <PublicFooter />
      </div>
    </main>
  );
}
