import type { Metadata } from "next";
import { KeyRound, LockKeyhole, Server, UserRound } from "lucide-react";

export const metadata: Metadata = { title: "Einstellungen" };

export default function ManagementSettingsPage() {
  return (
    <>
      <header><div><p className="eyebrow">System</p><h1>Einstellungen</h1><p className="management-lead">Vorbereitete Grenzen für Identität, Rollen und Betrieb.</p></div></header>
      <div className="settings-grid">
        <article className="management-panel"><UserRound /><p className="eyebrow">Konten</p><h2>Lokale Benutzerkonten</h2><p>Benutzername und Passwort bilden den ersten Login-Adapter. Konten werden erst mit der PostgreSQL-Grundlage aktiv.</p><button type="button" disabled>Konten verwalten</button></article>
        <article className="management-panel"><LockKeyhole /><p className="eyebrow">Rollen</p><h2>Admin, Redaktion, Publikation</h2><p>Serverseitige Berechtigungen trennen Bearbeitung, Veröffentlichung und Systemverwaltung.</p><button type="button" disabled>Rollen konfigurieren</button></article>
        <article className="management-panel"><KeyRound /><p className="eyebrow">Sitzungen</p><h2>Sichere Anmeldung</h2><p>Rotation, Ablauf, CSRF-Schutz und Audit-Ereignisse folgen in Ticket #77.</p><button type="button" disabled>Anmeldung aktivieren</button></article>
        <article className="management-panel"><Server /><p className="eyebrow">Betrieb</p><h2>EU-only Infrastruktur</h2><p>Hosting, Medien und Backups bleiben über Adapter und Container portabel.</p><button type="button" disabled>Betrieb prüfen</button></article>
      </div>
    </>
  );
}
