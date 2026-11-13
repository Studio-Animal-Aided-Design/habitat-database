#!/usr/bin/env python3
"""Write signed-in build provenance without environment variables or credentials."""
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import platform
import subprocess
import sys


def build_info(root: Path, app_version: str) -> dict:
    def git(*args: str) -> str:
        return subprocess.check_output(["git", *args], cwd=root, text=True).strip()

    return {
        "version": app_version,
        "builtAt": datetime.now(timezone.utc).isoformat(),
        "revision": git("rev-parse", "HEAD"),
        "dirty": bool(git("status", "--porcelain", "--untracked-files=no")),
        "python": platform.python_version(),
        "architecture": platform.machine(),
        "dependencies": {name: version(name) for name in
                         ("pandas", "openpyxl", "customtkinter", "Pillow", "pyinstaller")},
        "sourceFiles": {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
                        for path in sorted((root / "converter_app").rglob("*.py"))},
    }


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    Path(sys.argv[1]).write_text(json.dumps(build_info(root, sys.argv[2]), indent=2) + "\n")
