import { revalidatePath } from "next/cache";
import {
  applySync,
  buildSnapshot,
  createDryRun,
  findImportRunByIdempotencyKey,
  getImportRun,
  markImportRunExpired,
  markImportRunFailed,
  planSync,
  SnapshotValidationError,
  withDatabase,
  type ImportRunRecord,
} from "@aad/database";
import { authenticateImportRequest, requireIdempotencyKey } from "./auth";
import { resolveImportApiConfig, type ImportApiConfig } from "./config";
import { ImportApiError } from "./errors";
import { removeStagedRun, resolveStagedRunRoot, stageImportForm } from "./staging";

async function authorize(request: Request): Promise<ImportApiConfig> {
  const config = resolveImportApiConfig();
  if (!config.enabled || !config.tokenHash) {
    throw new ImportApiError(404, "not_found", "Die Import-API ist in dieser Umgebung nicht aktiviert.");
  }
  await authenticateImportRequest(request, config.tokenHash);
  return config;
}

function assertRequestSize(request: Request, config: ImportApiConfig): void {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > config.maxUploadBytes + 1024 * 1024) {
    throw new ImportApiError(413, "upload_too_large", `Der Upload darf höchstens ${config.maxUploadBytes} Byte CSV-Daten enthalten.`);
  }
}

export async function createImportDryRun(request: Request): Promise<ImportRunRecord> {
  const config = await authorize(request);
  assertRequestSize(request, config);
  const idempotencyKey = requireIdempotencyKey(request);
  const existing = await withDatabase((client) => findImportRunByIdempotencyKey(client, idempotencyKey));
  if (existing) return existing;

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new ImportApiError(415, "unsupported_media_type", "Der Dry-Run erwartet multipart/form-data.");
  }

  let staged: Awaited<ReturnType<typeof stageImportForm>> | null = null;
  try {
    staged = await stageImportForm(await request.formData(), config);
    const expiresAt = new Date(Date.now() + config.runTtlSeconds * 1000);
    return await withDatabase(async (client) => {
      const { report } = await planSync(client, staged!.runRoot, staged!.mode);
      return createDryRun(client, {
        id: staged!.runId,
        manifestChecksum: report.manifestChecksum,
        mode: staged!.mode,
        stagingKey: staged!.stagingKey,
        report,
        sourceFiles: report.sourceFiles,
        expiresAt,
        idempotencyKey,
      });
    });
  } catch (error) {
    if (staged) await removeStagedRun(config.stagingRoot, staged.stagingKey);
    if (error instanceof SnapshotValidationError) {
      throw new ImportApiError(422, "validation_failed", "Die CSV-Dateien enthalten blockierende Validierungsfehler.", error.diagnostics);
    }
    throw error;
  }
}

export async function getImportStatus(request: Request, runId: string): Promise<ImportRunRecord> {
  const config = await authorize(request);
  const run = await withDatabase((client) => getImportRun(client, runId));
  if (!run) throw new ImportApiError(404, "run_not_found", "Der Importlauf wurde nicht gefunden.");
  if (run.status !== "applied" && run.status !== "expired" && Date.parse(run.expiresAt) <= Date.now()) {
    await withDatabase((client) => markImportRunExpired(client, run.id));
    await removeStagedRun(config.stagingRoot, run.stagingKey);
    return { ...run, status: "expired" };
  }
  return run;
}

export async function applyImportRun(
  request: Request,
  runId: string,
  expectedManifestChecksum: string,
): Promise<ImportRunRecord> {
  const config = await authorize(request);
  const idempotencyKey = requireIdempotencyKey(request);
  const run = await withDatabase((client) => getImportRun(client, runId));
  if (!run) throw new ImportApiError(404, "run_not_found", "Der Importlauf wurde nicht gefunden.");
  if (!expectedManifestChecksum || expectedManifestChecksum !== run.manifestChecksum) {
    throw new ImportApiError(409, "manifest_checksum_mismatch", "Die bestätigte Prüfsumme stimmt nicht mit dem Dry-Run überein.");
  }
  if (run.status === "applied") return run;
  if (run.status === "expired" || Date.parse(run.expiresAt) <= Date.now()) {
    await withDatabase((client) => markImportRunExpired(client, run.id));
    await removeStagedRun(config.stagingRoot, run.stagingKey);
    throw new ImportApiError(410, "run_expired", "Dieser Importlauf ist abgelaufen. Bitte einen neuen Dry-Run starten.");
  }

  const runRoot = resolveStagedRunRoot(config.stagingRoot, run.stagingKey);
  try {
    const snapshot = await buildSnapshot(runRoot);
    if (snapshot.manifestChecksum !== run.manifestChecksum) {
      throw new ImportApiError(409, "staged_files_changed", "Die bereitgestellten CSV-Dateien haben sich seit dem Dry-Run geändert.");
    }
    const report = await withDatabase((client) => applySync(client, snapshot, run.report, {
      runId: run.id,
      applyIdempotencyKey: idempotencyKey,
      sourceRoot: `staging:${run.stagingKey}`,
    }));
    revalidatePath("/", "layout");
    await removeStagedRun(config.stagingRoot, run.stagingKey);
    return { ...run, status: "applied", report, applyIdempotencyKey: idempotencyKey, finishedAt: new Date().toISOString() };
  } catch (error) {
    if (!(error instanceof ImportApiError) || error.code !== "staged_files_changed") {
      await withDatabase((client) => markImportRunFailed(client, run.id, error instanceof Error ? error.name : "unknown_error"));
    }
    if (error instanceof SnapshotValidationError) {
      throw new ImportApiError(422, "validation_failed", "Die bereitgestellten CSV-Dateien sind nicht mehr gültig.", error.diagnostics);
    }
    if (error instanceof ImportApiError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (/expired/i.test(message)) throw new ImportApiError(410, "run_expired", "Dieser Importlauf ist abgelaufen.");
    if (/checksum|claimed|status/i.test(message)) throw new ImportApiError(409, "run_conflict", "Der Importlauf kann in seinem aktuellen Zustand nicht angewendet werden.");
    throw error;
  }
}
