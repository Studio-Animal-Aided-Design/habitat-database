# Fixture Layout

This directory stores integration-test fixtures for CLI parity checks.

- `current_input/`: snapshot of input data used by converter
- `expected_output/`: snapshot of notebook-baseline outputs for parity comparison
  - includes single-output CSVs (species, plants, habitat, images, ...)
  - includes per-species/per-file outputs:
    - `species-portraits/portraits/import/out/attributes/*.csv`
    - `plants/import/out/relations/*.csv`

## Prepare / refresh fixtures

```bash
python3 scripts/prepare_test_fixtures.py
```

## Run parity integration test

```bash
python3 -m unittest tests.integration.test_cli_parity
```

The parity test compares:
- same produced file set
- CSV headers (exact)
- CSV rows/content (exact 1:1 order + values)
