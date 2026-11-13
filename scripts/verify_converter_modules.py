#!/usr/bin/env python3
"""Inspect the frozen archive without launching the GUI or accessing Keychain."""
from pathlib import Path
import sys

from PyInstaller.archive.readers import CArchiveReader

archive = CArchiveReader(str(Path(sys.argv[1])))
modules = archive.open_embedded_archive("PYZ.pyz").toc
for name in ("converter_app.api_client", "converter_app.import_settings", "converter_app.gui"):
    if name not in modules:
        raise SystemExit(f"Frozen app is missing {name}")
print("Frozen API client, import settings and GUI modules: OK")
