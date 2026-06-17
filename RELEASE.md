# macOS Build & Distribution

## Ziel
Nicht-technische Nutzer sollen die App per Doppelklick starten können, ohne Python-Befehle.

## Einmaliger Build/Release für Maintainer
```bash
./package_converter_release.sh 0.1.0
```

Ergebnis:
- App-Bundle: `dist/release/AAD-Tooljet-Converter-0.1.0-macos/AAD-Tooljet-Converter.app`
- Shareable ZIP: `dist/release/AAD-Tooljet-Converter-0.1.0-macos.zip`

## Verteilung an Endnutzer
1. ZIP-Datei an Nutzer schicken.
2. Nutzer entpacken die ZIP und starten `AAD-Tooljet-Converter.app` per Doppelklick.
3. Beim ersten Start evtl. Gatekeeper-Warnung via Rechtsklick -> "Öffnen" umgehen.

## Optional (empfohlen)
- Apple Developer Signing + Notarisierung ergänzen, damit Gatekeeper-Warnungen minimiert werden.
