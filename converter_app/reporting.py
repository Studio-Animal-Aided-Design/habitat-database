from __future__ import annotations

import json
from pathlib import Path

from .models import RunResult


def write_json_report(run_result: RunResult, output_root: Path) -> Path:
    path = output_root / "conversion-report.json"
    path.write_text(json.dumps(run_result.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def write_html_report(run_result: RunResult, output_root: Path) -> Path:
    path = output_root / "conversion-report.html"
    blocks = []
    for stage in run_result.stage_results:
        issues_html = "".join(
            f"<li><b>{i.severity}</b> [{i.reason_code}] {i.message}</li>" for i in stage.issues
        ) or "<li>Keine</li>"
        files_html = "".join(f"<li>{f}</li>" for f in stage.produced_files) or "<li>Keine</li>"
        counts = "<br>".join(f"{k}: {v}" for k, v in stage.row_counts.items()) or "-"
        blocks.append(
            f"""
            <section>
              <h3>{stage.stage} ({stage.status})</h3>
              <p><b>Zeilen:</b><br>{counts}</p>
              <p><b>Ausgabedateien:</b></p><ul>{files_html}</ul>
              <p><b>Probleme:</b></p><ul>{issues_html}</ul>
            </section>
            """
        )
    html = f"""
<!doctype html>
<html lang=\"de\">
<head>
<meta charset=\"utf-8\" />
<title>Konvertierungsbericht</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; }}
section {{ border: 1px solid #ddd; padding: 16px; border-radius: 8px; margin-bottom: 12px; }}
.badge {{ display:inline-block;padding:4px 10px;border-radius:99px;background:#efefef; }}
</style>
</head>
<body>
<h1>Konvertierungsbericht</h1>
<p>Status: <span class=\"badge\">{run_result.overall_status}</span></p>
<p>Start: {run_result.started_at}<br>Ende: {run_result.finished_at}</p>
{''.join(blocks)}
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")
    return path
