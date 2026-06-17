from __future__ import annotations

import argparse
import json
from pathlib import Path

from .models import RunConfig
from .pipeline import run_pipeline
from .reporting import write_html_report, write_json_report
from .tooljet_guide import write_tooljet_guide


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="AAD Tooljet Converter")
    p.add_argument("--input-root", default="data", help="Pfad zu den Quelldaten")
    p.add_argument("--output-root", default="dist/conversion-output", help="Pfad für Ausgaben")
    p.add_argument("--config-json", default=None, help="Optionaler Pfad zu Run Config JSON")
    return p.parse_args()


def load_config(args: argparse.Namespace) -> RunConfig:
    if args.config_json:
        payload = json.loads(Path(args.config_json).read_text(encoding="utf-8"))
        return RunConfig(**payload)
    return RunConfig(input_root=args.input_root, output_root=args.output_root)


def main() -> int:
    args = parse_args()
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

    return 0 if result.overall_status in {"success", "warning"} else 2


if __name__ == "__main__":
    raise SystemExit(main())
