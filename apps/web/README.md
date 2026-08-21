# Habitat database web application

Next.js public and management application for the Studio Animal-Aided Design habitat database.

## Development

Start PostgreSQL and apply an approved CSV snapshot as documented in
`../../packages/database/README.md`. Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Development queries local PostgreSQL and falls back to retained mock
fixtures when it is unavailable. See `.env.example` and
`../../docs/replacement-app/local-development.md` for all modes. Production requires `DATABASE_URL`
and never uses the mock fallback.
