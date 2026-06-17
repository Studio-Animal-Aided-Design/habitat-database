import unittest

from converter_app.utils import slugify_de


class UtilsTests(unittest.TestCase):
    def test_slugify_de_umlauts(self) -> None:
        self.assertEqual(slugify_de("Bärtige Sandbiene"), "baertige_sandbiene")
        self.assertEqual(slugify_de("  Größe / Höhe "), "groesse_hoehe")


if __name__ == "__main__":
    unittest.main()
