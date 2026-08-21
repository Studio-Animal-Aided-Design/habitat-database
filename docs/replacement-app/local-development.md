# Local development and test runtime

This repository currently contains two separate replacement-app runtime surfaces:

1. PostgreSQL with imported canonical data;
2. the Next.js web application, which still uses its typed mock API.

The web application is not yet connected to PostgreSQL. Starting PostgreSQL does not start a website, and starting the website currently displays mock data rather than the imported database records.

## Current local endpoints

| Component | Address | Browser UI | Current role |
| --- | --- | --- | --- |
| PostgreSQL 16 | `localhost:5432`, database `aad_habitat` | No | Canonical imported data and migration testing |
| Next.js web | `http://localhost:3000` when started | Yes | Public and management route design backed by mock data |

## Start PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
docker compose ps
```

The expected healthy service is `habitat-database-postgres-1`, published on port 5432. Connect with:

```bash
docker compose exec postgres psql -U aad -d aad_habitat
```

The database import commands and source-file locations are documented in [`../../packages/database/README.md`](../../packages/database/README.md).

## Start the web application

In a second terminal:

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`. Management mock routes begin at `http://localhost:3000/management`.

To stop the development server, press `Ctrl+C` in its terminal. To stop PostgreSQL without deleting its data:

```bash
docker compose stop postgres
```

## Current integration limitation

The browser application reads `CatalogApi` mock fixtures. It has no server-side PostgreSQL repository yet. Consequently:

- CSV sync results can be inspected with SQL but are not reflected in the browser;
- edits made in the mock management UI are not persisted;
- public pages do not yet enforce database publication status.

The next implementation slice should replace the mock adapter with a server-only PostgreSQL-backed catalogue repository while retaining the existing typed `CatalogApi` boundary. Begin with read-only species, plant and habitat queries plus relationship and flexible-attribute loading, then switch public server-rendered routes to that adapter. This creates a verifiable vertical slice before authentication and write workflows are added.
