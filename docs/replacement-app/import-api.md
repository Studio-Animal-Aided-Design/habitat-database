# Secure converter import API

Issue #107 connects the local converter to the replacement app without adding another server. The
API consists of Next.js Route Handlers in the existing Node.js runtime. They call the private
`@aad/database` package for the same validation, dry-run diff and transactional apply logic used by
the database CLI.

## Safety model

- The API is absent by default and returns `404` unless `IMPORT_API_ENABLED=true`.
- Enabling requires the PostgreSQL catalogue adapter and a database URL. Render's mock-backed pull
  request previews therefore remain read-only and receive no import secret.
- Clients send one bearer token. The server stores only a scrypt hash, limits repeated failed
  attempts per client address and never includes the token in logs or responses.
- Multipart field names carry allow-listed repository-relative CSV paths. Uploaded filenames never
  determine a server path; unexpected paths, duplicates, missing dataset groups, oversized batches
  and excessive file counts are rejected.
- Dry-run bytes are written to one UUID-named staging directory. Apply rebuilds and re-hashes that
  exact snapshot and runs all canonical writes in one PostgreSQL transaction.
- Both mutating requests require an `Idempotency-Key`. Apply additionally requires the reviewed
  manifest checksum in its JSON body.
- Successful apply revalidates the public Next.js route tree and removes the staged files. Run
  metadata, checksums, report, mappings and audit events remain in PostgreSQL.

## Endpoints

| Method and path | Purpose | Body |
| --- | --- | --- |
| `POST /api/imports/dry-run` | Stage and validate one complete CSV snapshot | `multipart/form-data`; `mode=merge|sync`; each file field is `file:<allowed-path>` |
| `GET /api/imports/{runId}` | Read status, checksum, diff and diagnostics | none |
| `POST /api/imports/{runId}/apply` | Apply the exact reviewed snapshot | JSON `{ "manifestChecksum": "..." }` |

All responses set `Cache-Control: no-store`. Errors have a stable `error.code`, a German operator
message and structured diagnostics with severity, blocking flag, file and row where available.

## Local installation and configuration

Start PostgreSQL, install both Node packages and apply migrations:

```bash
docker compose up -d postgres
cd packages/database
npm install
npm run db:migrate
cd ../../apps/web
npm install
```

Generate a high-entropy token, keep the plaintext only in the converter environment, and store its
hash in `apps/web/.env.local`:

```bash
export AAD_IMPORT_API_TOKEN="$(openssl rand -base64 32)"
npm run import:hash-token
```

Copy the printed hash—not the plaintext token—into this local configuration:

```dotenv
APP_ENV=development
CATALOG_DATA_SOURCE=postgres
DATABASE_URL=postgresql://aad:aad-local-only@localhost:5432/aad_habitat
IMPORT_API_ENABLED=true
IMPORT_API_TOKEN_HASH=scrypt$...
IMPORT_STAGING_ROOT=.local/import-staging
```

Start the web app:

```bash
npm run dev
```

In another terminal, reuse the plaintext token and point the converter at the app:

```bash
export AAD_IMPORT_API_URL=http://localhost:3000
export AAD_IMPORT_API_TOKEN='<same plaintext token>'
python3 -m converter_app.cli \
  --input-root data \
  --output-root dist/conversion-output \
  --publish-dry-run
```

The command prints the run ID, checksum, dataset diff and diagnostics. Apply only after review:

```bash
python3 -m converter_app.cli --apply-run <run-id> --approve
```

The GUI uses the same environment variables and offers **„An App senden“** in the main toolbar and
wizard result step. It always performs a dry run first and opens a separate confirmation dialog for
apply.

## Staging storage

`IMPORT_STAGING_ROOT` is an ordinary directory writable by the operating-system user running
Next.js. Locally it defaults to `.local/import-staging` below the web process working directory and
is ignored by Git. In a container it must point to the mounted persistent staging volume, planned as
`/var/lib/aad/import-staging`.

The volume is not the canonical database and is not a backup. It only preserves the reviewed upload
between dry-run and apply/retry. Runs expire after `IMPORT_RUN_TTL_SECONDS` (24 hours by default), at
which point the staged directory can be deleted. Preview and production must use separate volumes
and databases.

## Environment variables

| Variable | Meaning | Default |
| --- | --- | --- |
| `IMPORT_API_ENABLED` | Explicit feature switch | `false` |
| `IMPORT_API_TOKEN_HASH` | scrypt hash of converter bearer token | none |
| `IMPORT_STAGING_ROOT` | Writable staging directory/volume mount | `.local/import-staging` |
| `IMPORT_MAX_UPLOAD_BYTES` | Maximum total CSV bytes | `26214400` |
| `IMPORT_MAX_FILES` | Maximum files per snapshot | `128` |
| `IMPORT_RUN_TTL_SECONDS` | Dry-run lifetime | `86400` |

Client-only variables are `AAD_IMPORT_API_URL` and `AAD_IMPORT_API_TOKEN`. Do not place the plaintext
token in repository files, converter JSON configurations, screenshots or support reports.

## Operational checks

1. Confirm `GET /health` succeeds and the catalogue uses PostgreSQL.
2. Run the converter and review its local report before uploading.
3. Review API diagnostics and every `removedOrArchived` count, especially in `sync` mode.
4. Apply only the checksum returned by that run.
5. Reload a representative public page and confirm the expected change.
6. Query `import_runs`, `import_files` and `audit_events` when investigating a failure; never expose
   their details on public routes.

For a container deployment, the app image, named volume, secrets and cleanup procedure are part of
the IONOS deployment template and operator handbook tracked separately by #105/#117.
