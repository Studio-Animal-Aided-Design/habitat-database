#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

export PYINSTALLER_CONFIG_DIR="$(pwd)/.pyinstaller-cache"
mkdir -p "$PYINSTALLER_CONFIG_DIR"

APP_NAME="AAD-Tooljet-Converter"
VERSION="${1:-0.1.0}"
RELEASE_ROOT="dist/release"
RELEASE_DIR="$RELEASE_ROOT/${APP_NAME}-${VERSION}-macos"
ZIP_PATH="$RELEASE_ROOT/${APP_NAME}-${VERSION}-macos.zip"

./build_converter_app.sh

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

cp -R "dist/${APP_NAME}.app" "$RELEASE_DIR/"
cp "CONVERTER.md" "$RELEASE_DIR/README-Converter.md"

cat > "$RELEASE_DIR/START-HERE.txt" <<'TXT'
AAD Tooljet Converter

1) Doppelklicke "AAD-Tooljet-Converter.app".
2) Falls macOS warnt: Rechtsklick auf die App -> "Öffnen" -> nochmals "Öffnen".
3) Wähle den Eingabeordner "data" (oder euren Datenordner) und einen Ausgabeordner.
4) Starte die Konvertierung.
5) Öffne danach "tooljet-import-guide.md" und "conversion-report.html" im Ausgabeordner.
TXT

rm -f "$ZIP_PATH"
(
  cd "$RELEASE_ROOT"
  ditto -c -k --sequesterRsrc --keepParent "${APP_NAME}-${VERSION}-macos" "${APP_NAME}-${VERSION}-macos.zip"
)

echo "Release folder: $RELEASE_DIR"
echo "Release zip:    $ZIP_PATH"
