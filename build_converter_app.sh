#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

export PYINSTALLER_CONFIG_DIR="$(pwd)/.pyinstaller-cache"
mkdir -p "$PYINSTALLER_CONFIG_DIR"
export COPYFILE_DISABLE=1

APP_NAME="AAD-Tooljet-Converter"
APP_VERSION="${APP_VERSION:-0.1.0}"
APP_BUNDLE_ID="${APP_BUNDLE_ID:-de.animal-aided-design.converter}"
DIST_DIR="dist"
APP_PATH="$DIST_DIR/$APP_NAME.app"
APP_ICON_ICNS="$(pwd)/assets/aad-icon.icns"
TEMP_BUILD_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/aad-converter-build.XXXXXX")"
TEMP_DIST_DIR="$TEMP_BUILD_ROOT/dist"
TEMP_BUILD_DIR="$TEMP_BUILD_ROOT/build"
TEMP_SPEC_DIR="$TEMP_BUILD_ROOT/spec"
TEMP_APP_PATH="$TEMP_DIST_DIR/$APP_NAME.app"

cleanup() {
  rm -rf "$TEMP_BUILD_ROOT"
}
trap cleanup EXIT

python3 -m pip install -r requirements-converter.txt pyinstaller

./scripts/build_app_icon.sh

# Preflight: fail fast if entry modules are broken
python3 - <<'PY'
import converter_app.gui
import converter_app.gui_main
print('Python preflight imports OK')
PY

python3 -m PyInstaller \
  --noconfirm \
  --clean \
  --windowed \
  --onedir \
  --name "$APP_NAME" \
  --icon "$APP_ICON_ICNS" \
  --osx-bundle-identifier "$APP_BUNDLE_ID" \
  --distpath "$TEMP_DIST_DIR" \
  --workpath "$TEMP_BUILD_DIR" \
  --specpath "$TEMP_SPEC_DIR" \
  converter_app/gui_main.py

# Set the release version before signing. PyInstaller otherwise writes 0.0.0.
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $APP_VERSION" "$TEMP_APP_PATH/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleVersion string $APP_VERSION" "$TEMP_APP_PATH/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $APP_VERSION" "$TEMP_APP_PATH/Contents/Info.plist"

# FinderInfo/resource forks from synced folders make codesign fail. Build and sign
# in a local temp directory, strip all extended metadata, and fail on any error.
find "$TEMP_APP_PATH" -name '._*' -type f -delete
xattr -cr "$TEMP_APP_PATH"

if [[ -n "${CODESIGN_IDENTITY:-}" ]]; then
  codesign --force --deep --options runtime --timestamp \
    --identifier "$APP_BUNDLE_ID" \
    --sign "$CODESIGN_IDENTITY" \
    "$TEMP_APP_PATH"
  echo "codesign: Developer ID identity '$CODESIGN_IDENTITY'"
else
  codesign --force --deep \
    --identifier "$APP_BUNDLE_ID" \
    --sign - \
    "$TEMP_APP_PATH"
  echo "codesign: ad-hoc (local distribution)"
fi

codesign --verify --deep --strict "$TEMP_APP_PATH"
test -f "$TEMP_APP_PATH/Contents/_CodeSignature/CodeResources"

rm -rf "$APP_PATH"
mkdir -p "$DIST_DIR"
ditto --norsrc --noextattr "$TEMP_APP_PATH" "$APP_PATH"
codesign --verify --deep --strict "$APP_PATH"

echo "Build complete: $APP_PATH"
if [[ -z "${CODESIGN_IDENTITY:-}" ]]; then
  echo "Not notarized: downloaded builds still require macOS security approval."
fi
