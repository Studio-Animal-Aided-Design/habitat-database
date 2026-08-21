import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, withDatabase } from "./database.js";
import { applySync, persistReport, planSync, type SyncMode } from "./sync.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const [command, ...args] = process.argv.slice(2);

function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

await withDatabase(async (client) => {
  await migrate(client);
  if (command === "migrate") {
    console.log("Database migrations are current.");
    return;
  }
  if (command !== "sync") throw new Error("Usage: cli.ts migrate | sync --dry-run | sync --apply --approve <manifest> [--mode merge|sync]");
  const mode = (option("--mode") ?? "merge") as SyncMode;
  if (!(["merge","sync"] as string[]).includes(mode)) throw new Error("--mode must be merge or sync");
  const { snapshot, report } = await planSync(client, repoRoot, mode);
  if (args.includes("--dry-run")) {
    const files = await persistReport(report, repoRoot);
    console.log(JSON.stringify({ manifestChecksum: snapshot.manifestChecksum, report: files, datasets: report.datasets, diagnostics: report.diagnostics.length }, null, 2));
    return;
  }
  if (!args.includes("--apply")) throw new Error("Choose --dry-run or --apply");
  const approved = option("--approve");
  if (approved !== snapshot.manifestChecksum) throw new Error(`Apply requires --approve ${snapshot.manifestChecksum} from a reviewed dry run.`);
  const applied = await applySync(client, snapshot, report);
  const files = await persistReport(applied, repoRoot);
  console.log(JSON.stringify({ manifestChecksum: snapshot.manifestChecksum, applied: true, report: files }, null, 2));
});
