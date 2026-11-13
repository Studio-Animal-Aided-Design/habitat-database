import type pg from "pg";
import type { ImportReport } from "./report";
import type { SourceFile } from "./snapshot";
import type { SyncMode } from "./sync";

export type ImportRunStatus =
  | "dry_run_succeeded"
  | "applying"
  | "applied"
  | "apply_failed"
  | "expired";

export interface ImportRunRecord {
  id: string;
  manifestChecksum: string;
  mode: SyncMode;
  status: ImportRunStatus;
  stagingKey: string;
  report: ImportReport;
  expiresAt: string;
  dryRunIdempotencyKey: string | null;
  applyIdempotencyKey: string | null;
  startedAt: string;
  finishedAt: string | null;
}

type ImportRunRow = {
  id: string;
  manifest_checksum: string;
  mode: SyncMode;
  status: ImportRunStatus;
  staging_key: string;
  report: ImportReport;
  expires_at: Date;
  dry_run_idempotency_key: string | null;
  apply_idempotency_key: string | null;
  started_at: Date;
  finished_at: Date | null;
};

const mapRun = (row: ImportRunRow): ImportRunRecord => ({
  id: row.id,
  manifestChecksum: row.manifest_checksum,
  mode: row.mode,
  status: row.status,
  stagingKey: row.staging_key,
  report: row.report,
  expiresAt: row.expires_at.toISOString(),
  dryRunIdempotencyKey: row.dry_run_idempotency_key,
  applyIdempotencyKey: row.apply_idempotency_key,
  startedAt: row.started_at.toISOString(),
  finishedAt: row.finished_at?.toISOString() ?? null,
});

const selectRun = `SELECT id, manifest_checksum, mode, status, staging_key, report,
  expires_at, dry_run_idempotency_key, apply_idempotency_key, started_at, finished_at
  FROM import_runs`;

export async function getImportRun(client: pg.PoolClient, runId: string): Promise<ImportRunRecord | null> {
  const result = await client.query<ImportRunRow>(`${selectRun} WHERE id = $1`, [runId]);
  return result.rows[0] ? mapRun(result.rows[0]) : null;
}

export async function findImportRunByIdempotencyKey(
  client: pg.PoolClient,
  key: string,
): Promise<ImportRunRecord | null> {
  const result = await client.query<ImportRunRow>(
    `${selectRun} WHERE dry_run_idempotency_key = $1`,
    [key],
  );
  return result.rows[0] ? mapRun(result.rows[0]) : null;
}

export async function createDryRun(
  client: pg.PoolClient,
  input: {
    id: string;
    manifestChecksum: string;
    mode: SyncMode;
    stagingKey: string;
    report: ImportReport;
    sourceFiles: SourceFile[];
    expiresAt: Date;
    idempotencyKey: string;
  },
): Promise<ImportRunRecord> {
  await client.query("BEGIN");
  try {
    const inserted = await client.query<ImportRunRow>(
      `INSERT INTO import_runs(
        id, manifest_checksum, mode, status, source_root, staging_key, report,
        expires_at, dry_run_idempotency_key, finished_at
      ) VALUES ($1,$2,$3,'dry_run_succeeded',$4,$5,$6::jsonb,$7,$8,NULL)
      RETURNING id, manifest_checksum, mode, status, staging_key, report, expires_at,
        dry_run_idempotency_key, apply_idempotency_key, started_at, finished_at`,
      [
        input.id,
        input.manifestChecksum,
        input.mode,
        `staging:${input.stagingKey}`,
        input.stagingKey,
        JSON.stringify(input.report),
        input.expiresAt,
        input.idempotencyKey,
      ],
    );
    for (const file of input.sourceFiles) {
      await client.query(
        "INSERT INTO import_files(import_run_id,path,checksum,row_count) VALUES ($1,$2,$3,$4)",
        [input.id, file.path, file.checksum, file.rowCount],
      );
    }
    await client.query(
      "INSERT INTO audit_events(action,entity_type,entity_id,details) VALUES ('import.dry_run','import_run',$1,$2::jsonb)",
      [input.id, JSON.stringify({ manifestChecksum: input.manifestChecksum, mode: input.mode })],
    );
    await client.query("COMMIT");
    return mapRun(inserted.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function markImportRunFailed(
  client: pg.PoolClient,
  runId: string,
  code: string,
): Promise<void> {
  await client.query(
    "UPDATE import_runs SET status='apply_failed', updated_at=now() WHERE id=$1 AND status <> 'applied'",
    [runId],
  );
  await recordImportAudit(client, "import.apply_failed", runId, { code });
}

export async function markImportRunExpired(client: pg.PoolClient, runId: string): Promise<void> {
  await client.query(
    "UPDATE import_runs SET status='expired', updated_at=now() WHERE id=$1 AND status IN ('dry_run_succeeded','apply_failed')",
    [runId],
  );
  await recordImportAudit(client, "import.expired", runId);
}

export async function recordImportAudit(
  client: pg.PoolClient,
  action: string,
  runId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await client.query(
    "INSERT INTO audit_events(action,entity_type,entity_id,details) VALUES ($1,'import_run',$2,$3::jsonb)",
    [action, runId, JSON.stringify(details)],
  );
}
