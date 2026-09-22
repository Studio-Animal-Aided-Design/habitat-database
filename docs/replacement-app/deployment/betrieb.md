# Betrieb und Wiederherstellung

Dieses Kapitel beschreibt den Betrieb nach der Installation. Die Befehle werden im Verzeichnis `deploy/ionos` des aktiven Release-Checkouts ausgeführt. Die verantwortliche Person muss Zugang zum Server und zum freigegebenen Release haben. Änderungen an DNS, Secrets, Datenbankvolumes oder öffentlicher Produktion benötigen die dokumentierte Freigabe aus #117 beziehungsweise #115.

## Regelmäßige Zustandsprüfung

Den Zustand der Container und die begrenzten Logs prüfen. Die Vorlage begrenzt JSON-Logs je Container, ersetzt aber keine spätere Überwachung oder zentrale Aufbewahrung:

```bash
docker compose ps
docker compose logs --tail 200 caddy preview-app production-app preview-db production-db
curl --fail --silent --show-error https://PREVIEW_DOMAIN/health
curl --fail --silent --show-error https://PRODUCTION_DOMAIN/health
```

Ein erfolgreicher Health-Response ist nur eine technische Stichprobe. Nach Deployments auch mindestens eine repräsentative Detailseite und die korrekte Preview-Zugangssperre von außen prüfen. Bei Fehlern zuerst Containerstatus, Caddy-/App-Logs, DNS und Zertifikatsstatus prüfen; keine Secrets in Support-Tickets kopieren.

## Geprüften Release aktualisieren

Vor einem Update Release-Commit, Änderungen am Datenbankschema, Migrationskompatibilität und Rollback-Pfad prüfen. Eine Anwendungs-Rückkehr auf alten Code macht eine Datenbankmigration nicht rückgängig. Bei reinem Anwendungsupdate:

```bash
git fetch --prune
git checkout RELEASE_COMMIT
docker compose build preview-app production-app
docker compose up -d --no-deps preview-app production-app
docker compose ps
```

Anschließend beide Health-Endpunkte, Preview-Zugangsschutz und repräsentative Seiten prüfen. Wenn neue Migrationen erforderlich sind, diese bewusst vor dem App-Wechsel pro Umgebung durchführen und den Datenbank-Rollback gesondert planen. Den freigegebenen Commit und das Prüfergebnis dokumentieren.

## Neustart und Anwendungs Rollback

Für einen gewöhnlichen Neustart:

```bash
docker compose restart caddy preview-app production-app
```

Bei einem Anwendungsfehler kann auf einen zuvor akzeptierten, zum aktuellen Datenbankschema kompatiblen Commit zurückgegangen werden:

```bash
git checkout PREVIOUS_ACCEPTED_COMMIT
docker compose build preview-app production-app
docker compose up -d --no-deps preview-app production-app
```

Danach dieselben Außenprüfungen wie nach einem Update wiederholen. Bei Schema-Inkompatibilität nicht blind zurückwechseln; zuerst Incident und Migrationspfad entscheiden. Weder `docker compose down -v` noch das Löschen eines Volumes ist ein normaler Neustart oder Anwendungs-Rollback.

## Datenbank Wiederaufbau aus freigegebenen CSVs

M1 besitzt noch keine automatisierte Backup-Wiederherstellung. Der dokumentierte Notfallpfad ist ein bewusster Neuaufbau aus Migrationen und einem freigegebenen vollständigen CSV-Snapshot. Dadurch können alle Daten verloren gehen, die nur in der betroffenen Datenbank vorhanden und nicht im Snapshot enthalten sind. Dieses Verfahren darf nur nach fachlicher Risikoentscheidung verwendet werden.

Vor einem Wiederaufbau den Vorfall sichern, betroffene Umgebung und exakten Volume-Namen mit einer zweiten Person prüfen und den zu verwendenden Snapshot freigeben. Dann die betroffene App stoppen, ausschließlich das ausdrücklich bestätigte Datenbankvolume entfernen, Datenbank neu starten, Migration ausführen, Dry-Run-Bericht prüfen, Checksum freigeben und CSVs anwenden. Danach App starten und Health, Mengen, Beziehungen und Stichproben prüfen. Ein pauschaler Löschbefehl steht absichtlich nicht in diesem Handbuch. Wiederkehrende Backups, Aufbewahrung und ein getesteter Restore bleiben #79 / Kunden-M4.

## Gesicherte Importe betreiben

Ein regulärer Datenimport beginnt im Converter mit einem vollständigen lokalen Lauf. Anschließend sendet die verantwortliche Person einen Dry-Run an die gewählte Umgebung, prüft Prüfsumme, Diagnosen sowie eingefügte, geänderte und entfernte Datensätze und bestätigt Apply getrennt. Preview und Produktion verwenden unterschiedliche Basis-URLs, Tokens, Datenbanken und Staging-Volumes. Ein Preview-Run darf nicht in Produktion angewendet werden.

Bei einer unsicheren Netzwerkantwort nach Apply nicht mit einem neuen Upload fortfahren. Zuerst den bestehenden Run-Status über die API beziehungsweise die Tabellen `import_runs`, `import_files` und `audit_events` prüfen und denselben Run idempotent wiederholen. Ein erfolgreicher Apply entfernt die Staging-Dateien und aktualisiert die öffentlichen Leseansichten; Metadaten und Audit-Ereignisse bleiben in PostgreSQL. Fehlgeschlagene oder abgelaufene Runs dürfen bereinigt werden, nachdem Ursache und benötigte Diagnoseinformationen gesichert sind. Import-Tokens niemals in Logs oder Support-Tickets kopieren; bei Verdacht auf Offenlegung neues Token und neuen Hash konfigurieren und die App kontrolliert neu starten.

## Render-PR-Previews beibehalten

Die bestehende Render-Mock-Preview und die automatischen PR-Previews bleiben aktiv. IONOS stellt die Release-Candidate- und Produktionsumgebung bereit; die dafür nötigen Nachweise werden in #117 festgehalten. Render-Blueprint, PR-Preview-Service, Preview-Passworthash und Session-Secret dürfen im Rahmen von #117 nicht entfernt oder deaktiviert werden. Eine spätere Ablösung von Render braucht eine eigene Entscheidung, ein eigenes Issue und einen dokumentierten Migrations- beziehungsweise Rollback-Plan. Den Status beider Hosting-Pfade in [`render-previews.md`](../render-previews.md) synchron halten.

## Handbuchpflege

Bei jeder Änderung an Compose, Images, Import, Sicherheitskonfiguration oder Betriebsverfahren die passende Markdown-Quelle in diesem Ordner im selben PR aktualisieren. Danach `handbuch.docx` neu erzeugen und seitenweise prüfen. Betriebliche Erkenntnisse aus #117 und der M1-Abnahme ergänzen, ohne Zugangsdaten in Git abzulegen.
