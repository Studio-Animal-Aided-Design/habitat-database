#!/bin/bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <release.zip>" >&2
  exit 2
fi

ZIP_PATH="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
APP_NAME="AAD-Tooljet-Converter"
VERIFY_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/aad-converter-verify.XXXXXX")"

cleanup() {
  rm -rf "$VERIFY_ROOT"
}
trap cleanup EXIT

unzip -t "$ZIP_PATH" >/dev/null
ditto -x -k "$ZIP_PATH" "$VERIFY_ROOT"

APP_PATH="$(find "$VERIFY_ROOT" -type d -name "${APP_NAME}.app" -print -quit)"
if [[ -z "$APP_PATH" ]]; then
  echo "No ${APP_NAME}.app found in $ZIP_PATH" >&2
  exit 1
fi

test -x "$APP_PATH/Contents/MacOS/$APP_NAME"
test -f "$APP_PATH/Contents/Info.plist"
test -f "$APP_PATH/Contents/_CodeSignature/CodeResources"
plutil -lint "$APP_PATH/Contents/Info.plist" >/dev/null
codesign --verify --deep --strict "$APP_PATH"

BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PATH/Contents/Info.plist")"
VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist")"
ARCHITECTURES="$(lipo -archs "$APP_PATH/Contents/MacOS/$APP_NAME")"
python3 - "$APP_PATH/Contents/Resources/build-info.json" "$VERSION" <<'PY'
import json
from pathlib import Path
import sys
info = json.loads(Path(sys.argv[1]).read_text())
assert info["version"] == sys.argv[2], "Build metadata version mismatch"
for module in ("api_client", "import_settings", "gui"):
    assert f"converter_app/{module}.py" in info["sourceFiles"], f"Missing source provenance: {module}"
print(f"Source revision: {info['revision']} (dirty={info['dirty']})")
PY

echo "Release verification: OK"
echo "Bundle ID: $BUNDLE_ID"
echo "Version:   $VERSION"
echo "Arch:      $ARCHITECTURES"

if [[ "${REQUIRE_NOTARIZATION:-0}" == "1" ]]; then
  spctl --assess --type execute --verbose=4 "$APP_PATH"
else
  spctl --assess --type execute "$APP_PATH" >/dev/null 2>&1 \
    || echo "Notarization: not present (expected for ad-hoc builds)"
fi
