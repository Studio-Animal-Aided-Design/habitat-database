# AAD database and CSV synchronization

This package owns the PostgreSQL schema and the repeatable import of the converter's authoritative CSV output. It does not modify the converter or its CSV files.

## Source location and required files

The importer resolves its source root from the repository containing this package. Input paths are currently fixed and are **not configurable**. Commands may be run from `packages/database`, but the files must exist at these repository-relative paths:

| Dataset | Required repository-relative path |
| --- | --- |
| Species classification | `data/species-portraits/classification/import/out/species.csv` |
| Species attribute definitions | `data/species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv` |
| Species attribute values | `data/species-portraits/portraits/import/out/attributes/*_attributes.csv` |
| Species images | `data/species-portraits/images/import/out/species-images.csv` |
| Structured lifecycle phases | `data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv` |
| Plants | `data/plants/import/out/plants/all_plants.csv` |
| Species–plant relationships | `data/plants/import/out/relations/*_species_plant_relationship.csv` |
| Habitat elements | `data/habitat-elements/import/out/habitat_elements.csv` |
| Habitat-element images | `data/habitat-elements/import/out/habitat_element_images.csv` |
| Species–habitat relationships | `data/habitat-elements/import/out/habitat_element_species_relation.csv` |

All ten dataset groups form one snapshot. A run is not a partial-file importer: every singleton file and at least one file for each wildcard group must be present. Missing files, unexpected headers and broken references stop the run before canonical writes.

Lifecycle rows are derived from the existing Studio lifecycle PNGs without changing the converter contracts. Regenerate them from the repository root with `python3 scripts/extract-lifecycle-diagrams.py`, or from this package with `npm run lifecycle:extract`. The reviewed phase labels are maintained in `data/species-portraits/lifecycle/import/lifecycle-phases.csv`; downloaded PNGs remain in an ignored temporary cache. See [`../../docs/replacement-app/lifecycle-data-contract.md`](../../docs/replacement-app/lifecycle-data-contract.md).

The supported first-phase workflow is:

1. Generate these files with the independent Python converter.
2. Keep the generated files in the exact paths above.
3. Run a dry run against the target database.
4. Review its diagnostics and diff.
5. Apply the exact reviewed manifest checksum.

Do not copy the CSV files into `packages/database` and do not edit importer-owned copies: there are none.

## Local database

From the repository root:

```bash
docker compose up -d postgres
cd packages/database
npm install
npm run db:migrate
```

Development defaults:

| Setting | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` (override Compose with `AAD_POSTGRES_PORT`) |
| Database | `aad_habitat` |
| Username | `aad` |
| Password | `aad-local-only` |
| URL | `postgresql://aad:aad-local-only@localhost:5432/aad_habitat` |

Set `DATABASE_URL` for migration and import commands when targeting another PostgreSQL instance. Never use the Compose credentials outside local development.

Useful commands from the repository root:

```bash
# Container status
docker compose ps

# Open psql inside the container
docker compose exec postgres psql -U aad -d aad_habitat

# Follow PostgreSQL logs
docker compose logs -f postgres

# Stop without deleting imported data
docker compose stop postgres

# Start the existing container again
docker compose start postgres
```

`docker compose down -v` deletes the local PostgreSQL volume and all imported data. Use it only when a destructive clean rebuild is intended; the CSV sync can recreate the canonical data afterward.

The PostgreSQL container is a database service, not a browser UI. See [`../../docs/replacement-app/local-development.md`](../../docs/replacement-app/local-development.md) for the separate web application.

## Dry run and report

Run commands from `packages/database` unless noted otherwise. A dry run applies pending schema migrations, reads all required CSV files, validates the complete snapshot and queries the target database, but performs no canonical or audit writes:

```bash
# Explicit merge preview
npm run db:dry-run -- --mode merge

# Explicit authoritative sync preview
npm run db:dry-run -- --mode sync
```

The command prints:

- a SHA-256 manifest checksum covering every input path and its exact bytes;
- insert, update, unchanged and remove/archive counts per dataset;
- the number of warnings;
- paths to JSON and HTML reports under `packages/database/reports/`.

The reports are local generated artifacts and are ignored by Git. Review duplicate resolution, warnings and every removal/archive count before applying.

## Apply safety

Apply requires the checksum printed by the reviewed dry run:

```bash
npm run db:apply -- --mode sync --approve <manifest-checksum>
```

If any CSV byte changes after the dry run, the manifest changes and apply refuses the old checksum. Each accepted apply runs in one PostgreSQL transaction: any validation, constraint or SQL error rolls back the whole import. Successful runs store their manifest, individual file checksums, report and source-row mappings in the database.

Do not use a checksum from a `merge` review with a later `sync` command without also reviewing the mode-specific removal/archive column. The file checksum is identical, but the operational consequence is not.

### Publication policy for converter data

Species, plants and habitat elements present in the approved converter snapshot are written as
`published` in both merge and sync mode. This also corrects an already imported `draft` or
`archived` source record on the next apply, even when its CSV fields are unchanged. The dry-run
reports that publication-only correction as an update.

The table default remains `draft`: records created later through the management application are not
published implicitly. In sync mode, source-managed core records missing from the complete snapshot
are still changed to `archived`.

## Merge mode

`merge` is the default when `--mode` is omitted. Prefer spelling it explicitly in operational commands.

```bash
npm run db:dry-run -- --mode merge
npm run db:apply -- --mode merge --approve <manifest-checksum>
```

Merge performs these actions:

- inserts new source records;
- updates species and plants by normalized scientific-name key;
- updates habitat elements and attribute definitions by their stable source slug;
- updates species attribute values by species plus attribute-definition identity;
- updates media by owner plus image type;
- inserts relationships by their complete semantic identity;
- upserts lifecycle phase segments by species, phase key and segment order;
- records all seen source rows and leaves missing source-owned database records untouched;
- never performs sync-driven deletes or archives.
- publishes every species, plant and habitat element present in the approved snapshot.

Important consequence: because relationship purpose, annotations and sources are part of a relationship's semantic identity, changing those values creates a new relationship in merge mode while the old relationship remains. Use `sync` when the CSV snapshot is authoritative and edits or removals must replace the previous source state.

Merge is suitable when database-only/editorial additions must be preserved and the operator wants an additive import. It is not a partial snapshot feature: all required CSV groups are still loaded.

## Sync mode

`sync` treats the complete CSV set as the current authority for converter-managed data:

```bash
npm run db:dry-run -- --mode sync
npm run db:apply -- --mode sync --approve <manifest-checksum>
```

Sync first performs the same inserts and updates as merge, then reconciles absent source-managed data:

- missing species attribute values are deleted;
- missing species–plant and species–habitat relationships are deleted;
- missing source-managed lifecycle phase segments are deleted;
- missing media records and their entity links are deleted;
- missing attribute definitions are deleted after their source-managed values are removed;
- missing species, plants and habitat elements are archived rather than physically deleted;
- source mappings not present in the new snapshot are marked inactive;
- records not marked `source_managed` are not selected for absence-driven deletion or archive.

A manually created record with the same canonical natural key as an incoming CSV row is a collision with that source identity: the incoming row updates that record and marks it source-managed. Do not apply either mode to a database with an unresolved manual/source natural-key collision.

Changing a natural key is not treated as an in-place rename by this importer. In merge mode the new entity is inserted and the old entity remains. In sync mode the new entity is inserted and the absent old source entity is archived. Stable-identity rename and alias/redirect handling belongs to the future editorial workflow and must be performed explicitly.

Use sync after normal converter regeneration and for production migration rehearsals. It cleanly reflects additions, field changes and removals in the complete source snapshot.

## Idempotence and changed CSVs

Reapplying unchanged files does not create duplicate canonical rows. A second dry run should report all incoming records as `unchanged`, with zero inserts, updates and removals.

After changing or regenerating CSV files:

1. Run a new dry run; never reuse the previous checksum.
2. Verify normalized-key duplicate warnings and relationship changes.
3. In sync mode, inspect `removedOrArchived` particularly carefully.
4. Apply the new checksum.
5. Run the same dry run again and expect only unchanged records.

Natural plant keys trim surrounding whitespace and compare case-insensitively. For duplicate rows, the importer selects the row with the most populated fields, merges only complementary blanks, reports conflicting populated values and uses the earlier source row as a deterministic tie-breaker. Exact duplicate habitat relationships are collapsed by their complete semantic identity and reported. Source CSV files are never rewritten.

Blank attribute values and incomplete media metadata are preserved with warnings. Orphan references, malformed booleans in fields that are actually boolean, duplicate definition slugs and incompatible headers are blocking errors.

## Choosing a mode

| Situation | Recommended mode |
| --- | --- |
| Routine complete converter regeneration | `sync` |
| Migration rehearsal against a disposable database | `sync` |
| Additive import where missing converter rows must remain | `merge` |
| Relationship values were edited or removed in CSV | `sync` |
| Unsure whether removals are intended | dry-run both modes; do not apply until reviewed |

The database decision and complete reconciliation policy are documented in [`../../docs/replacement-app/adr-002-postgresql-database.md`](../../docs/replacement-app/adr-002-postgresql-database.md).
