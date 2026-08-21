import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";
import type { ContentStatus } from "@/lib/catalog/types";

export type ManagementRow = {
  slug: string;
  name: string;
  secondary: string;
  type: string;
  status: ContentStatus;
};

const statusLabel: Record<ContentStatus, string> = {
  published: "Veröffentlicht",
  draft: "Entwurf",
  archived: "Archiviert"
};

export function ManagementEntityList({
  title,
  eyebrow,
  description,
  basePath,
  rows
}: {
  title: string;
  eyebrow: string;
  description: string;
  basePath: string;
  rows: ManagementRow[];
}) {
  return (
    <>
      <header>
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="management-lead">{description}</p></div>
        <Link className="management-button primary-management-button" href={`${basePath}/new`}>
          <FilePlus2 size={17} /> Neuer Eintrag
        </Link>
      </header>
      <section className="management-panel">
        <div className="management-filter">
          <Search size={17} />
          <input aria-label={`${title} durchsuchen`} placeholder="In Mock-Daten suchen" />
          <button type="button">Alle Status</button>
        </div>
        <div className="content-table management-list" role="table" aria-label={title}>
          <div role="row" className="table-head"><span>Name</span><span>Typ</span><span>Status</span><span>Aktion</span></div>
          {rows.map((row) => (
            <div role="row" key={row.slug}>
              <span><strong>{row.name}</strong><small>{row.secondary}</small></span>
              <span>{row.type}</span>
              <span><i className={`status-${row.status}`}>{statusLabel[row.status]}</i></span>
              <span><Link className="table-action" href={`${basePath}/${row.slug}`}>Bearbeiten</Link></span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
