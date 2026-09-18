# IONOS preview and production deployment

This directory is the provider-portable, single-VM deployment for customer milestone M1. The target
is an IONOS VPS in a confirmed German data center, but the runtime contract is standard Docker
Compose, Caddy, Next.js and PostgreSQL. No application or data path depends on an IONOS-specific API.

The deployment intentionally runs two isolated stacks on one VM:

| Environment | Public entry point | Application | Database | Access policy |
| --- | --- | --- | --- | --- |
| preview | `PREVIEW_DOMAIN` through Caddy | `preview-app` | `preview-db`, private network and volume | shared password until staff identity exists |
| production | `PRODUCTION_DOMAIN` through Caddy | `production-app` | `production-db`, private network and volume | public reads; no preview gate |

Only Caddy publishes host ports. PostgreSQL has no host port and the two database networks are
separate and marked internal. Application configuration and database volumes are also separate.

## Confirmation gate before provisioning

Record these decisions in issue #105 before ordering or changing DNS:

- exact IONOS product, resources, recurring and setup price;
- German data-center location;
- existing-contract extension and contractual/billing owner;
- AVV/DPA and technical and organizational measures;
- IPv4 requirement, cancellation terms and support route;
- preview and production domains, DNS owner and operating contact.

## Server baseline

1. Install a supported Docker Engine with the Compose plugin on a current Linux LTS image.
2. Create a non-root deployment user with narrowly controlled Docker access.
3. Permit inbound TCP 80 and 443 and UDP 443. Restrict SSH to the named administrator IP, VPN or
   IONOS console path; do not expose PostgreSQL.
4. Clone the repository into a deployment directory owned by that user and check out an immutable
   reviewed release commit.
5. Keep host and container security updates in the named operator's routine.

## Configure secrets

From `deploy/ionos`, copy all five examples without committing the resulting files:

```bash
cp .env.example .env
cp .env.preview-app.example .env.preview-app
cp .env.preview-db.example .env.preview-db
cp .env.production-app.example .env.production-app
cp .env.production-db.example .env.production-db
chmod 600 .env .env.*-app .env.*-db
```

Use distinct random database passwords for preview and production. Each password must match between
the corresponding `DATABASE_URL` and `POSTGRES_PASSWORD`. Generate the preview access hash with
`npm run preview:hash-password` in `apps/web`; use a separate random session secret of at least 32
characters. Never place plaintext credentials in Git, images, command history, URLs or issue text.
The application image is built without contacting PostgreSQL; catalogue routes are deliberately
rendered from the selected environment's database at runtime, so no mock or build-time snapshot is
promoted into production.

Point the two approved DNS records at the VM only after the domains and operating contact are
confirmed. Caddy obtains and renews TLS certificates automatically.

## Validate and start

```bash
docker compose config --quiet
docker compose build preview-app production-app preview-db-tools production-db-tools
docker compose up -d preview-db production-db

docker compose --profile ops run --rm preview-db-tools db:migrate
docker compose --profile ops run --rm production-db-tools db:migrate

docker compose up -d preview-app production-app caddy
docker compose ps
```

Before the first public release, dry-run and apply the exact approved CSV snapshot to each target:

```bash
docker compose --profile ops run --rm preview-db-tools db:dry-run -- --mode sync
docker compose --profile ops run --rm preview-db-tools db:apply -- --mode sync --approve CHECKSUM

docker compose --profile ops run --rm production-db-tools db:dry-run -- --mode sync
docker compose --profile ops run --rm production-db-tools db:apply -- --mode sync --approve CHECKSUM
```

Review the generated reports under `reports/preview` and `reports/production`. Do not apply until
the checksum, counts, warnings and removals are accepted. The later authenticated converter/API path
in issue #107 will replace this commissioning-only operator command.

## Verification

```bash
curl --fail --silent --show-error https://PREVIEW_DOMAIN/health
curl --fail --silent --show-error https://PRODUCTION_DOMAIN/health
docker compose ps
docker compose logs --tail 200 caddy preview-app production-app preview-db production-db
```

Also verify from outside the VM that only the approved HTTPS endpoints are generally reachable,
PostgreSQL ports are closed, preview redirects to the access gate, production public pages work
without login, and neither environment can start with mock or automatic fallback data.

## Deploy, restart and application rollback

For a new reviewed commit or immutable image tag:

```bash
git fetch --prune
git checkout RELEASE_COMMIT
docker compose build preview-app production-app
docker compose up -d --no-deps preview-app production-app
docker compose ps
```

Routine restart:

```bash
docker compose restart caddy preview-app production-app
```

Application rollback changes only the application release, not PostgreSQL:

```bash
git checkout PREVIOUS_ACCEPTED_COMMIT
docker compose build preview-app production-app
docker compose up -d --no-deps preview-app production-app
```

Always rerun both health checks and representative public pages after deploy or rollback. Database
schema rollback is not implied by application rollback; a migration compatibility check is required
before any release that changes the schema.

## Rebuild from migrations and authoritative CSVs

The M1 recovery path is a deliberate rebuild, not a backup restore:

1. Stop the affected app.
2. Preserve incident evidence and confirm the exact environment and volume with a second operator.
3. Remove only the explicitly approved affected PostgreSQL volume.
4. Start the affected database, run `db:migrate`, then dry-run and apply the accepted snapshot.
5. Start the app and repeat health, count and representative-page checks.

The exact destructive volume-removal command is intentionally not scripted. Recurring backups,
retention and a tested restore from backup remain customer milestone M4 (#79), not M1.

## Render retirement

Keep the temporary Render mock preview until the PostgreSQL-backed IONOS preview is accepted. Then:

1. record the accepted IONOS preview URL and evidence in #105;
2. remove the Render Blueprint/service and automatic PR previews;
3. rotate or remove the Render preview password hash and session secret;
4. confirm no DNS record still points at Render;
5. update `docs/replacement-app/render-previews.md` with the retirement date.
