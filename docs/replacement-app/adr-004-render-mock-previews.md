# ADR-004: Temporary Render previews with an explicit mock-data runtime

- Status: accepted
- Date: 2026-08-24
- Supersession trigger: first deployed service API or persistent preview data

## Context

The customer needs short-lived review environments while the public experience can still operate
from deterministic fixtures. The target production architecture remains an EU-hosted container
runtime with PostgreSQL, staging and production environments, backups, and restore procedures. It
would add unnecessary cost and operational work to provision that full platform for UI-only pull
request reviews.

## Decision

- Use a Render Blueprint for a temporary base preview service and automatic pull-request previews.
- Use Render's Frankfurt region and the free web-service plan while the application is mock-only.
- Run the Next.js standalone application with `APP_ENV=preview`, explicit mock selection, and an
  additional acknowledgement flag. `APP_ENV=production` always rejects mock data.
- Protect every preview route except health/technical assets with a shared password. Store only a
  scrypt password hash and a generated session-signing secret in Render's secret environment.
- Prevent indexing through robots metadata, `robots.txt`, sitemap suppression, and the
  `X-Robots-Tag` response header.
- Do not attach a Render database or introduce provider-specific application APIs.
- Migrate to Hetzner staging and production before the first deployed service API or persistent
  preview data, tracked by GitHub issue #105.

## Consequences

Pull requests can be reviewed at isolated URLs without a database or infrastructure budget. Free
services can cold-start and share monthly workspace runtime hours, so this is a review environment,
not an availability commitment. The shared password is a lightweight confidentiality gate, not
staff identity or authorization. The application remains portable because Render configuration is
limited to startup, environment variables, and health checks.
