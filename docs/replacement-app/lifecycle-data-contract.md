# Lifecycle diagram data contract

Issue: #100

The converter's existing CSV outputs remain unchanged. Interactive lifecycle diagrams are an additive, derived dataset generated from the lifecycle PNG URLs in `data/species-portraits/images/import/out/species-images.csv`.

## Reproducible source flow

1. `scripts/extract-lifecycle-diagrams.py` reads lifecycle-image rows from `species-images.csv`.
2. It downloads each source image into a local ignored cache, records its SHA-256 checksum, and detects the coloured annual interval for each concentric phase ring.
3. Reviewed semantic labels live in `data/species-portraits/lifecycle/import/lifecycle-phases.csv`; ring colours are measured from the PNG.
4. The script writes the importer-ready file `data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv` in a stable order.
5. Database `merge` upserts phase rows; `sync` additionally removes source-managed phase rows that are no longer present.

The generated rows use 180 annual ticks: twelve equal month sectors with fourteen minor ticks between adjacent month boundaries. Intervals are stored as a start tick, an exclusive end tick, and a `wraps_year` flag. Ring order is counted from the inside out.

## Validation and fallback

- A species reference must resolve to `species.scientific_name_key`.
- Ring order is unique per species and intervals must remain within `0..179`.
- Source checksum and extraction status are persisted for traceability.
- Public rendering uses structured data when all rows for a diagram are marked `reviewed`; otherwise it renders the original lifecycle image.

The source PNG remains authoritative for visual verification; the CSV is the reviewable and idempotent database input.
