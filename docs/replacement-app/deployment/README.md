# Deployment und Betrieb der Replacement App

Dieser Ordner ist die maßgebliche, provider-portable Betriebsdokumentation der Replacement App. Die ausführbaren IONOS-Dateien bleiben in [`deploy/ionos`](../../../deploy/ionos); Entscheidungen, Installationsanleitung und laufender Betrieb stehen hier. Die Markdown-Dateien sind die pflegbare Quelle; [`handbuch.docx`](handbuch.docx) wird daraus erzeugt.

IONOS ist wegen der bestehenden Kundenbeziehung die bevorzugte Wahl. Falls Vertragserweiterung, deutscher Standort oder geeigneter Serverzugang nicht möglich sind, kann derselbe Container-Stack nach einer neuen Freigabe bei Hetzner betrieben werden; die Entscheidung und AVV-Prüfung sind dann in #117 neu zu dokumentieren.

| Dokument | Zweck |
| --- | --- |
| [`installation.md`](installation.md) | Server vorbereiten, Release installieren, Datenbank initialisieren und Erstinbetriebnahme prüfen |
| [`konfiguration.md`](konfiguration.md) | Kundenentscheidungen, Domains, DNS, Zugang, Secrets und Umgebungswerte |
| [`betrieb.md`](betrieb.md) | Health, Logs, Updates, Neustart, Rollback, Wiederaufbau und der Betrieb der Render-PR-Previews |
| [`handbuch.docx`](handbuch.docx) | Weitergebbares deutschsprachiges Handbuch aus den drei Markdown-Dateien |

## Zuständigkeit und Status

- **#105 Entwicklung:** Compose- und Image-Vorlage, Schutzgrenzen, Beispielkonfiguration und Dokumentation. Dieses Ticket benötigt keinen IONOS-Vertrag oder Serverzugang und kann nach technischer Verifikation abgeschlossen werden.
- **#117 Bereitstellung:** Tarif und deutscher Standort, Vertrag und AVV, Domains und DNS, Serverzugang, Installation, Live-Prüfung und Übergabe. Diese Angaben sind zur realen Inbetriebnahme und zur M1-Gesamtabnahme erforderlich. Die bestehenden Render-PR-Previews bleiben dabei aktiv; ihre Ablösung ist nicht Teil von #117.
- **#107 Produktfunktion:** Gesicherter dauerhafter Importweg über API/Converter. Die Implementierung liegt in PR #121; diese Deployment-Vorlage ergänzt dafür getrennte Staging-Volumes und Laufzeitkonfiguration. Der dokumentierte Operator-CSV-Import bleibt als kontrollierter Erstinbetriebnahme- und Wiederherstellungsweg erhalten.
- **#114 und #115:** Daten- und Ansichtsprüfung sowie M1-Abnahme und öffentliche Freigabe.
- **#79 M4:** Wiederkehrende Backups, Aufbewahrung und getestete Wiederherstellung; im M1-Handbuch ist nur ein bewusster Wiederaufbau aus Migrationen und freigegebenen CSVs beschrieben.

## Handbuch aktualisieren

Bei jeder Änderung an Deployment, Konfiguration, Datenimport oder Betriebsablauf zuerst die betroffene Markdown-Datei ändern, dann das DOCX neu erzeugen und visuell prüfen. Änderungen an realen Zugangsdaten gehören nie in diesen Ordner. Zum Generieren wird Python mit `python-docx` benötigt; in Codex ist die gebündelte Dokumenten-Laufzeit zu verwenden:

```bash
python3 docs/replacement-app/deployment/build_handbuch.py
```

Die ausführliche Render- und Sichtprüfung ist Teil des Dokumentations-Workflows; ein erfolgreiches Skript allein bestätigt noch nicht das Layout.
