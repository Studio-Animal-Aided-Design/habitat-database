import unittest

from converter_app.models import RunConfig


class ModelTests(unittest.TestCase):
    def test_run_config_defaults(self) -> None:
        cfg = RunConfig(input_root="data", output_root="out")
        payload = cfg.to_dict()
        self.assertEqual(payload["mode"], "tolerant")
        self.assertEqual(payload["locale"], "de")


if __name__ == "__main__":
    unittest.main()
