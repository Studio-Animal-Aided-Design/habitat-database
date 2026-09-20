# Installation der Habitat Datenbank auf einem IONOS Server

Dieses Kapitel führt eine künftige Betreiberin oder einen künftigen Betreiber durch die erstmalige Installation der Replacement App. Die Befehle setzen einen freigegebenen Linux-Server voraus und werden, soweit nicht anders angegeben, im Verzeichnis `deploy/ionos` des ausgecheckten Repositorys ausgeführt. Die Anwendung ist als Docker-Compose-Stack portabel; IONOS ist der gewählte Zielhoster, aber kein Anwendungscode hängt von einer IONOS-API ab.

Der Entwicklungsumfang aus #105 liefert die Installationsvorlage. Eine tatsächlich erreichbare IONOS-Umgebung entsteht erst in #117. Vor einer Bestellung oder DNS-Änderung müssen die offenen Entscheidungen aus „Konfiguration“ bestätigt werden. Kein Platzhalter in diesem Handbuch bedeutet, dass der zugehörige Wert schon feststeht.

## Voraussetzungen für die reale Installation

Der Vertragsinhaber oder die benannte Betriebsverantwortung muss in #117 den konkreten Server-Tarif samt Ressourcen und Kosten, den deutschen Rechenzentrumsstandort, Vertrag und AVV/TOM, die beiden Domains, DNS-Berechtigung sowie den Server- und Notfallzugang freigeben. Zusätzlich werden ein geprüfter Release-Commit, ein freigegebener vollständiger CSV-Datenstand und die für Preview vereinbarte Zugangsregelung benötigt. Details und Zuständigkeiten stehen in „Konfiguration“.

Für einen reinen Entwicklungstest von #105 genügen lokale Platzhalter und eine Test-VM; echte Kundenverträge, Domains oder Zugangsdaten sind dafür nicht erforderlich. Eine lokale Prüfung ersetzt weder TLS- noch Netz- oder Standortnachweise der späteren Bereitstellung.

## Schritt 1 Server bereitstellen und absichern

Den freigegebenen IONOS-Server am bestätigten deutschen Standort mit einer unterstützten Linux-LTS-Version anlegen. Einen namentlich zugeordneten Nicht-root-Benutzer für das Deployment einrichten und dessen Docker-Berechtigung bewusst vergeben: Zugriff auf die Docker-Schnittstelle kann praktisch Root-Rechte auf dem Host bedeuten. Administratorzugang auf benannte IPs oder VPN begrenzen und einen IONOS-Konsolen-Notfallweg festhalten.

Eingehend nur TCP 80 und 443 sowie UDP 443 für Caddy freigeben. SSH nur über den vereinbarten Administrationsweg zulassen. PostgreSQL-Port 5432 darf weder in der Host-Firewall noch in einer IONOS-Firewall öffentlich freigegeben werden. Sicherheitsupdates für Host und Container müssen einer Betreiberrolle zugeordnet sein.

## Schritt 2 Docker und Compose installieren

Eine unterstützte Docker Engine mit Compose-Plugin nach der für das gewählte Linux gültigen Herstelleranleitung installieren. Danach als Deployment-Benutzer Versionen und Rechte prüfen:

```bash
docker version
docker compose version
docker info
```

Die konkrete Paketinstallation ist distributionsabhängig und gehört zur Serverbereitstellung in #117. Die Anwendung verlangt keine IONOS-spezifischen Pakete.

## Schritt 3 Geprüften Release auschecken

Dem Deployment-Benutzer nur den erforderlichen Lesezugriff auf das Repository geben. Das Repository in ein dokumentiertes, von diesem Benutzer verwaltetes Verzeichnis klonen und einen überprüften Commit oder unveränderlichen Release-Tag auschecken. `REPOSITORY_URL` und `RELEASE_COMMIT` sind bewusst Platzhalter:

```bash
git clone REPOSITORY_URL habitat-database
cd habitat-database
git checkout RELEASE_COMMIT
cd deploy/ionos
```

Den verwendeten Commit, die Freigabe und den Betreiber in #117 dokumentieren. Nicht auf einem beliebigen beweglichen Branch deployen.

## Schritt 4 Konfiguration als eigenes Arbeitspaket abschließen

Die fünf Beispiel-Umgebungsdateien kopieren, Domains, ACME-Kontakt, unterschiedliche Datenbank-Passwörter und Preview-Zugangsschutz nach „Konfiguration“ eintragen. Die Dateien bleiben auf dem Server und werden nicht committet. Vor dem Start müssen Preview- und Produktions-Datenbankpasswörter jeweils zwischen `POSTGRES_PASSWORD` und `DATABASE_URL` übereinstimmen.

Die Produktionsdomain darf erst nach der Freigabe in #115 öffentlich auf den Server zeigen. Bis dahin kann die Produktions-App intern aufgebaut und geprüft werden; der öffentliche Produktionszugang ist kein Installationsschritt vor der Abnahme. Für die Preview muss die freigegebene Domain bereits korrekt auf den Server zeigen, damit Caddy ein gültiges Zertifikat beziehen kann.

## Schritt 5 Konfiguration und Images prüfen

Im Verzeichnis `deploy/ionos` ausführen:

```bash
docker compose config --quiet
docker compose build preview-app production-app preview-db-tools production-db-tools
```

Fehlschläge zuerst anhand der Umgebungsdateien, der Docker-Version und des Release-Commits aufklären. `docker compose config` prüft die Compose-Struktur, beweist aber noch keine Erreichbarkeit oder korrekte Kundenkonfiguration.

## Schritt 6 Datenbanken starten und migrieren

Preview und Produktion haben getrennte Datenbanken, Volumes und interne Netzwerke. Zuerst nur die Datenbanken starten, dann die Migration für jede Umgebung ausführen:

```bash
docker compose up -d preview-db production-db
docker compose --profile ops run --rm preview-db-tools db:migrate
docker compose --profile ops run --rm production-db-tools db:migrate
docker compose ps
```

Der Datenbankdienst hat keinen öffentlichen Host-Port. Die Migrationswerkzeuge erhalten ihre jeweilige `DATABASE_URL` aus der getrennten App-Konfiguration.

## Schritt 7 Freigegebenen CSV Stand einspielen

Der Erstimport nutzt den bereits vorhandenen Operator-Weg. Vor jedem schreibenden Lauf den vollständigen Snapshot und den `sync`-Bericht prüfen. Der in `db:dry-run` ausgegebene Manifest-Checksum muss exakt beim zugehörigen `db:apply` eingesetzt werden; `CHECKSUM` ist ein Platzhalter:

```bash
docker compose --profile ops run --rm preview-db-tools db:dry-run -- --mode sync
docker compose --profile ops run --rm preview-db-tools db:apply -- --mode sync --approve CHECKSUM
docker compose --profile ops run --rm production-db-tools db:dry-run -- --mode sync
docker compose --profile ops run --rm production-db-tools db:apply -- --mode sync --approve CHECKSUM
```

Preview und Produktion können unterschiedliche Checksum-Werte nur dann haben, wenn absichtlich unterschiedliche Dateien verwendet werden; für die M1-Abnahme ist der freigegebene Datenstand je Umgebung nachzuweisen. Vor `apply` die Anzahl der Inserts, Änderungen und Entfernungen, Warnungen und die Quell-Dateien kontrollieren. Berichte liegen unter `deploy/ionos/reports/preview` und `deploy/ionos/reports/production`. Für Importdetails gilt [`packages/database/README.md`](../../../packages/database/README.md). Der gesicherte dauerhafte Importweg aus #107 bleibt ein eigenes M1-Produkt-Issue.

## Schritt 8 Apps und Reverse Proxy starten

Nach erfolgreicher Migration und Datenprüfung die Apps und Caddy starten:

```bash
docker compose up -d preview-app production-app caddy
docker compose ps
```

Caddy veröffentlicht die Web-Ports, nicht PostgreSQL. Bei noch nicht freigegebener Produktionsdomain die Caddy-/ACME-Meldungen für diese Domain als erwartete offene Bereitstellung prüfen; die Preview muss dennoch korrekt laufen. Eine endgültige Produktions-TLS-Prüfung folgt erst nach der freigegebenen DNS-Umschaltung.

## Schritt 9 Erreichbarkeit und Schutzgrenzen prüfen

Von einem externen Rechner die Preview-Domain und nach #115 auch die Produktionsdomain prüfen. Für die beiden freigegebenen Domains gilt:

```bash
curl --fail --silent --show-error https://PREVIEW_DOMAIN/health
curl --fail --silent --show-error https://PRODUCTION_DOMAIN/health
docker compose logs --tail 200 caddy preview-app production-app preview-db production-db
```

Zusätzlich im Browser prüfen: Preview leitet ohne Zugang zur Passwortseite, angemeldete Preview zeigt den kanonischen Datenstand, Produktion zeigt nach Freigabe öffentliche Leseansichten ohne Preview-Login. Ein externer Porttest muss bestätigen, dass PostgreSQL nicht erreichbar ist. `/health` allein belegt weder fachliche Datenrichtigkeit noch den Standort. Diese Nachweise gehen in #114 und #115 ein.

## Schritt 10 Übergabe dokumentieren

In #117 Commit, Standort- und Vertragsnachweis, Domains, Betreiberkontakt, TLS- und Netztests, verwendeten CSV-Manifest-Checksum und Prüfergebnis ohne Secrets festhalten. Das Betriebskapitel an die zuständige Person übergeben. Render erst nach akzeptierter IONOS-Preview nach dem dort beschriebenen Ablauf außer Betrieb nehmen.
