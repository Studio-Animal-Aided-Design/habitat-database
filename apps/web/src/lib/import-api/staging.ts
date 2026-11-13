import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ImportApiConfig } from "./config";
import { ImportApiError } from "./errors";
import { parseImportForm } from "./files";

export type StagedImport = {
  runId: string;
  stagingKey: string;
  runRoot: string;
  mode: "merge" | "sync";
};

export function resolveStagedRunRoot(stagingRoot: string, stagingKey: string): string {
  if (!/^[0-9a-f-]{36}$/.test(stagingKey)) throw new ImportApiError(500, "invalid_staging_key", "Der gespeicherte Staging-Schlüssel ist ungültig.");
  return path.join(stagingRoot, stagingKey);
}

export async function stageImportForm(formData: FormData, config: ImportApiConfig): Promise<StagedImport> {
  const { files, mode } = parseImportForm(formData, config.maxFiles, config.maxUploadBytes);
  const runId = randomUUID();
  const temporaryRoot = path.join(config.stagingRoot, `${runId}.uploading`);
  const runRoot = path.join(config.stagingRoot, runId);
  await mkdir(config.stagingRoot, { recursive: true });
  await mkdir(temporaryRoot, { recursive: false });
  try {
    for (const item of files) {
      const destination = path.join(temporaryRoot, item.logicalPath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, Buffer.from(await item.file.arrayBuffer()), { flag: "wx" });
    }
    await rename(temporaryRoot, runRoot);
    return { runId, stagingKey: runId, runRoot, mode };
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function removeStagedRun(stagingRoot: string, stagingKey: string): Promise<void> {
  await rm(resolveStagedRunRoot(stagingRoot, stagingKey), { recursive: true, force: true });
}
