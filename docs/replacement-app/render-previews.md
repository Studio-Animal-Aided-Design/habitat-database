# Render customer previews

Render is the temporary hosting target for mock-backed customer reviews. The repository Blueprint at
`render.yaml` creates one Frankfurt-region free web service and automatic service previews for pull
requests. It does not create PostgreSQL or persistent storage.

## Runtime contract and safeguards

| Environment | Catalogue source | Mock fallback | Preview password |
| --- | --- | --- | --- |
| local development | `auto`, `postgres`, or `mock` | allowed only in `auto` | off by default |
| Render preview | explicit `mock` | requires `APP_ENV=preview` **and** `ALLOW_MOCK_CATALOG_IN_PREVIEW=true` | required |
| staging/production | `postgres` | rejected, including explicit `mock` | replaced by real application identity where needed |

`NODE_ENV` is not used as the deployment-stage switch because Next.js production builds also run in
review environments. `APP_ENV` is the explicit application-stage boundary. A configuration error
fails the build or process instead of silently serving plausible fixtures.

The preview gate stores a signed, HTTP-only, same-site cookie. It applies to the complete site, adds
no-index response headers, disables the preview sitemap, and disallows crawlers. It is deliberately
not a replacement for the later local-account authentication and role model.

## Generate the customer password hash

Run this from `apps/web`. The plaintext is read into a temporary shell variable and must not be
committed or pasted into Render:

```bash
read -s "PREVIEW_ACCESS_PASSWORD?Preview password: "
printf '\n'
PREVIEW_ACCESS_PASSWORD="$PREVIEW_ACCESS_PASSWORD" npm run preview:hash-password
unset PREVIEW_ACCESS_PASSWORD
```

Copy only the printed `scrypt$...` value into the Render secret
`PREVIEW_ACCESS_PASSWORD_HASH`. Use at least 12 characters and share the plaintext through a
separate secure channel.

## Create the Render service

1. In Render, create a **Blueprint** and connect the GitHub repository
   `Studio-Animal-Aided-Design/habitat-database`.
2. Select the repository-root `render.yaml` when prompted.
3. Enter `PREVIEW_ACCESS_PASSWORD_HASH`; Render generates
   `PREVIEW_ACCESS_SESSION_SECRET` from the Blueprint.
4. Apply the Blueprint and wait for `/health` to report `{"status":"ok"}`.
5. Open the base preview URL and verify that unauthenticated access redirects to
   `/preview-access`.
6. Open a pull request and verify that Render creates an isolated service preview. Closing or
   merging the pull request should remove it.

The base service and pull-request services inherit the Blueprint environment. The free plan can
sleep after inactivity and uses the workspace's shared free runtime allowance; cold starts are
acceptable for this customer-review use case. Do not use this setup as production.

## Test the Render mode locally

Generate a hash and a random signing secret, then run a production build:

```bash
APP_ENV=preview \
CATALOG_DATA_SOURCE=mock \
ALLOW_MOCK_CATALOG_IN_PREVIEW=true \
PREVIEW_ACCESS_MODE=shared-password \
PREVIEW_ACCESS_PASSWORD_HASH='scrypt$...' \
PREVIEW_ACCESS_SESSION_SECRET='replace-with-at-least-32-random-characters' \
npm run build
```

Start the built application with the same variables and `npm run start`. Render uses the smaller
Next.js standalone server produced by the Blueprint build command. For ordinary UI work use
`npm run dev`; deployed-preview safeguards do not need to be weakened.

## Operations and transition

- Rotate the shared password by generating a new hash and updating the Render secret.
- Never store the plaintext password, password hash, session secret, or Render API token in Git.
- Render resources may be created manually in the dashboard. They can later be managed via Render's
  API/CLI after a narrowly scoped API token is supplied; no account credential is required by the
  application itself.
- Before service APIs or persistent preview data are deployed, execute issue #105 and move previews,
  staging, and production to Hetzner. That work includes PostgreSQL, private networking, backups,
  secrets, domains/TLS, observability, and Render retirement.

References: [Render Blueprints](https://render.com/docs/blueprint-spec),
[service previews](https://render.com/docs/service-previews), and
[free instances](https://render.com/docs/free).
