# Local development and test runtime

The replacement has two runtime surfaces: PostgreSQL with the canonical imported data and the
Next.js public/management application. Starting PostgreSQL does not start the website.

## Local endpoints

| Component | Address | Browser UI | Role |
| --- | --- | --- | --- |
| PostgreSQL 16 | `localhost:5432`, database `aad_habitat` | No | Canonical data and migration testing |
| Next.js web | `http://localhost:3000` | Yes | Server-rendered public and management reads |

## Start PostgreSQL and load data

From the repository root:

```bash
docker compose up -d postgres
docker compose ps
cd packages/database
npm install
npm run db:migrate
npm run db:dry-run -- --mode sync
```

Review the generated report and apply its printed checksum:

```bash
npm run db:apply -- --mode sync --approve <manifest-checksum>
```

The exact CSV locations, merge/sync semantics and safety procedure are documented in
[`../../packages/database/README.md`](../../packages/database/README.md).

Useful database commands from the repository root:

```bash
docker compose exec postgres psql -U aad -d aad_habitat
docker compose logs -f postgres
docker compose stop postgres
```

## Start the web application

In a second terminal:

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`; management routes begin at `http://localhost:3000/management`.

The default development configuration is equivalent to:

```dotenv
CATALOG_DATA_SOURCE=auto
DATABASE_URL=postgresql://aad:aad-local-only@localhost:5432/aad_habitat
```

Copy `apps/web/.env.example` to `apps/web/.env.local` only to override these defaults.

| `CATALOG_DATA_SOURCE` | Development | Production |
| --- | --- | --- |
| `auto` | Query PostgreSQL; on failure warn once and use mock fixtures | Does not fall back |
| `postgres` | Require PostgreSQL and surface failures | Default; requires `DATABASE_URL` |
| `mock` | Always use retained fixtures | Rejected at startup |

To deliberately use fixtures during UI work:

```bash
CATALOG_DATA_SOURCE=mock npm run dev
```

To stop the web server, press `Ctrl+C` in its terminal. Stopping PostgreSQL without deleting its
volume is safe:

```bash
docker compose stop postgres
```

`docker compose down -v` deletes all local PostgreSQL data and should only be used for an intentional
clean rebuild.

## Current integration boundary

Catalogue and detail pages now read the canonical PostgreSQL schema. The management routes use the
same read adapter, but forms are not yet persistent. Authentication, write validation, audit events,
preview and publication commands are the next boundary.

Public detail routes reject non-published records. Approved converter snapshots publish their core
species, plant and habitat records; future editorial records continue to default to `draft`.
