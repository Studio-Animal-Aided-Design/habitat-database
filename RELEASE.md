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
3. Ein ad-hoc signierter Build ist nicht notarisiert. Beim ersten Start muss er gegebenenfalls unter
   `Systemeinstellungen -> Datenschutz & Sicherheit -> Dennoch öffnen` freigegeben werden.

## Automatische Release-Prüfung

`package_converter_release.sh` prüft vor der Veröffentlichung:

- ZIP-Integrität
- App-Bundle und ausführbare Datei
- vollständige Code-Signatur einschließlich `CodeResources`
- Bundle-ID und Versionsnummer
- CPU-Architektur

Manuell:

```bash
./scripts/verify_macos_release.sh dist/release/AAD-Tooljet-Converter-0.1.4-macos.zip
```

Der Build bricht bei Signaturfehlern ab. Ein beschädigtes Bundle wird nicht mehr veröffentlicht.

## Developer-ID-Signierung und Notarisierung

Für einen warnungsfreien Start nach einem Browser-Download sind eine Apple Developer-ID und
Notarisierung erforderlich:

```bash
CODESIGN_IDENTITY="Developer ID Application: ORGANISATION (TEAMID)" \
NOTARYTOOL_PROFILE="aad-converter-notary" \
./package_converter_release.sh 0.1.4
```

Der Keychain-Profile muss zuvor mit `xcrun notarytool store-credentials` eingerichtet werden.

Ohne diese Zugangsdaten erzeugt der Build eine strukturell gültige ad-hoc-Signatur. Diese verhindert
den bisherigen Fehler „App ist beschädigt“, ersetzt aber nicht die macOS-Sicherheitsfreigabe für
heruntergeladene, nicht notarisierte Software.
