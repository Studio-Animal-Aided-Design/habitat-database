# Parity-Tests: Converter vs. Notebook-Outputs

## Ziel
Diese Tests prüfen den Converter-Output gegen Notebook-Baselines:
- gleiche Dateien
- gleiche CSV-Header
- gleicher CSV-Inhalt (1:1, Reihenfolge + Werte)

## Fixture-Struktur
Der Test nutzt:
- `tests/fixtures/current_input/` (Input für Pipeline-Run)
- `tests/fixtures/expected_output/` (erwartete Notebook-Outputs)

Beides wird aus `data/` aufgebaut.

## 1) Fixtures erstellen/aktualisieren
```bash
python3 scripts/prepare_test_fixtures.py
```

Das Script kopiert:
- kompletten Input nach `tests/fixtures/current_input`
- Notebook-Outputs nach `tests/fixtures/expected_output`, inklusive:
  - `species-portraits/classification/import/out`
  - `species-portraits/attribute-definitions/import/out`
  - `species-portraits/images/import/out`
  - `species-portraits/portraits/import/out/attributes`
  - `plants/import/out/plants`
  - `plants/import/out/relations`
  - `habitat-elements/import/out`

## 2) Integrationstest ausführen (unittest)
```bash
python3 -m unittest tests.integration.test_cli_parity
```

## 3) Detaillierten Diff-Report ausführen
Wenn der Test fehlschlägt:
```bash
python3 scripts/validate_parity.py --baseline-root tests/fixtures/expected_output --candidate-root <PFAD_ZU_NEUEM_OUTPUT>
```

Beispiel:
```bash
python3 scripts/validate_parity.py --baseline-root tests/fixtures/expected_output --candidate-root dist/conversion-output
```

Wenn du die GUI im Dev-Mode nutzt, ist `dist/conversion-output` der richtige Kandidat.

## Hinweis
- Der Parity-Test ist absichtlich streng (1:1).
- Wenn ihr absichtlich Logik ändert, müsst ihr danach die Baseline-Files bewusst neu erzeugen und in `tests/fixtures/expected_output` aktualisieren.
