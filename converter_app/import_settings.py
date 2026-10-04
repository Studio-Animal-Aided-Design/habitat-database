from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Protocol
from urllib.parse import urlsplit, urlunsplit


KEYCHAIN_SERVICE = "de.animal-aided-design.converter.import-api"
KEYCHAIN_ACCOUNT = "default"


class CredentialStorageError(RuntimeError):
    pass


class SecretStore(Protocol):
    def get(self) -> str | None: ...

    def set(self, token: str) -> None: ...

    def delete(self) -> None: ...


class MacOSKeychain:
    """Store the import token in the current macOS user's login keychain."""

    def __init__(self, security_command: str | None = None) -> None:
        self.security_command = security_command or shutil.which("security") or "/usr/bin/security"

    @property
    def available(self) -> bool:
        return sys.platform == "darwin" and Path(self.security_command).is_file()

    def _require_available(self) -> None:
        if not self.available:
            raise CredentialStorageError(
                "Der sichere macOS-Schlüsselbund ist nicht verfügbar. "
                "Bitte AAD_IMPORT_API_TOKEN für diese Sitzung über die Umgebung setzen."
            )

    def get(self) -> str | None:
        self._require_available()
        result = subprocess.run(
            [
                self.security_command,
                "find-generic-password",
                "-a",
                KEYCHAIN_ACCOUNT,
                "-s",
                KEYCHAIN_SERVICE,
                "-w",
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        if result.returncode == 0:
            return result.stdout.rstrip("\n") or None
        if "could not be found" in result.stderr.lower():
            return None
        raise CredentialStorageError("Der Import-Token konnte nicht aus dem macOS-Schlüsselbund gelesen werden.")

    def set(self, token: str) -> None:
        self._require_available()
        value = token.strip()
        if not value:
            raise ValueError("Der Import-Token darf nicht leer sein.")
        result = subprocess.run(
            [
                self.security_command,
                "add-generic-password",
                "-U",
                "-a",
                KEYCHAIN_ACCOUNT,
                "-s",
                KEYCHAIN_SERVICE,
                "-w",
                value,
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        if result.returncode != 0:
            raise CredentialStorageError("Der Import-Token konnte nicht im macOS-Schlüsselbund gespeichert werden.")

    def delete(self) -> None:
        self._require_available()
        result = subprocess.run(
            [
                self.security_command,
                "delete-generic-password",
                "-a",
                KEYCHAIN_ACCOUNT,
                "-s",
                KEYCHAIN_SERVICE,
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        if result.returncode != 0 and "could not be found" not in result.stderr.lower():
            raise CredentialStorageError("Der Import-Token konnte nicht aus dem macOS-Schlüsselbund entfernt werden.")


def default_settings_path() -> Path:
    override = os.getenv("AAD_CONVERTER_CONFIG_DIR", "").strip()
    if override:
        return Path(override).expanduser() / "settings.json"
    if sys.platform == "darwin":
        root = Path.home() / "Library" / "Application Support" / "AAD Converter"
    elif sys.platform == "win32":
        root = Path(os.getenv("APPDATA") or Path.home() / "AppData" / "Roaming") / "AAD Converter"
    else:
        root = Path(os.getenv("XDG_CONFIG_HOME") or Path.home() / ".config") / "aad-converter"
    return root / "settings.json"


def normalize_import_api_url(value: str) -> str:
    candidate = value.strip().rstrip("/")
    if not candidate:
        raise ValueError("Bitte die App-URL eingeben.")
    parsed = urlsplit(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Die App-URL muss mit https:// beginnen (lokal ist http://localhost erlaubt).")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Die App-URL darf keine Zugangsdaten, Parameter oder Sprungmarke enthalten.")
    local_hosts = {"localhost", "127.0.0.1", "::1"}
    if parsed.scheme != "https" and parsed.hostname not in local_hosts:
        raise ValueError("Für entfernte App-Umgebungen ist eine HTTPS-URL erforderlich.")
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", ""))


@dataclass(frozen=True)
class ImportApiCredentials:
    base_url: str
    token: str
    url_source: str
    token_source: str


class ImportSettingsStore:
    def __init__(self, path: Path | None = None, secret_store: SecretStore | None = None) -> None:
        self.path = path or default_settings_path()
        self.secret_store = secret_store or MacOSKeychain()

    def saved_url(self) -> str:
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return ""
        except (OSError, ValueError, TypeError):
            return ""
        value = payload.get("import_api_url") if isinstance(payload, dict) else ""
        return value.strip() if isinstance(value, str) else ""

    def saved_token(self) -> str:
        return self.secret_store.get() or ""

    def resolve(self) -> ImportApiCredentials:
        saved_url = self.saved_url()
        environment_url = os.getenv("AAD_IMPORT_API_URL", "").strip()
        try:
            saved_token = self.saved_token()
        except CredentialStorageError:
            saved_token = ""
        environment_token = os.getenv("AAD_IMPORT_API_TOKEN", "").strip()
        return ImportApiCredentials(
            base_url=saved_url or environment_url,
            token=saved_token or environment_token,
            url_source="settings" if saved_url else ("environment" if environment_url else "missing"),
            token_source="keychain" if saved_token else ("environment" if environment_token else "missing"),
        )

    def is_configured(self) -> bool:
        if not self.saved_url() and not os.getenv("AAD_IMPORT_API_URL", "").strip():
            return False
        credentials = self.resolve()
        return bool(credentials.base_url and credentials.token)

    def save(self, base_url: str, token: str | None = None) -> ImportApiCredentials:
        normalized_url = normalize_import_api_url(base_url)
        existing_token = self.saved_token()
        new_token = token.strip() if token is not None else ""
        environment_token = os.getenv("AAD_IMPORT_API_TOKEN", "").strip()
        if not new_token and not existing_token and not environment_token:
            raise ValueError("Bitte den vom Betreiber bereitgestellten Import-Token eingeben.")
        if new_token:
            self.secret_store.set(new_token)

        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps({"import_api_url": normalized_url}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.chmod(0o600)
        temporary.replace(self.path)
        self.path.chmod(0o600)
        return self.resolve()

    def delete_token(self) -> None:
        self.secret_store.delete()
