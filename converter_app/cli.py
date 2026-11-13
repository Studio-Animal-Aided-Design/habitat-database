from __future__ import annotations

import argparse
import json
from pathlib import Path

from .api_client import ImportApiClient, collect_import_files
from .models import RunConfig
from .pipeline import run_pipeline
from .reporting import write_html_report, write_json_report
from .tooljet_guide import write_tooljet_guide


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="AAD Tooljet Converter")
    p.add_argument("--input-root", default="data", help="Pfad zu den Quelldaten")
    p.add_argument("--output-root", default="dist/conversion-output", help="Pfad für Ausgaben")
    p.add_argument("--config-json", default=None, help="Optionaler Pfad zu Run Config JSON")
    p.add_argument("--publish-dry-run", action="store_true", help="Ergebnisdateien als Dry-Run an die App senden")
    p.add_argument("--apply-run", default=None, metavar="RUN_ID", help="Vorhandenen Dry-Run anwenden")
    p.add_argument("--approve", action="store_true", help="Explizite Bestätigung für --apply-run")
    p.add_argument("--api-url", default=None, help="App-Basis-URL; Standard: AAD_IMPORT_API_URL")
    return p.parse_args()


def load_config(args: argparse.Namespace) -> RunConfig:
    if args.config_json:
        payload = json.loads(Path(args.config_json).read_text(encoding="utf-8"))
        return RunConfig(**payload)
    return RunConfig(input_root=args.input_root, output_root=args.output_root)


def main() -> int:
    args = parse_args()
    if args.apply_run:
        if not args.approve:
            print("Abbruch: --apply-run erfordert die explizite Option --approve.")
            return 2
        client = ImportApiClient(base_url=args.api_url)
        current = client.get_status(args.apply_run)
        applied = client.apply(args.apply_run, current["manifestChecksum"])
        print(json.dumps(applied, ensure_ascii=False, indent=2))
        return 0

    cfg = load_config(args)

    def progress(line: str) -> None:
        print(line)

    result = run_pipeline(cfg, progress_cb=progress)
    out = Path(cfg.output_root)
    out.mkdir(parents=True, exist_ok=True)

    json_report = write_json_report(result, out)
    html_report = write_html_report(result, out)
    guide = write_tooljet_guide(result, out)

    print(f"Gesamtstatus: {result.overall_status}")
    print(f"JSON: {json_report}")
    print(f"HTML: {html_report}")
    print(f"Guide: {guide}")

    if args.publish_dry_run and result.overall_status in {"success", "warning"}:
        files = collect_import_files(cfg.output_root, cfg.input_root)
        dry_run = ImportApiClient(base_url=args.api_url).dry_run(files)
        print("App-Dry-Run:")
        print(json.dumps(dry_run, ensure_ascii=False, indent=2))

    return 0 if result.overall_status in {"success", "warning"} else 2


if __name__ == "__main__":
    raise SystemExit(main())
