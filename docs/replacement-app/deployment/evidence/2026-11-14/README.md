# Lokale Container- und Converter-Probe am 14. November 2026

**Technische Probe erfolgreich. Keine IONOS- oder Kundenfreigabe.**

## Tatsächlich ausgeführt

- Docker Engine 27.3.1, Compose 2.30.3; lokale Linux-Container auf macOS/arm64.
- Eigene Compose-Projekte und neue Volumes; ausschließlich Loopback-HTTP, PostgreSQL ohne Host-Port. Bestehende Kundenverbindungen und Datenbanken wurden nicht verwendet.
- Der [CLI-E2E-Bericht](container-e2e.json) enthält 13 erfolgreiche Schritte: beide Images bauen, Migrationen und leere fachliche Tabellen, öffentliche Antwort vor Import, gültiges/ungültiges Credential, Converter-Snapshot, Dry-Run ohne fachliche Änderungen, falsche Prüfsumme, Apply und Wiederholung, identischer Zweitimport, fehlerhafte CSV ohne Datenänderung, Staging-Bereinigung, Audit und Persistenz nach App-Neustart.
- Zweite leere Datenbank auf `http://127.0.0.1:3121` für das tatsächliche ZIP-Paket **Converter 0.1.5 arm64**, Quellstand `6c74178dda1c2a1b9fd754e0503d58bb1fba3edc`. Keine Quellcode-GUI als Ersatz für das Paket verwendet.
- GUI: Ersteinrichtung, falscher Token mit HTTP 401, gültiger Verbindungstest, URL in separater Testkonfiguration und Token im macOS-Schlüsselbund. Vorher waren weder Converter-Credential noch Standard-URL-Konfiguration vorhanden. Die bestehende Standardkonfiguration wurde nicht überschrieben. Nach Neustart wird die gespeicherte Verbindung erkannt.
- GUI-Konvertierung in eigenen Ausgabeordner, Dry-Run mit 1.826 neuen Einträgen und 118 Hinweisen; alle 13 fachlichen Tabellen bleiben dabei leer. Erst bestätigtes Apply schreibt Daten. Die öffentliche Artenseite wechselt von 0 auf 14 Arten. [GUI-Bericht](gui-e2e.json) und [Aufnahmen](gui/) dokumentieren die Schritte.
- Der Nutzer half bei „Speichern“/Direktmodus und beim Dry-Run-Button, weil die Mac-Steuerung Tk-Fenster nicht zuverlässig adressierte. Codex führte Konvertierung, Apply und Rückprüfung aus. Ein anfangs versehentlich im URL-Feld eingefügter ungültiger Dummy-Token wurde korrigiert; kein echtes Credential wurde dort eingefügt. Nur die nachfolgenden tatsächlichen Testergebnisse zählen als Nachweis.

## Gefundener und behobener Fehler

Die lokale Overlay-Datei ergänzte das Produktionswerkzeug-Profil zunächst um `production`, erbte aber zusätzlich `ops`. Beim lokalen Migrationslauf wurde dadurch ein Dienst aktiviert, dessen Produktionsdatenbank absichtlich deaktiviert war. Das Profil wird jetzt mit `!override [production]` ersetzt; die lokale Generalprobe verlangt dafür Compose ab 2.24.4. Die [Docker-Dokumentation](https://docs.docker.com/reference/compose-file/merge/#replace-value) beschreibt die Ersetzungsregel.

Ein Regressionstest prüft die echte aufgelöste Compose-Konfiguration mit aktiviertem `ops`: Preview-Werkzeuge vorhanden, keine Produktionsdienste und kein Caddy. Alle **21 Python-Tests** bestehen. Das aktualisierte Handbuch wurde neu erzeugt und auf allen neun gerenderten Seiten visuell geprüft.

## Fachliche Datenbefunde für #114

Der technische Teststand ist noch kein freigegebener Kundensnapshot. Kanonischer Stand nach GUI-Apply: **14 Arten, 259 Pflanzen, 57 Habitatelemente, 321 Arten-Pflanzen-Beziehungen, 294 Arten-Habitat-Beziehungen, 685 Attributwerte, 49 Attributdefinitionen und 62 Lebenszyklusphasen**. Die Roh-CSV-Ausgabe enthält unter anderem 262 Pflanzenzeilen und 300 Arten-Habitat-Zeilen. Die Differenzen dürfen nicht als Datenverlust verschwiegen oder ohne fachliche Prüfung akzeptiert werden.

Die Importdiagnosen enthalten:

- 3 Pflanzen-Dubletten und 6 Konflikte in doppelten Pflanzenangaben;
- 74 leere Attributwerte;
- 28 unvollständige Medienmetadaten und 1 fehlende Medien-URL;
- 6 doppelte Arten-Habitat-Beziehungen.

Diese 118 Hinweise und die Mengenabgleiche gehen in #114 ein. Der Converter meldet zusätzlich Quelldaten-Hinweise, etwa fehlende Tabellenblätter und drei verworfene Relationen ohne gültiges Habitatelement. Ein technischer Importerfolg ersetzt keine fachliche Freigabe von Quellen, Bildern, Zuordnungen oder Konfliktauflösung.

## Grenzen und nächster Schritt

Die Tests belegen den lokalen Container- und Arbeitsplatzweg einschließlich des tatsächlich gebauten Clients. Sie belegen keinen Betrieb auf IONOS, kein echtes HTTPS, keinen externen Netztest, keine x86_64-Laufzeit und keine notarisiert ausgelieferte Kunden-App. Die vollständigen manuellen UAT-Fälle bleiben separat; kein Fall wird allein aus dieser Teil-Evidenz auf `Passed` gesetzt. Die finale M1-Entscheidung bleibt #115.

Als nächstes stehen #117 (freigegebener IONOS-Server, Standort/Vertrag/AVV, Domains und Zugang; denselben Import über echtes HTTPS prüfen), #114 (Datenfreigabe), #113 (CI-Freigabe), #118 (RC-/Releaseweg) und #115 an. Die Designvorschau auf Port 3114 und die Galerie auf 3115 bleiben getrennt vom echten Daten-Test auf 3121.
