import Link from "next/link";
import { ArrowLeft, Eye, Save } from "lucide-react";

export function ManagementEditor({
  entityLabel,
  title,
  subtitle,
  backHref,
  publicHref,
  fields
}: {
  entityLabel: string;
  title: string;
  subtitle?: string;
  backHref: string;
  publicHref?: string;
  fields: Array<{ label: string; value?: string; multiline?: boolean }>;
}) {
  const isNew = title.startsWith("Neue");

  return (
    <>
      <header className="editor-header">
        <div>
          <Link className="management-back" href={backHref}><ArrowLeft size={16} /> Zurück zur Übersicht</Link>
          <p className="eyebrow">{entityLabel}</p>
          <h1>{title}</h1>
          {subtitle && <p className="management-lead">{subtitle}</p>}
        </div>
        <div className="editor-actions">
          {publicHref && <Link className="management-button" href={publicHref}><Eye size={16} /> Vorschau</Link>}
          <button className="management-button primary-management-button" type="button"><Save size={16} /> {isNew ? "Entwurf anlegen" : "Änderungen speichern"}</button>
        </div>
      </header>
      <div className="management-notice editor-notice">
        <div><strong>Mock-Editor</strong><p>Die Formularstruktur ist vorbereitet; Speichern wird mit Datenbank und Authentifizierung aktiviert.</p></div>
        <span>Route-first · M1</span>
      </div>
      <form className="editor-grid">
        <section className="management-panel editor-form">
          <div className="panel-heading"><div><p className="eyebrow">Grunddaten</p><h2>Inhalt</h2></div></div>
          {fields.map((field) => (
            <label key={field.label}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea rows={6} defaultValue={field.value} />
              ) : (
                <input defaultValue={field.value} />
              )}
            </label>
          ))}
        </section>
        <aside className="management-panel editor-meta">
          <p className="eyebrow">Publikation</p>
          <h2>Status und Qualität</h2>
          <label><span>Status</span><select defaultValue={isNew ? "draft" : "published"}><option value="draft">Entwurf</option><option value="published">Veröffentlicht</option><option value="archived">Archiviert</option></select></label>
          <label><span>Redaktioneller Hinweis</span><textarea rows={5} placeholder="Interne Anmerkung" /></label>
          <p>Quellen, Beziehungen, Medien und Audit-Verlauf werden in den nächsten Management-Slices ergänzt.</p>
        </aside>
      </form>
    </>
  );
}
