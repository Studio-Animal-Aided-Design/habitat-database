# M1 – Fachlicher Endabnahmeplan

Stand: 7. Oktober 2026 · Status: **Testplanung, keine Abnahme**

Dieser Plan führt eine manuelle Ende-zu-Ende- und User-Acceptance-Prüfung für den ersten Kundenmeilenstein. Er ergänzt die M1-Abnahmematrix in der lokalen Kundenablage (`habitat-database/private/feasibility-study/m1-abnahmematrix.md`); diese ist nicht Teil des öffentlichen Git-Repositories. Die technische Fertigstellung eines Tickets ist keine fachliche Freigabe. Nur das datierte Votum in [#115](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/115) schließt M1 ab.

## Durchführung und Nachweise

1. Ein freigegebener, eingefrorener CSV-Snapshot wird mit Fingerprint, erwarteten Zeilen- und Beziehungszahlen dokumentiert. Testdaten und produktive Daten nie vermischen. Für destruktive Tests nur eine **wegwerfbare lokale Datenbank** oder ausdrücklich freigegebene RC-Testumgebung verwenden; keine Produktionsdatenbank zurücksetzen.
2. Pro Testfall Voraussetzungen prüfen, Schritte in Reihenfolge ausführen und tatsächliches Ergebnis mit den Erwartungen vergleichen. In der zugehörigen GitHub-Test-Issue Ausführungsdatum, Prüfer, Umgebung/URL, Commit oder Tag, Browser/Viewport, Snapshot-Fingerprint, Ergebnis und redigierte Evidenz verlinken. Passwörter, Tokens, personenbezogene Daten und ungeschwärzte Logs nicht anhängen.
3. `Passed` nur setzen, wenn **alle** erwarteten Ergebnisse belegt sind. Bei Abweichung `Failed`, reproduzierbare Beobachtung und Defect-Issue verlinken; bei fehlender Voraussetzung `Blocked` mit konkretem Grund. `Not run` ist weder bestanden noch blockiert. Ein erneuter Lauf erhält einen neuen Evidenzkommentar, nicht eine stillschweigende Überschreibung.
4. Im [M1-UAT-Projekt](https://github.com/orgs/Studio-Animal-Aided-Design/projects/2) nach `Status` arbeiten: `Todo → In Progress → Done`. Das Feld `Result` führt `Not run / Passed / Failed / Blocked`; `Execution order` gibt die Reihenfolge. Eine Issue wird nur mit bestandenem, verlinktem Nachweis geschlossen. Blockierte oder fehlgeschlagene Tests bleiben offen.
5. Neue oder geänderte Features erweitern in **derselben PR** diesen Index und mindestens einen eigenen Testfall. Die Test-Issue und das Feature-Issue verlinken sich wechselseitig; die Testschritte müssen die neuen Akzeptanzkriterien abdecken. Nur veränderte/risikorelevante Tests erneut ausführen und den Versionsbezug protokollieren.

## Umgebungen und Grenzen

- **Lokal:** Wegwerfbare PostgreSQL-Datenbank, Next.js-App und Converter. Die [lokale Import-Anleitung](../../import-api.md) liefert Kommandos. Sie ersetzt keine Abnahme auf der Zielumgebung.
- **Render-PR-Preview:** Zugriffsschutz und Mock-Isolation prüfen. Render bleibt für PR-Previews bestehen; Render ist **nicht** die IONOS-RC- oder Produktionsabnahme.
- **IONOS-RC und Produktion:** Erst nach Bereitstellung von Tarif/Vertrag, deutschem Standort, AVV, Domains/DNS und Serverzugang. RC und Produktion getrennt; keine Mock-/Auto-Fallback-Daten in Produktion. Die Tests 021–024 bleiben bis zu den genannten Lieferungen/Entscheidungen blockiert.
- Management-Login, CRUD und Publikationsworkflow gehören zu M3, nicht zu M1. Eine tiefe Accessibility-Zertifizierung, Backups/PITR und SEO-Optimierung sind keine stillschweigenden M1-Kriterien; ein kurzer Usability-, Indexierungs- und Performance-Smoke-Test ist es.

## Testkatalog

| Reihenfolge | Testfall | Schwerpunkt | Führende Implementierungs-Issues | Matrix | Bereits ausführbar? | GitHub-Issue |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | [UAT-M1-001](UAT-M1-001.md) | Converter-Dateiausgabe und CLI-Kompatibilität | #107 | 15 | Lokal | [#124](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/124) |
| 02 | [UAT-M1-002](UAT-M1-002.md) | Converter-Einrichtung, Verbindung und Secret-Speicherung | #107 | 13–14 | Lokal | [#125](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/125) |
| 03 | [UAT-M1-003](UAT-M1-003.md) | Leere DB, Migration, Dry-run, Apply, öffentliche Daten | #75, #76, #85, #107 | 01, 05, 15 | Lokal | [#126](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/126) |
| 04 | [UAT-M1-004](UAT-M1-004.md) | Ungültiger Import, Staging, Atomarität | #76, #107 | 02, 04 | Lokal | [#127](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/127) |
| 05 | [UAT-M1-005](UAT-M1-005.md) | Zweitimport, Idempotenz und Refresh | #76, #107 | 03, 05 | Lokal | [#128](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/128) |
| 06 | [UAT-M1-006](UAT-M1-006.md) | Import-Authentifizierung und Secret-Grenze | #107, #115 | 13–14 | Lokal/RC | [#129](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/129) |
| 07 | [UAT-M1-007](UAT-M1-007.md) | Datenabgleich und Beziehungsintegrität | #75, #76, #114 | 01–02 | Snapshot fehlt ggf. | [#130](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/130) |
| 08 | [UAT-M1-008](UAT-M1-008.md) | Öffentliche Startseite und Navigation | #71, #85, #88 | 06 | Lokal | [#131](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/131) |
| 09 | [UAT-M1-009](UAT-M1-009.md) | Arten-, Pflanzen- und Elemente-Kataloge | #72, #88, #90, #91 | 06 | Lokal | [#132](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/132) |
| 10 | [UAT-M1-010](UAT-M1-010.md) | Dichtes und sparsames Artenportrait | #73, #85, #89 | 06 | Lokal | [#133](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/133) |
| 11 | [UAT-M1-011](UAT-M1-011.md) | Arten-Attributbrowser | #96 | 06 | Lokal | [#134](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/134) |
| 12 | [UAT-M1-012](UAT-M1-012.md) | Sticky Portrait-Navigation | #98 | 06 | Lokal | [#135](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/135) |
| 13 | [UAT-M1-013](UAT-M1-013.md) | Planungsbausteine und Beziehungen | #99 | 06 | Lokal | [#136](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/136) |
| 14 | [UAT-M1-014](UAT-M1-014.md) | Lebenszyklus und Fallback | #100 | 06 | Lokal | [#137](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/137) |
| 15 | [UAT-M1-015](UAT-M1-015.md) | Pflanzenportrait | #90 | 06 | Lokal | [#138](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/138) |
| 16 | [UAT-M1-016](UAT-M1-016.md) | Habitatelementportrait | #91 | 06 | Lokal | [#139](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/139) |
| 17 | [UAT-M1-017](UAT-M1-017.md) | Nicht veröffentlichte Daten ausschließen | #75, #85, #114 | 07 | Lokal | [#140](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/140) |
| 18 | [UAT-M1-018](UAT-M1-018.md) | Editorial UI, responsive und Grundbedienbarkeit | #87 | 06, 08 | Lokal/RC | [#141](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/141) |
| 19 | [UAT-M1-019](UAT-M1-019.md) | Render-Preview-Zugang, Redirect und Robots | #104, #111 | 18 | Render | [#142](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/142) |
| 20 | [UAT-M1-020](UAT-M1-020.md) | Datenmodus und Produktionsgrenze | #71, #85, #104, #105 | 11, 14 | Lokal/RC | [#143](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/143) |
| 21 | [UAT-M1-021](UAT-M1-021.md) | IONOS-Deployvorlage und Runbook | #105 | 10–12, 16 | Nach #105 | [#144](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/144) |
| 22 | [UAT-M1-022](UAT-M1-022.md) | IONOS-RC/Produktion, DNS/TLS und Commissioning | #117 | 10–12, 15–16 | Nach #117 | [#145](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/145) |
| 23 | [UAT-M1-023](UAT-M1-023.md) | Studio-CI und Kundenfreigabe | #113 | 08–09 | Nach #113 | [#146](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/146) |
| 24 | [UAT-M1-024](UAT-M1-024.md) | Schlanker RC-/Release-Prozess | #118 | 10, 19 | Nach #118 | [#147](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/147) |
| 25 | [UAT-M1-025](UAT-M1-025.md) | Performance, Indexierung und Betriebssmoke | #104, #115, #117 | 16–18 | RC/Produktion | [#148](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/148) |
| 26 | [UAT-M1-026](UAT-M1-026.md) | Gesamtnachweise und M1-Abnahmevotum | #115 | 19–21 | Zuletzt | [#149](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/149) |

## Abdeckungsregel

Die Matrix-IDs 01–21 sind oben abgebildet. Für teilweise implementierte Katalog-/Portrait-Issues prüft der Test den **heute gelieferten Funktionsstand**; fehlende Anforderungen bleiben im jeweiligen Feature-Issue offen. Die Gates 021–026 werden angelegt, damit M1 nicht mit einer rein lokalen Prüfung verwechselt wird. Ein fehlendes Kundenartefakt ist als `Blocked` zu protokollieren und nie als Erfolg zu interpretieren.
