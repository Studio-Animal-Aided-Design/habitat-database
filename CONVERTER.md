# AAD Tooljet Converter (Notebook Replacement)

## Ziel
Lokale Desktop-Anwendung zur Konvertierung der Excel-Quelldaten in Tooljet-importierbare CSV-Dateien inklusive Berichten und Import-Hilfe.

## Schnellstart (GUI)
1. `python3 -m pip install -r requirements-converter.txt`
2. `python3 -m converter_app.gui`

Alternativ: `./run_converter.command`

## CLI
```bash
python3 -m converter_app.cli --input-root data --output-root dist/conversion-output
```

## Import in die neue App

Die Desktop-App bietet nach der Konvertierung die Aktion **„An App senden“**. Sie überträgt die
vollständigen CSV-Ausgaben zunächst als Dry-Run, zeigt die Änderungen und fragt vor dem eigentlichen
Import nochmals nach einer Bestätigung. API-Zugangsdaten werden nicht in der Converter-Konfiguration
gespeichert.

Vor dem Start der Desktop-App setzen:

```bash
export AAD_IMPORT_API_URL=http://localhost:3000
export AAD_IMPORT_API_TOKEN='<vom Betreiber bereitgestelltes Token>'
python3 -m converter_app.gui
```

CLI-Dry-Run:

```bash
python3 -m converter_app.cli --input-root data --output-root dist/conversion-output --publish-dry-run
```

Ein bereits geprüfter Lauf wird nur mit ausdrücklicher Freigabe angewendet:

```bash
python3 -m converter_app.cli --apply-run <run-id> --approve
```

Die Lebenszyklus-CSV wird aktuell nicht vom Converter erzeugt. Der Client übernimmt sie deshalb
aus dem gewählten Quelldatenordner, sofern sie nicht im Ausgabeordner liegt.

## Ausgaben
Im Ausgabeordner werden erzeugt:
- `conversion-report.json`
- `conversion-report.html`
- `tooljet-import-guide.md`
- CSV-Dateien unter denselben Relativpfaden wie bisher (`.../import/out/...`)

## Dokumentation
- Markdown-Handbuch: `docs/converter/AAD-Converter-Handbuch.md`
- PDF-Handbuch: `docs/converter/AAD-Converter-Handbuch.pdf`
- In der App erreichbar über:
  - `Hilfe öffnen`
  - `Handbuch (PDF) öffnen`

## PyInstaller Build (macOS)
```bash
./build_converter_app.sh
```

Das PDF-Handbuch wird beim PyInstaller-Build mit in das App-Bundle aufgenommen.

## Paritätsprüfung
Vergleicht Header und Zeilenanzahl gegen bestehende Notebook-Outputs:
```bash
python3 scripts/validate_parity.py --baseline-root data --candidate-root dist/conversion-output
```


## Verteilbarer Build (ohne Python für Endnutzer)
```bash
./package_converter_release.sh 0.1.0
```

Das erzeugt eine doppelklickbare macOS-App (`.app`) plus eine fertige ZIP-Datei zum Teilen.


## Dev Mode (Hot Reload)

Für Entwicklung ohne Rebuild:

```bash
python3 -m converter_app.dev_runner
```

Oder per Doppelklick:
- `run_converter_dev.command`

Hinweis: Bei Änderungen wird die GUI automatisch neu gestartet (Hot-Reload-ähnlich).
