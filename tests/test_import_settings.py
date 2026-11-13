from __future__ import annotations

import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from converter_app.import_settings import ImportSettingsStore, normalize_import_api_url


class MemorySecretStore:
    def __init__(self, token: str | None = None) -> None:
        self.token = token

    def get(self) -> str | None:
        return self.token

    def set(self, token: str) -> None:
        self.token = token

    def delete(self) -> None:
        self.token = None


class ImportSettingsTests(unittest.TestCase):
    def test_normalizes_https_and_allows_local_http(self) -> None:
        self.assertEqual(normalize_import_api_url("https://preview.example/"), "https://preview.example")
        self.assertEqual(normalize_import_api_url("http://localhost:3000/"), "http://localhost:3000")
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            normalize_import_api_url("http://preview.example")

    def test_saves_only_url_in_settings_and_token_in_secret_store(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "settings.json"
            secrets = MemorySecretStore()
            store = ImportSettingsStore(path=path, secret_store=secrets)

            credentials = store.save("https://preview.example/", "very-secret-token")

            self.assertEqual(credentials.base_url, "https://preview.example")
            self.assertEqual(secrets.token, "very-secret-token")
            payload = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(payload, {"import_api_url": "https://preview.example"})
            self.assertNotIn("very-secret-token", path.read_text(encoding="utf-8"))
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_preserves_saved_token_when_url_changes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            secrets = MemorySecretStore("existing")
            store = ImportSettingsStore(path=Path(tmp) / "settings.json", secret_store=secrets)
            store.save("https://one.example")
            store.save("https://two.example", "")
            self.assertEqual(store.resolve().base_url, "https://two.example")
            self.assertEqual(store.resolve().token, "existing")

    def test_falls_back_to_environment_without_persisting_it(self) -> None:
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {
            "AAD_IMPORT_API_URL": "https://environment.example",
            "AAD_IMPORT_API_TOKEN": "environment-token",
        }, clear=False):
            store = ImportSettingsStore(path=Path(tmp) / "missing.json", secret_store=MemorySecretStore())
            credentials = store.resolve()
            self.assertEqual(credentials.url_source, "environment")
            self.assertEqual(credentials.token_source, "environment")
            self.assertTrue(store.is_configured())


if __name__ == "__main__":
    unittest.main()
