ALTER TABLE import_runs DROP CONSTRAINT IF EXISTS import_runs_status_check;
ALTER TABLE import_runs ALTER COLUMN finished_at DROP NOT NULL;
ALTER TABLE import_runs ALTER COLUMN finished_at DROP DEFAULT;

ALTER TABLE import_runs
  ADD COLUMN IF NOT EXISTS staging_key text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS dry_run_idempotency_key text,
  ADD COLUMN IF NOT EXISTS apply_idempotency_key text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE import_runs
SET staging_key = COALESCE(staging_key, 'legacy:' || id::text),
    expires_at = COALESCE(expires_at, finished_at, started_at),
    status = CASE WHEN status = 'failed' THEN 'apply_failed' ELSE status END;

ALTER TABLE import_runs ALTER COLUMN staging_key SET NOT NULL;
ALTER TABLE import_runs ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE import_runs
  ADD CONSTRAINT import_runs_status_check
  CHECK (status IN ('dry_run_succeeded', 'applying', 'applied', 'apply_failed', 'expired'));

CREATE UNIQUE INDEX IF NOT EXISTS import_runs_dry_run_idempotency_idx
  ON import_runs(dry_run_idempotency_key)
  WHERE dry_run_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS import_runs_apply_idempotency_idx
  ON import_runs(apply_idempotency_key)
  WHERE apply_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS import_runs_expiry_idx ON import_runs(status, expires_at);
