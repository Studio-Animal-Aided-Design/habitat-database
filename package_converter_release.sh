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
STAGING_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/aad-converter-release.XXXXXX")"
STAGING_DIR="$STAGING_ROOT/${APP_NAME}-${VERSION}-macos"
STAGING_ZIP="$STAGING_ROOT/${APP_NAME}-${VERSION}-macos.zip"
VERIFY_ROOT="$STAGING_ROOT/verify"

cleanup() {
  rm -rf "$STAGING_ROOT"
}
trap cleanup EXIT

APP_VERSION="$VERSION" ./build_converter_app.sh

mkdir -p "$STAGING_DIR"

ditto --norsrc --noextattr "dist/${APP_NAME}.app" "$STAGING_DIR/${APP_NAME}.app"
cp "CONVERTER.md" "$STAGING_DIR/README-Converter.md"

cat > "$STAGING_DIR/START-HERE.txt" <<'TXT'
AAD Tooljet Converter

1) Doppelklicke "AAD-Tooljet-Converter.app".
2) Falls macOS die nicht notarisierte App blockiert:
   Systemeinstellungen -> Datenschutz & Sicherheit -> "Dennoch öffnen".
   Alternativ: Rechtsklick auf die App -> "Öffnen".
3) Wähle den Eingabeordner "data" (oder euren Datenordner) und einen Ausgabeordner.
4) Starte die Konvertierung.
5) Öffne danach "tooljet-import-guide.md" und "conversion-report.html" im Ausgabeordner.
TXT

# Re-clean and verify immediately before packaging. This catches metadata added
# by cloud/file-provider folders and guarantees a complete bundle signature.
xattr -cr "$STAGING_DIR/${APP_NAME}.app"
codesign --verify --deep --strict "$STAGING_DIR/${APP_NAME}.app"
test -f "$STAGING_DIR/${APP_NAME}.app/Contents/_CodeSignature/CodeResources"

(
  cd "$STAGING_ROOT"
  COPYFILE_DISABLE=1 ditto -c -k --norsrc --noextattr --keepParent \
    "${APP_NAME}-${VERSION}-macos" \
    "${APP_NAME}-${VERSION}-macos.zip"
)

unzip -t "$STAGING_ZIP" >/dev/null
mkdir -p "$VERIFY_ROOT"
ditto -x -k "$STAGING_ZIP" "$VERIFY_ROOT"
codesign --verify --deep --strict \
  "$VERIFY_ROOT/${APP_NAME}-${VERSION}-macos/${APP_NAME}.app"

if [[ -n "${NOTARYTOOL_PROFILE:-}" ]]; then
  if [[ -z "${CODESIGN_IDENTITY:-}" ]]; then
    echo "NOTARYTOOL_PROFILE requires CODESIGN_IDENTITY." >&2
    exit 1
  fi
  xcrun notarytool submit "$STAGING_ZIP" \
    --keychain-profile "$NOTARYTOOL_PROFILE" \
    --wait
  xcrun stapler staple "$STAGING_DIR/${APP_NAME}.app"

  rm -f "$STAGING_ZIP"
  (
    cd "$STAGING_ROOT"
    COPYFILE_DISABLE=1 ditto -c -k --norsrc --noextattr --keepParent \
      "${APP_NAME}-${VERSION}-macos" \
      "${APP_NAME}-${VERSION}-macos.zip"
  )
fi

rm -rf "$RELEASE_DIR"
rm -f "$ZIP_PATH"
mkdir -p "$RELEASE_ROOT"
ditto --norsrc --noextattr "$STAGING_DIR" "$RELEASE_DIR"
cp "$STAGING_ZIP" "$ZIP_PATH"

./scripts/verify_macos_release.sh "$ZIP_PATH"

echo "Release folder: $RELEASE_DIR"
echo "Release zip:    $ZIP_PATH"
