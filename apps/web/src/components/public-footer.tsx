import Link from "next/link";
import { BrandMark } from "./brand-mark";

export function PublicFooter() {
  return (
    <footer>
      <Link className="footer-brand" href="/" aria-label="Studio Animal-Aided Design – Startseite">
        <BrandMark />
      </Link>
      <p>Artenwissen für lebenswerte Nachbarschaften.</p>
      <div>
        <Link href="/imprint">Impressum</Link>
        <Link href="/privacy">Datenschutz</Link>
      </div>
    </footer>
  );
}
