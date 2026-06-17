#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

export PYINSTALLER_CONFIG_DIR="$(pwd)/.pyinstaller-cache"
mkdir -p "$PYINSTALLER_CONFIG_DIR"
export COPYFILE_DISABLE=1

APP_NAME="AAD-Tooljet-Converter"
DIST_DIR="dist"
BUILD_DIR="build"
SPEC_DIR="build"
APP_PATH="$DIST_DIR/$APP_NAME.app"
APP_ICON_ICNS="$(pwd)/assets/aad-icon.icns"
SPEC_PATH="$SPEC_DIR/$APP_NAME.spec"

python3 -m pip install -r requirements-converter.txt pyinstaller

./scripts/build_app_icon.sh

rm -f "$SPEC_PATH"

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
  --distpath "$DIST_DIR" \
  --workpath "$BUILD_DIR" \
  --specpath "$SPEC_DIR" \
  converter_app/gui_main.py

# Cleanup metadata that can break codesign on some macOS setups
find "$APP_PATH" -name '._*' -type f -delete || true
xattr -cr "$APP_PATH" || true

# Best effort signing/verification for local distribution; do not fail build if signing fails.
if codesign --force --deep --sign - "$APP_PATH"; then
  echo "codesign: OK"
  codesign --verify --deep --strict "$APP_PATH" && echo "codesign verify: OK"
else
  echo "codesign: warning (build remains usable locally)"
fi
spctl --assess --type execute "$APP_PATH" >/dev/null 2>&1 || echo "spctl assess: warning (expected for unsigned/notarized app)"

echo "Build complete: $APP_PATH"
echo "If app is blocked on first launch: right-click app -> Open"
