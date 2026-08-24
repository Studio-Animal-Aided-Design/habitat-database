Animal-Aided Design Database
---

This is an open source database application that provides species portraits of animals and associated plants and habitat elements that should be considered in the design of new buildings, renovations or conversions. Species portraits contain all the essential information for a particular target species that designers need to integrate the needs of the species into the design. In particular, the species portrait provides information on the specific habitat requirements of a species throughout its life cycle. This AAD database is a prototype and contains 14 species selected for the Neuperlach district of Munich as part of the EU-funded 'Creating NEBourhoods Together' project.

▶️ You can find the latest production version running here: https://app.tooljet.com/applications/species-portrait-and-habitat-database

## Technology

This database project is built using ToolJet, an open source low-code application builder. ToolJet applications can be run as a service on the ToolJet cloud, or hosted on your own using various options (Docker, Kubernetes, various cloud providers). Visit https://docs.tooljet.com/ to find out more.

In the **tooljet** directory of this repository you will find the ToolJet application code, which is a configuration file stored as JSON. You will also find backups of various custom React components used in this project.

The project uses ToolJet's built-in database, which is based on Postgres.

## Data

The **data** directory contains the original data as .xlsx spreadsheet files. These come with **importer** scripts in the form of Juypter notebooks. These importer scripts create import-ready CSV files that can be used for bulk upload to the ToolJet database.

## Maintainers

Maintainer of this project is the [Studio Animal-Aided Design](https://animal-aided-design.de/). This project is a public project sponsored by the European Union.

## Local Converter App (Notebook Replacement)

A local desktop converter app is available under `converter_app/`.

- User guide: `CONVERTER.md`
- GUI launch: `python3 -m converter_app.gui`
- CLI fallback: `python3 -m converter_app.cli --input-root data --output-root dist/conversion-output`

The converter generates Tooljet-ready CSV outputs, a JSON/HTML conversion report, and a Tooljet import guide.

- Distribution guide: `RELEASE.md`
- External user documentation: `docs/converter/README.md`

- Dev mode (auto-restart GUI): `python3 -m converter_app.dev_runner` or `./run_converter_dev.command`

## Replacement Web Application

The container-ready replacement is developed as an independent application under `apps/web/`.
Keeping it below `apps/` preserves the existing Python converter as a separate product and leaves
space for future services or shared packages without making the repository root Node-specific.

- Local development: [`docs/replacement-app/local-development.md`](docs/replacement-app/local-development.md)
- PostgreSQL import and sync: [`packages/database/README.md`](packages/database/README.md)
- Architecture decisions: [`ADR-002 PostgreSQL`](docs/replacement-app/adr-002-postgresql-database.md), [`ADR-003 server-side catalogue adapter`](docs/replacement-app/adr-003-server-side-catalog-adapter.md), and [`ADR-004 temporary Render previews`](docs/replacement-app/adr-004-render-mock-previews.md)
- Customer preview hosting: [`docs/replacement-app/render-previews.md`](docs/replacement-app/render-previews.md)
- Editorial design system: [`docs/replacement-app/editorial-system.md`](docs/replacement-app/editorial-system.md)
- Issue and pull-request workflow: [`docs/replacement-app/github-workflow.md`](docs/replacement-app/github-workflow.md)
