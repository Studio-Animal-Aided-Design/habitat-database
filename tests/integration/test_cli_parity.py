import csv
import tempfile
import unittest
from pathlib import Path

from converter_app.models import RunConfig
from converter_app.pipeline import run_pipeline


TARGETS = [
    "species-portraits/classification/import/out/species.csv",
    "species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv",
    "species-portraits/images/import/out/species-images.csv",
    "plants/import/out/plants/all_plants.csv",
    "habitat-elements/import/out/habitat_elements.csv",
    "habitat-elements/import/out/habitat_element_images.csv",
    "habitat-elements/import/out/habitat_element_species_relation.csv",
]

WILDCARD_TARGETS = [
    "species-portraits/portraits/import/out/attributes/*.csv",
    "plants/import/out/relations/*.csv",
]

def csv_rows(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        r = csv.reader(f)
        header = next(r, [])
        rows = [row for row in r]
    if header:
        header[0] = header[0].lstrip("\ufeff")
    return header, rows


class CliParityTests(unittest.TestCase):
    def test_cli_pipeline_matches_fixture_baseline(self):
        repo_root = Path(__file__).resolve().parents[2]
        fixture_input = repo_root / "tests/fixtures/current_input"
        fixture_expected = repo_root / "tests/fixtures/expected_output"

        if not fixture_input.exists() or not fixture_expected.exists():
            self.skipTest("Fixture directories missing. Run scripts/prepare_test_fixtures.py first.")

        sentinel = fixture_input / "species-portraits/classification"
        if not sentinel.exists():
            self.skipTest("Fixture input not prepared. Run scripts/prepare_test_fixtures.py first.")

        with tempfile.TemporaryDirectory(prefix="aad_cli_parity_") as tmpdir:
            out_root = Path(tmpdir)
            cfg = RunConfig(input_root=str(fixture_input), output_root=str(out_root))
            result = run_pipeline(cfg)

            self.assertIn(result.overall_status, {"success", "warning"})

            for rel in TARGETS:
                expected_file = fixture_expected / rel
                produced_file = out_root / rel
                self.assertTrue(expected_file.exists(), f"Missing expected baseline file: {expected_file}")
                self.assertTrue(produced_file.exists(), f"Missing produced file: {produced_file}")

                exp_header, exp_rows = csv_rows(expected_file)
                got_header, got_rows = csv_rows(produced_file)

                self.assertEqual(exp_header, got_header, f"Header mismatch for {rel}")
                self.assertEqual(
                    exp_rows,
                    got_rows,
                    f"Content mismatch for {rel}",
                )

            for pattern in WILDCARD_TARGETS:
                exp_files = sorted((fixture_expected).glob(pattern))
                got_files = sorted((out_root).glob(pattern))
                exp_rel = [str(p.relative_to(fixture_expected)) for p in exp_files]
                got_rel = [str(p.relative_to(out_root)) for p in got_files]
                self.assertEqual(
                    exp_rel,
                    got_rel,
                    f"File-set mismatch for pattern {pattern}",
                )

                for exp_file in exp_files:
                    rel = exp_file.relative_to(fixture_expected)
                    got_file = out_root / rel
                    self.assertTrue(got_file.exists(), f"Missing produced file: {got_file}")

                    exp_header, exp_rows = csv_rows(exp_file)
                    got_header, got_rows = csv_rows(got_file)
                    self.assertEqual(exp_header, got_header, f"Header mismatch for {rel}")
                    self.assertEqual(got_rows, exp_rows, f"Content mismatch for {rel}")


if __name__ == "__main__":
    unittest.main()
