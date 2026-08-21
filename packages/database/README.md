# AAD database and CSV synchronization

This package owns the PostgreSQL schema and the repeatable import of the repository's authoritative `data/**/import/out/*.csv` files. It does not modify the converter or the source CSV files.

## Local database

From the repository root:

```bash
docker compose up -d postgres
cd packages/database
npm install
npm run db:migrate
```

The default development URL is `postgresql://aad:aad-local-only@localhost:5432/aad_habitat`. Set `DATABASE_URL` to use another PostgreSQL instance. Never use the Compose password outside local development.

## Review and apply an import

First create a validation and diff report without writes:

```bash
npm run db:dry-run -- --mode sync
```

The command prints a SHA-256 manifest checksum and writes JSON and HTML reports under `reports/`. Review warnings, duplicate resolutions and the insert/update/remove counts. Apply exactly those bytes by passing the checksum:

```bash
npm run db:apply -- --mode sync --approve <manifest-checksum>
```

- `merge` (default) inserts and updates source records, but never removes absent records.
- `sync` also removes absent source-owned values and relationships and archives absent source-owned species, plants and habitat elements. Records created by staff are unaffected.

Every apply is one transaction and records the manifest, files, checksums, report and core source-row mappings. Reapplying unchanged files is idempotent: canonical rows are reported as unchanged and are not updated.

## Editing CSV data

Run the converter as before, then repeat dry-run and apply. Natural plant keys are normalized for outer whitespace and case. When multiple rows normalize to the same key, the importer deterministically selects the most complete row, merges only complementary blank fields and reports conflicts. Exact duplicate habitat relationships are collapsed by their complete semantic identity and reported.

The database choice and complete reconciliation policy are documented in [`../../docs/replacement-app/database-decision.md`](../../docs/replacement-app/database-decision.md).
