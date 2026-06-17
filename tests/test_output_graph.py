import tempfile
import unittest
from pathlib import Path

from converter_app.output_graph import load_output_graph


class OutputGraphTests(unittest.TestCase):
    def test_loads_entities_and_relations_from_fixture_output(self):
        repo_root = Path(__file__).resolve().parents[1]
        fixture = repo_root / "tests/fixtures/expected_output"
        graph = load_output_graph(fixture)

        self.assertIn("species", graph.entities)
        self.assertIn("habitat_elements", graph.entities)
        self.assertGreater(len(graph.entities["species"].rows), 0)
        self.assertGreater(len(graph.entities["habitat_element_species_relations"].rows), 0)

        # bidirectional index should contain at least one relation mapping
        self.assertGreater(len(graph.forward_index), 0)
        self.assertGreater(len(graph.reverse_index), 0)

    def test_detects_missing_file_and_orphan_reference(self):
        repo_root = Path(__file__).resolve().parents[1]
        fixture = repo_root / "tests/fixtures/expected_output"

        with tempfile.TemporaryDirectory(prefix="aad_graph_test_") as tmp:
            out = Path(tmp)
            # create minimal subset with intentional orphan
            (out / "species-portraits/classification/import/out").mkdir(parents=True, exist_ok=True)
            (out / "habitat-elements/import/out").mkdir(parents=True, exist_ok=True)

            (out / "species-portraits/classification/import/out/species.csv").write_text(
                "id,scientific_name,common_name\nsp1,Species one,Species1\n",
                encoding="utf-8",
            )
            (out / "habitat-elements/import/out/habitat_elements.csv").write_text(
                "id,habitat_element\nhe1,Element One\n",
                encoding="utf-8",
            )
            (out / "habitat-elements/import/out/habitat_element_species_relation.csv").write_text(
                "id,habitat_element,species,lifecycle_stage,purpose,purpose_element\n1,he-missing,Species one,adult,p,pe\n",
                encoding="utf-8",
            )

            graph = load_output_graph(out)

            codes = [i.code for i in graph.quality_issues]
            self.assertIn("MISSING_FILE", codes)
            self.assertIn("ORPHAN_REFERENCE", codes)


if __name__ == "__main__":
    unittest.main()
