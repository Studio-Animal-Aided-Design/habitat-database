# ADR-003: Server-side PostgreSQL catalogue adapter with development mock fallback

- Status: accepted
- Date: 2026-08-21

## Context

The Next.js application was built against a typed `CatalogApi` and deterministic fixtures before the
canonical database existed. Public pages must now render canonical published data, while frontend
development should remain possible when the local database is not running. A silent production
fallback would be unsafe because plausible sample content could hide a real outage.

## Decision

- Implement `CatalogApi` with a server-only PostgreSQL adapter and a small `pg` pool.
- Retain the mock adapter and fixtures as a supported development/test source.
- Select the source with `CATALOG_DATA_SOURCE=auto|postgres|mock`.
- Default development to `auto`: try PostgreSQL and fall back per failed operation, logging one
  warning per process.
- Default production to `postgres`, require `DATABASE_URL`, reject mock mode and never fall back.
- Include only published related entities in public relation reads.
- Publish converter-managed core records during approved imports; keep schema defaults at `draft`
  for future editorial creation.

## Consequences

The same routes work with canonical local data and remain usable without infrastructure during UI
work. Database failures stay visible in production. The adapter is read-only; authentication,
commands, validation, audit and preview remain a separate slice.

The schema has no persistent public slug column yet. The adapter derives first-phase slugs from
approved natural names and legacy slugs. Persistent slugs plus redirect aliases are required before
editors may rename public entities.
