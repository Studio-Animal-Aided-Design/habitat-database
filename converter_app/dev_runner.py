from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

WATCH_DIRS = [
    "converter_app",
]
WATCH_EXTS = {".py", ".md", ".toml"}


def snapshot_mtimes(root: Path) -> dict[Path, float]:
    mtimes: dict[Path, float] = {}
    for rel in WATCH_DIRS:
        d = root / rel
        if not d.exists():
            continue
        for p in d.rglob("*"):
            if p.is_file() and p.suffix in WATCH_EXTS and "__pycache__" not in p.parts:
                try:
                    mtimes[p] = p.stat().st_mtime
                except FileNotFoundError:
                    pass
    return mtimes


def changed(before: dict[Path, float], after: dict[Path, float]) -> list[Path]:
    out: list[Path] = []
    keys = set(before) | set(after)
    for k in keys:
        if before.get(k) != after.get(k):
            out.append(k)
    return sorted(out)


def stop_process(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()


def run() -> int:
    root = Path(__file__).resolve().parents[1]
    os.chdir(root)

    print("[DEV] Starte GUI Dev-Mode (Auto-Restart bei Dateiänderung)")
    print("[DEV] Beenden mit Ctrl+C")

    proc = subprocess.Popen([sys.executable, "-m", "converter_app.gui"])
    prev = snapshot_mtimes(root)

    try:
        while True:
            time.sleep(0.7)

            if proc.poll() is not None:
                print("[DEV] GUI Prozess beendet. Starte neu...")
                proc = subprocess.Popen([sys.executable, "-m", "converter_app.gui"])
                prev = snapshot_mtimes(root)
                continue

            now = snapshot_mtimes(root)
            diffs = changed(prev, now)
            if diffs:
                print("[DEV] Änderung erkannt:")
                for p in diffs[:8]:
                    print(f"  - {p.relative_to(root)}")
                if len(diffs) > 8:
                    print(f"  ... +{len(diffs)-8} weitere")
                print("[DEV] Starte GUI neu...")
                stop_process(proc)
                proc = subprocess.Popen([sys.executable, "-m", "converter_app.gui"])
                prev = snapshot_mtimes(root)
                continue

            prev = now
    except KeyboardInterrupt:
        print("\n[DEV] Stoppe Dev-Mode...")
        stop_process(proc)
        return 0


if __name__ == "__main__":
    raise SystemExit(run())
