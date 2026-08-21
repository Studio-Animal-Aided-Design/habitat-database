import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string> & { __file: string; __row: string };

export const clean = (value?: string): string | null => {
  const normalized = value?.replace(/^\uFEFF/, "").trim();
  return normalized ? normalized : null;
};

export const key = (value?: string): string =>
  clean(value)?.normalize("NFKC").toLocaleLowerCase("de-DE") ?? "";

export const bool = (value?: string): boolean | null => {
  const normalized = key(value);
  if (!normalized) return null;
  if (["true", "yes", "ja", "1"].includes(normalized)) return true;
  if (["false", "no", "nein", "0"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: ${value}`);
};

export const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const semanticKey = (...values: Array<string | null | undefined>): string =>
  hash(values.map((value) => key(value ?? "")).join("\u001f"));

export async function findCsvFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.name.endsWith(".csv") && absolute.includes(`${path.sep}import${path.sep}out${path.sep}`)) result.push(absolute);
    }
  }
  await visit(root);
  return result.sort();
}

export async function readCsv(file: string, root: string, expectedHeaders: string[]): Promise<{ rows: CsvRow[]; checksum: string }> {
  const contents = await readFile(file, "utf8");
  const records = parse(contents.replace(/^\uFEFF/, ""), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as Record<string, string>[];
  const actualHeaders = records.length ? Object.keys(records[0]) : [];
  if (actualHeaders.join("\u001f") !== expectedHeaders.join("\u001f")) {
    throw new Error(`Unexpected headers in ${path.relative(root, file)}\nExpected: ${expectedHeaders.join(",")}\nActual: ${actualHeaders.join(",")}`);
  }
  return {
    rows: records.map((row, index) => ({ ...row, __file: path.relative(root, file), __row: String(index + 2) })),
    checksum: hash(contents),
  };
}

export function completeness(row: Record<string, string>, ignored = ["id"]): number {
  return Object.entries(row).filter(([name, value]) => !name.startsWith("__") && !ignored.includes(name) && clean(value)).length;
}
