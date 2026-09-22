from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from converter_app.api_client import ImportApiClient, collect_import_files, diagnostics_to_issues


class FakeResponse:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


class ImportApiClientTests(unittest.TestCase):
    def test_collects_converter_output_and_lifecycle_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            output = root / "out"
            source = root / "data"
            generated = output / "species-portraits/classification/import/out/species.csv"
            lifecycle = source / "species-portraits/lifecycle/import/out/species-lifecycle-phases.csv"
            generated.parent.mkdir(parents=True)
            lifecycle.parent.mkdir(parents=True)
            generated.write_text("id\n1\n", encoding="utf-8")
            lifecycle.write_text("species\nTest\n", encoding="utf-8")

            files = collect_import_files(output, source)
            self.assertEqual(files["data/species-portraits/classification/import/out/species.csv"], generated)
            self.assertEqual(files["data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv"], lifecycle)

    def test_sends_bearer_token_and_idempotency_key(self) -> None:
        captured = {}

        def opener(request, timeout):
            captured["authorization"] = request.headers["Authorization"]
            captured["idempotency"] = request.headers["Idempotency-key"]
            captured["timeout"] = timeout
            return FakeResponse({"ok": True, "run": {"id": "run-1"}})

        client = ImportApiClient("http://localhost:3000", "secret", opener=opener)
        run = client.dry_run({}, idempotency_key="fixed-key")
        self.assertEqual(run["id"], "run-1")
        self.assertEqual(captured["authorization"], "Bearer secret")
        self.assertEqual(captured["idempotency"], "fixed-key")

    def test_maps_api_diagnostics_to_existing_issue_model(self) -> None:
        issues = diagnostics_to_issues([{
            "code": "missing_file",
            "messageDe": "Datei fehlt",
            "severity": "error",
            "blocking": True,
            "file": "data/test.csv",
            "row": 3,
        }])
        self.assertEqual(issues[0].stage, "app_import")
        self.assertEqual(issues[0].reason_code, "missing_file")
        self.assertEqual(issues[0].row, 3)


if __name__ == "__main__":
    unittest.main()
