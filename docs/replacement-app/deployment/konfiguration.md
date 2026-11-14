# Konfiguration und offene Entscheidungen

Dieses Kapitel trennt externe Voraussetzungen von Konfigurationsarbeit und fehlender Produktimplementierung. Stand 22. September 2026 sind in #117 noch keine konkreten IONOS-Werte als bestätigt dokumentiert. Die Übersicht ist eine Arbeitsliste für die reale Inbetriebnahme, keine Liste von Programmierfehlern. Echte Zugangsdaten dürfen nur in einem geeigneten Secret-Speicher und in den geschützten Serverdateien stehen, niemals hier.

## Was vor der IONOS Bereitstellung fehlt

| Punkt | Kategorie | Für #105 nötig | Für #117 nötig | Nachweis oder Handlung |
| --- | --- | --- | --- | --- |
| Tarif, Servertyp, Ressourcen und Kosten | Kundenentscheidung und Beschaffung | Nein | Ja | Angebot, IPv4-Bedarf, Kündigung, Supportweg und Freigabe in #117 dokumentieren |
| Deutscher Rechenzentrumsstandort | Vertragliche und technische Bestätigung | Nein | Ja | IONOS-Standort für den konkreten Server bestätigen |
| Vertrag, Erweiterung, Inhaber und Abrechnung | Kundenentscheidung und Beschaffung | Nein | Ja | Zuständigkeit und Konditionen schriftlich festhalten |
| AVV/DPA und TOM | Rechtliche und organisatorische Prüfung | Nein | Ja | Gültige Unterlagen prüfen und Akzeptanz dokumentieren |
| Preview- und Produktionsdomain | Namens- und Release-Konfiguration | Nein | Ja | Beide FQDN und Freigabezeitpunkt benennen |
| DNS-Zugriff und Records | Berechtigung und Konfiguration | Nein | Ja | Verantwortliche Person, A/AAAA-Werte und Änderung dokumentieren |
| Server-, SSH- und Konsolenzugang | Berechtigung und Betrieb | Nein | Ja | Benannte Betreiber, Schlüssel und Notfallweg bereitstellen |
| ACME-Kontakt, DB-Secrets, Preview-Passwort | Laufzeitkonfiguration | Nein | Ja | Getrennt erzeugen und geschützt ablegen |
| Gesicherte Import-API und Converter-Anbindung | Produktimplementierung #107 und Laufzeitkonfiguration | Staging-Volume und Vorlagen | Ja | Code aus PR #121 deployen, Token erzeugen, Hash eintragen und End-to-End-Test dokumentieren |
| Fachliche Daten- und Ansichtsprüfung | Prüfung #114 | Nein | M1 insgesamt | Berichte und Stichproben abnehmen |
| Öffentliche Produktionsfreigabe | Entscheidung #115 | Nein | Ja | DNS und Zugriff erst nach Abnahme freigeben |

Die ersten acht Zeilen blockieren einen realen Serverstart oder eine verantwortbare Live-Schaltung, nicht den Abschluss der Code-Vorlage in #105. Der Import per Operator-Kommando bleibt für Erstinbetriebnahme und Wiederherstellung vorhanden. Der gesicherte Produktworkflow wird durch #107 beziehungsweise PR #121 geliefert und benötigt bei der Bereitstellung zusätzlich die unten beschriebene Laufzeitkonfiguration. Wiederkehrende Backups gehören zu #79 in M4 und sind nicht stillschweigend Teil dieser M1-Konfiguration.

## Umgebungsdateien auf dem Server

Im Verzeichnis `deploy/ionos` die fünf Vorlagen kopieren und nur lokal auf dem Server befüllen:

```bash
cp .env.example .env
cp .env.preview-app.example .env.preview-app
cp .env.preview-db.example .env.preview-db
cp .env.production-app.example .env.production-app
cp .env.production-db.example .env.production-db
chmod 600 .env .env.*-app .env.*-db
```

Die Dateien sind in Git ignoriert. Besitzer und Leserechte nach dem Kopieren prüfen. Platzhalterwerte wie `CHANGE_ME` dürfen in keiner gestarteten Umgebung verbleiben. Keine Secrets in Shell-History, Issue-Text, PR, Screenshot, Container-Image oder clientseitiges Bundle schreiben.

## Gemeinsame Angaben und Domains

In `.env` stehen `ACME_EMAIL`, `PREVIEW_DOMAIN`, `PRODUCTION_DOMAIN` sowie optional `AAD_APP_IMAGE` und `AAD_APP_TAG`. Die Domains sind vollständige Hostnamen ohne `https://`. Der ACME-Kontakt muss eine betreute Adresse sein. Für den produktiven Betrieb einen geprüften Commit oder unveränderlichen Image-Tag verwenden; `local` ist der Build-Standard der Vorlage.

DNS für die Preview erst nach Freigabe des Hostnamens auf die IONOS-IP setzen. Bestehende Records und TTL vor Änderung erfassen. Caddy benötigt erreichbare Ports 80/443 und korrekt aufgelöste Namen für automatische TLS-Zertifikate. Die Produktionsdomain erst gemäß #115 öffentlich umschalten. Eine alleinige DNS-Nichtveröffentlichung ist kein Ersatz für eine explizite Release-Freigabe; die Zugangskontrolle während der Abnahme ist in #117 festzulegen.

## Datenbanken und App Laufzeit

`.env.preview-db` und `.env.production-db` enthalten jeweils `POSTGRES_DB`, `POSTGRES_USER` und ein eigenes starkes `POSTGRES_PASSWORD`. In der entsprechenden App-Datei muss `DATABASE_URL` denselben Benutzer, Datenbanknamen und Passwortwert enthalten und auf `preview-db:5432` beziehungsweise `production-db:5432` zeigen. Ein zufällig erzeugtes Passwort mit URL-Sonderzeichen muss korrekt URL-kodiert werden. Preview und Produktion dürfen keine Passwörter teilen.

Die App-Dateien setzen `APP_ENV=preview` beziehungsweise `APP_ENV=production`, `CATALOG_DATA_SOURCE=postgres` und `ALLOW_MOCK_CATALOG_IN_PREVIEW=false`. Produktion darf nicht mit `mock` oder `auto` betrieben werden. Compose setzt `APP_BASE_URL` aus der jeweiligen Domain. Die Anwendung baut ohne laufende Datenbank; Datenbankabhängige Routen lesen erst zur Laufzeit aus der zugeordneten PostgreSQL-Instanz.

## Preview Zugangsschutz

Die Vorlage verwendet bis zur späteren Benutzerverwaltung einen gemeinsamen Passwortschutz. In `.env.preview-app` stehen `PREVIEW_ACCESS_MODE=shared-password`, ein Scrypt-Hash und ein unabhängiges Session-Secret von mindestens 32 Zeichen. Der Hash wird mit `npm run preview:hash-password` in `apps/web` erzeugt; das Klartextpasswort nur über einen sicheren Kanal weitergeben. `PREVIEW_ACCESS_SESSION_DURATION_SECONDS` bestimmt die Sitzungsdauer. In Produktion bleibt `PREVIEW_ACCESS_MODE=off`, weil die öffentlichen Leseseiten nach #115 ohne Preview-Login erreichbar sein sollen.

Die konkrete Preview-Zugangsregelung und Passwortverantwortung sind vor dem Livebetrieb in #117 zu bestätigen. Der gemeinsame Schutz ist keine Lösung für spätere rollenbasierte Redaktionskonten.

## Import API und Staging Volume

Preview und Produktion besitzen jeweils ein eigenes benanntes Docker-Volume, das ausschließlich unter `/var/lib/aad/import-staging` in den ansonsten schreibgeschützten App-Container eingehängt wird. `IMPORT_STAGING_ROOT` muss exakt auf diesen Pfad zeigen. Das Volume hält den geprüften Upload zwischen Dry-Run und Apply beziehungsweise einem sicheren Wiederholungsversuch. Es ist weder die kanonische Datenbank noch ein Backup und darf nicht zwischen Preview und Produktion geteilt werden.

In beiden App-Dateien wird die API mit `IMPORT_API_ENABLED=true` ausdrücklich aktiviert. `IMPORT_API_TOKEN_HASH` enthält nur den Scrypt-Hash eines je Umgebung eigenen, zufälligen Import-Tokens. Den Hash im Web-Paket mit `AAD_IMPORT_API_TOKEN='<zufälliger Wert>' npm run import:hash-token` erzeugen. Der Klartextwert gehört ausschließlich in die geschützte Laufzeitumgebung des Converter-Arbeitsplatzes als `AAD_IMPORT_API_TOKEN`; dort steht zusätzlich die jeweilige Basis-URL als `AAD_IMPORT_API_URL`. Hash und Klartext dürfen nicht verwechselt, committet oder in Tickets, Screenshots und Diagnoseberichten abgelegt werden.

`IMPORT_MAX_UPLOAD_BYTES`, `IMPORT_MAX_FILES` und `IMPORT_RUN_TTL_SECONDS` begrenzen Upload und Lebensdauer. Die Vorlagen verwenden 25 MiB, 128 Dateien und 24 Stunden. Änderungen müssen zur realen Datenmenge passen und in #117 begründet werden. Abgelaufene oder erfolgreich angewendete Staging-Daten können entfernt werden; eine Bereinigung darf niemals das PostgreSQL-Volume betreffen.

## Konfigurationsprüfung vor dem Start

`docker compose config --quiet` muss erfolgreich sein. Zusätzlich alle Umgebungsdateien auf Platzhalter, getrennte Passwörter und Import-Tokens, passende `DATABASE_URL`-Werte, korrekte Domains, Staging-Pfade und Dateirechte prüfen. Nicht die vollständige Ausgabe von `docker compose config` in ein öffentliches Ticket kopieren: je nach Compose-Version können darin Geheimnisse erscheinen. Die technischen Einzelheiten der Importdateien stehen in [`packages/database/README.md`](../../../packages/database/README.md); API-Vertrag und lokaler Testablauf stehen in [`import-api.md`](../import-api.md).
