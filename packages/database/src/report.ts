import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Snapshot } from "./snapshot.js";

export interface DatasetDiff { incoming: number; inserted: number; updated: number; unchanged: number; removedOrArchived: number }
export interface ImportReport {
  generatedAt: string;
  manifestChecksum: string;
  mode: "merge" | "sync";
  applied: boolean;
  sourceFiles: Snapshot["files"];
  datasets: Record<string, DatasetDiff>;
  diagnostics: Snapshot["diagnostics"];
}

const escape = (value: unknown): string => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export async function writeReport(report: ImportReport, outputDirectory: string): Promise<{ json: string; html: string }> {
  await mkdir(outputDirectory, { recursive: true });
  const stem = `import-${report.manifestChecksum.slice(0, 12)}-${report.applied ? "applied" : "dry-run"}`;
  const json = path.join(outputDirectory, `${stem}.json`);
  const html = path.join(outputDirectory, `${stem}.html`);
  await writeFile(json, `${JSON.stringify(report, null, 2)}\n`);
  const datasetRows = Object.entries(report.datasets).map(([name, diff]) => `<tr><td>${escape(name)}</td><td>${diff.incoming}</td><td>${diff.inserted}</td><td>${diff.updated}</td><td>${diff.unchanged}</td><td>${diff.removedOrArchived}</td></tr>`).join("");
  const diagnostics = report.diagnostics.map((item) => `<li><strong>${escape(item.severity)} / ${escape(item.code)}</strong>: ${escape(item.message)}<br><small>${item.sources.map(escape).join(", ")}</small></li>`).join("");
  await writeFile(html, `<!doctype html><html lang="en"><meta charset="utf-8"><title>AAD import report</title><style>body{font:16px system-ui;max-width:1100px;margin:3rem auto;padding:0 1rem;color:#173c32}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd8d2;padding:.6rem;text-align:left}li{margin:.6rem 0}.warning{color:#795d00}</style><h1>CSV import ${report.applied ? "apply" : "dry run"}</h1><p><strong>Manifest:</strong> <code>${escape(report.manifestChecksum)}</code><br><strong>Mode:</strong> ${report.mode}</p><h2>Diff</h2><table><thead><tr><th>Dataset</th><th>Incoming</th><th>Insert</th><th>Update</th><th>Unchanged</th><th>Remove/archive</th></tr></thead><tbody>${datasetRows}</tbody></table><h2>Diagnostics (${report.diagnostics.length})</h2><ul>${diagnostics}</ul></html>`);
  return { json, html };
}
