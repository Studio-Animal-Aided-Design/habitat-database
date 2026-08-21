import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Studio Animal-Aided Design – Startseite">
        <BrandMark />
      </Link>
      <nav aria-label="Hauptnavigation">
        <Link href="/species">Arten</Link>
        <Link href="/plants">Pflanzen</Link>
        <Link href="/habitat-elements">Habitatelemente</Link>
      </nav>
      <details className="mobile-menu">
        <summary>Menü</summary>
        <div>
          <Link href="/species">Arten</Link>
          <Link href="/plants">Pflanzen</Link>
          <Link href="/habitat-elements">Habitatelemente</Link>
        </div>
      </details>
      <Link className="header-cta" href="/management">
        Verwaltung <ArrowUpRight size={15} />
      </Link>
    </header>
  );
}
