# ADR-002: PostgreSQL as the replacement application's database

- Status: accepted
- Date: 2026-08-21
- Related issues: #75, #76

## Context

The replacement must preserve species, plants, habitat elements, ordered flexible species attributes, media and two enriched many-to-many relationship types. Imports must be repeatable, auditable and transactionally safe. The public application is read-heavy; the management application needs reliable validation, editing and later publication workflows. Deployment must remain container-portable and EU-hostable, with a path from logical backups to physical backups and point-in-time recovery.

The CSV exports are the current source of truth for migration. They contain natural-key variants and duplicates, so database constraints and an explicit reconciliation process are required.

## Options considered

| Criterion | PostgreSQL | MongoDB | SQLite |
| --- | --- | --- | --- |
| Relational domain and enriched joins | Native foreign keys, unique constraints and efficient joins | References and cross-document consistency move substantial logic into the application | Good relational model, but limited operational concurrency |
| Flexible species attributes | Normalized definition/value tables; JSONB remains available for genuinely unstructured metadata | Natural document fit, but attribute definitions, ordering and source metadata still require cross-document rules | Possible, but weaker production operations |
| Import safety | Transactions, deferred constraints, staging/reporting and `ON CONFLICT` upserts | Transactions exist, but are less natural for this highly connected import | Transactions exist, but single-writer operation is a poor fit for concurrent admin and import work |
| Integrity and duplicate prevention | Database-enforced referential and semantic uniqueness | Mostly application-enforced across collections | Database-enforced, but fewer operational safeguards |
| Backup and recovery | Mature logical backup; physical backup, WAL archiving and PITR supported by common EU providers and the Zalando operator | Mature backup options, but adds a second, less suitable data model | File copies are simple; robust online backup/PITR and container orchestration are weaker |
| Hosting portability and cost | Widely available as a managed or self-hosted EU service | Available, but often introduces a separate managed-service dependency | Cheapest, but constrains growth and availability |

## Decision

Use **PostgreSQL 16** for the system of record.

- Model the relational core explicitly and enforce foreign keys and uniqueness in the database.
- Use UUID primary keys. Preserve legacy IDs and source row provenance in import mapping tables rather than using unstable export IDs as primary keys.
- Use normalized, case-folded natural keys for species and plants. Renames are represented by alias tables so links and future public slugs can remain stable.
- Model flexible species content with ordered attribute definitions and typed relationships to attribute values. JSONB is reserved for import reports, audit details and future metadata that has no stable schema.
- Keep migrations as transparent, versioned SQL. Application query tooling may be selected later without owning the schema.
- Treat media as metadata pointing to an external URL or EU-compatible object-storage key. Do not store image binaries in PostgreSQL by default; this keeps backups small and leaves an EU-hosted S3-compatible service or local object store available.
- Start with one PostgreSQL instance and logical backups. The target operational design supports WAL archiving/PITR and may later use the Zalando Postgres Operator; HA is not an MVP requirement.

## Import and reconciliation policy

The importer never changes source CSV files. It validates all files before writing and applies a complete import in one transaction.

1. Trim surrounding whitespace and compare scientific names case-insensitively.
2. For natural-key duplicate plants, select the row with the most populated fields; merge only complementary values. Conflicting populated values are reported. Ties are resolved by the earliest source row, making the result deterministic.
3. Collapse exact duplicate enriched relationships by their complete semantic key and report every contributing source row.
4. Fail on missing references, duplicate definition slugs, malformed values or incompatible headers.
5. Preserve blank attribute values and incomplete media metadata as source data, but report them as warnings.
   Preserve the plant `is_native` source vocabulary (`ja`, `nein`, `invasiv`) as a status rather than coercing it to a lossy boolean.
6. A dry run computes a content-addressed manifest and database diff without writes. Apply requires that exact manifest checksum, preventing reviewed input from being replaced between review and import.
7. `merge` mode upserts source records without removing records. `sync` mode additionally removes absent source-owned child/relationship rows and archives absent source-owned core entities; manually created records are not deleted.

## Consequences

PostgreSQL gives the strongest fit for correctness, import safety and future editorial workflows. The cost is a modestly more explicit schema and migration discipline than a document store. That discipline is desirable here because the relationships and their annotations are first-class domain data, not incidental nesting.
