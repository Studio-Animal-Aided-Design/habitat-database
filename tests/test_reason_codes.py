import unittest

from converter_app.reason_codes import reason_message


class ReasonCodeTests(unittest.TestCase):
    def test_reason_message_known(self) -> None:
        msg = reason_message("MISSING_SHEET")
        self.assertIn("Arbeitsblatt", msg)

    def test_reason_message_unknown(self) -> None:
        msg = reason_message("SOMETHING_UNKNOWN")
        self.assertIn("Unbekannter Fehler", msg)


if __name__ == "__main__":
    unittest.main()
