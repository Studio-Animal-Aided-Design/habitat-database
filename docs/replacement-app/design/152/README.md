# Gemeinsamer Designvergleich – #152

Stand 15. November 2026. Beide Darstellungen gehören zur selben Anwendung: gemeinsame Routen, Komponenten, Datenabfragen und Importlogik. Die bisherigen Styles sind unverändert aus Commit 1662a7e unter `apps/web/src/styles/classic.css` aufbewahrt. Der Studio-Stand aus #113 liegt unter `studio.css`. Kleine Varianten für Originalmarke, Header-Ziel und Hero-Dekor werden in den gemeinsamen Komponenten ausgewählt.

| Umgebung | Darstellung | Daten |
|---|---|---|
| http://127.0.0.1:3121/ | Studio, optimierter Container | Bestehende PostgreSQL-Datenbank des GUI-Imports |
| http://127.0.0.1:3122/ | Classic, lokaler Entwicklungscontainer | Dieselbe Datenbank; Import-API deaktiviert |
| http://127.0.0.1:3114/ | Vorherige separate Studio-Vorschau | Mock-Daten; keine Datenfreigabe |
| http://127.0.0.1:3120/ | Eingefrorener früherer E2E-Stack | Separate technische Testdatenbank |

[Vergleichsgalerie](index.html) · [Prüfsummen und Prüfprotokolle](manifest.json) · [Vollständige Datenabweichungen](../../acceptance/m1/data-review/2026-11-15/README.md)

## Startparameter

Im Verzeichnis `apps/web`:

```bash
APP_DESIGN=studio npm run dev -- --hostname 127.0.0.1 --port 3131
APP_DESIGN=classic npm run dev -- --hostname 127.0.0.1 --port 3132
```

Auch `npm run dev:studio` und `npm run dev:classic` sind möglich. Nach Variantenwechsel neu starten. Datenmodus und Datenbankzugang bleiben getrennte Einstellungen. Der Classic-Entwicklungsserver hat ein eigenes `.next-classic`-Ausgabeverzeichnis. Für parallele Entwicklungsprozesse mit Hot-Reload sind getrennte Checkouts empfehlenswert; die hier bereitgestellten Container haben getrennte Dateisysteme.

Eine Next-Webpack-Alias wählt genau ein vollständiges Stylesheet. Der öffentliche, nicht geheime Variantenname wird aus derselben Auswahl in den Build übernommen, damit CSS und server-/clientseitiges Markup zusammenpassen. Es gibt keinen öffentlichen Website-Umschalter. Studio ist Produktionsstandard; ein Classic-Build für Produktion oder ein unbekannter Parameter bricht ab. Ein gebautes Produktionsimage bleibt Studio, auch wenn später ein anderer Runtime-Parameter gesetzt wird.

## Lokaler Dockervergleich

Zuerst die lokale Generalprobe nach dem Deployment-Handbuch bereitstellen. Danach dieselben Projekt- und Env-Dateien verwenden. `RC_PROJECT`, `RC_ENV_FILE` und `RC_TAG` stehen für den eigenen lokalen Testlauf und einen neuen Image-Tag. Keine vorhandenen Datenbankvolumes löschen.

```bash
export AAD_APP_TAG="$RC_TAG"
docker compose --project-name "$RC_PROJECT" --env-file "$RC_ENV_FILE" \
  -f deploy/ionos/compose.yaml -f deploy/ionos/compose.local.yaml \
  -f deploy/ionos/compose.design-review.yaml build preview-app classic-app
docker compose --project-name "$RC_PROJECT" --env-file "$RC_ENV_FILE" \
  -f deploy/ionos/compose.yaml -f deploy/ionos/compose.local.yaml \
  -f deploy/ionos/compose.design-review.yaml \
  up -d --no-deps --no-build --wait preview-app classic-app
```

Die zusätzliche Datei ist ausschließlich lokal zu verwenden. Classic läuft als Benutzer `node`, bindet Port 3122 an Loopback, schaltet die Import-API ab und verwendet die bereits vorhandene Preview-Datenbank. Das Produktionsimage behält den schreibgeschützten, nicht privilegierten Runner. Der frühere App-Image-Tag wurde beim lokalen Wechsel nicht überschrieben; die Datenbank und ihre Volumes wurden beibehalten.

## Tatsächliche Prüfung

- Betriebsanleitung neu als DOCX erzeugt; alle zehn gerenderten Seiten auf Layout geprüft.
- Lint, TypeScript, alle 74 Web-Tests und optimierter Studio-Build ohne laufende Build-Datenbank bestehen.
- Beide Docker-Images bauen; beide Dienste sind gesund. Studio verwendet PostgreSQL und erfordert am Import-Endpunkt Token (401 ohne Token); Classic meldet dort 404.
- Datenbankcontainer unverändert; Fingerprints aller 13 fachlichen Tabellen vor und nach dem App-Wechsel identisch. Beide Ansichten zeigen 14 Arten, 259 Pflanzen, 57 Habitatelemente.
- Je sieben Referenzansichten pro Phase: Startseite bei Desktop/Tablet/Mobil, Artenkatalog, Gimpel, Feld-Ahorn und Wildhecken. Keine horizontalen Überläufe und keine JavaScript-Seitenfehler. Aufnahmen vor dem Wechsel sowie beide aktuellen Varianten sind additiv gespeichert.
- Externe Bilder wurden nicht als vollständig fehlerfrei gewertet: bei den Aufnahmen lieferte Wikimedia für mehrere vorhandene Bild-URLs HTTP 429. Die genauen nicht geladenen Bilder stehen in den Protokollen. Dies ist von fehlenden CSV-URLs und Metadaten zu unterscheiden und vor einer Daten-/Medienfreigabe zu prüfen. Weitere Bildabrufe wurden begrenzt.

Die kanonischen Daten wurden nicht korrigiert oder neu importiert. Die Diagnosen und fachlichen Entscheidungen bleiben #114. Manuelle UAT-Fälle sowie CI-/M1-Freigabe bleiben separat; diese technische Integration ist kein Kunden-Sign-off. Main-Merges erfolgen durch den Maintainer.
