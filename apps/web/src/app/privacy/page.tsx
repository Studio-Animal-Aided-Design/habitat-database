import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Datenschutz" };

export default function PrivacyPage() {
  return (
    <main><div className="page-shell"><SiteHeader /><article className="legal-page">
      <p className="eyebrow">Rechtliches</p><h1>Datenschutz</h1>
      <p>Die endgültige Datenschutzerklärung wird an Hosting, Protokollierung, Authentifizierung und Medienbereitstellung angepasst.</p>
      <section><h2>Datensparsame Grundlage</h2><p>Die öffentlichen Mock-Seiten verwenden derzeit keine Konten, Analyse-Cookies oder Kontaktformulare.</p></section>
      <aside>Vor dem öffentlichen Betrieb ist eine rechtliche Prüfung erforderlich.</aside>
    </article><PublicFooter /></div></main>
  );
}
