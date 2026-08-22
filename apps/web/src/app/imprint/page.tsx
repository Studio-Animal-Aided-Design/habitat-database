import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <main><div className="page-shell"><SiteHeader /><article className="legal-page">
      <p className="eyebrow">Rechtliches</p><h1>Impressum</h1>
      <p>Die verbindlichen Anbieterangaben werden vor Veröffentlichung aus dem bestehenden Webauftritt übernommen.</p>
      <section><h2>Studio Animal-Aided Design</h2><p>Platzhalter für Anschrift, Vertretungsberechtigte und Kontaktangaben.</p></section>
      <aside>Vor dem öffentlichen Betrieb werden die Anbieterangaben vollständig ergänzt und rechtlich geprüft.</aside>
    </article><PublicFooter /></div></main>
  );
}
