# ADR-005: Keep the M1 import API inside the Next.js application

- **Status:** Accepted (implemented in #121)
- **Date:** 2026-09-20
- **Issue:** [#119](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/119)
- **Depends on:** [#107](https://github.com/Studio-Animal-Aided-Design/habitat-database/issues/107)

## Context

The replacement application currently consists of a Next.js web application and PostgreSQL. The
database package already validates the converter's complete CSV snapshot, produces a deterministic
dry-run report and applies an approved snapshot in one PostgreSQL transaction. Issue #107 needs a
secure operator-only API for that workflow without turning M1 into a second application to deploy.

The API must preserve the exact bytes reviewed during dry-run, prevent accidental application of a
changed snapshot, keep credentials out of URLs and logs, and make a failed or interrupted request
recoverable. The first IONOS deployment is a single-VM Compose installation; horizontal scaling is
not an M1 requirement.

## Decision

For M1, expose the importer through **Next.js App Router Route Handlers running in the existing
Node.js application container**. Do not add a separate API service, queue, worker or gateway. The
Route Handler is the HTTP adapter; the existing `@aad/database` package remains the domain/import
engine and is extended to accept an explicit staged snapshot root rather than assuming the Git
repository root.

Uploads are written to a per-run directory on a named, writable import-staging volume mounted into
the web container. The database stores run metadata, checksums, status and the dry-run report; the
CSV bytes remain on the staging volume until the run is applied or expires. This preserves the exact
reviewed input. The current Route Handler parses a bounded multipart request with `request.formData()`
before writing files, so upload parsing can still consume request-sized memory. The volume is an M1
single-host assumption and is not presented as a highly available shared store.

The API uses a high-entropy operator bearer token. The server stores its scrypt hash as a deployment
secret, verifies the supplied token without logging it, and limits repeated failed authentication
attempts. The app checks upload size and file count; a reverse-proxy body limit is still required for
the IONOS deployment. A future account/role system may replace this token without changing the
import state machine.

## Consequences

Positive:

- one image, one deployment and one PostgreSQL trust boundary;
- no network hop or second release process for the importer;
- dry-run and apply can share the same snapshot/parser and checksum contract;
- a later worker or object store can replace the staging adapter behind the same application port.

Trade-offs and constraints:

- the first implementation assumes one active web host and a persistent staging volume;
- long-running import work occupies a Node.js request and therefore needs explicit size/time limits;
- the API must reject preview/mock runtime configurations and must never be reachable from the
  public Render mock-preview path;
- a later multi-replica deployment requires shared staging or a job worker, which is deliberately
  deferred.

## Rejected alternatives

1. **Separate API service:** adds another image, credentials, health check and release path for no
   M1 benefit.
2. **Direct upload into PostgreSQL only:** makes the reviewed source snapshot harder to inspect and
   complicates expiry and exact-file validation.
3. **In-process memory only:** risks memory pressure and loses the source when a request is
   interrupted before apply.
4. **Shelling out to the CLI from the web request:** couples the API to repository paths and a
   runtime toolchain; the importer should be called as a typed library instead.

## Implementation and operational follow-up

Issue #107 / PR #121 added the run migration, `IMPORT_API_TOKEN_HASH`, bounded upload defaults
(25 MiB and 128 files), a 24-hour run lifetime, `no-store` responses and import audit events.
Expired runs are marked and their staged files removed when accessed; automatic cleanup of
unvisited expired runs is not yet implemented. IONOS deployment still needs the persistent volume,
reverse-proxy request limits, secret rotation procedure and operator checks tracked by #105/#117.
The current API contract and setup instructions are in [import-api.md](import-api.md).

## References

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js `revalidatePath`](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- `packages/database/src/snapshot.ts` and `packages/database/src/sync.ts`
- `docs/replacement-app/adr-002-postgresql-database.md`
