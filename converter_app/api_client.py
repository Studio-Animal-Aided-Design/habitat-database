from __future__ import annotations

from dataclasses import dataclass
import json
import mimetypes
import os
from pathlib import Path
import secrets
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import uuid

from .models import Issue


EXACT_IMPORT_PATHS = (
    "data/species-portraits/classification/import/out/species.csv",
    "data/species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv",
    "data/species-portraits/images/import/out/species-images.csv",
    "data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv",
    "data/plants/import/out/plants/all_plants.csv",
    "data/habitat-elements/import/out/habitat_elements.csv",
    "data/habitat-elements/import/out/habitat_element_images.csv",
    "data/habitat-elements/import/out/habitat_element_species_relation.csv",
)


@dataclass
class ImportApiError(Exception):
    status: int
    code: str
    message: str
    diagnostics: list[dict[str, Any]]

    def __str__(self) -> str:
        return f"{self.message} ({self.code}, HTTP {self.status})"


def collect_import_files(output_root: str | Path, input_root: str | Path) -> dict[str, Path]:
    output = Path(output_root)
    source = Path(input_root)
    collected: dict[str, Path] = {}

    for logical_path in EXACT_IMPORT_PATHS:
        relative = Path(logical_path).relative_to("data")
        output_candidate = output / relative
        source_candidate = source / relative
        if output_candidate.is_file():
            collected[logical_path] = output_candidate
        elif source_candidate.is_file():
            collected[logical_path] = source_candidate

    for pattern in (
        "species-portraits/portraits/import/out/attributes/*_attributes.csv",
        "plants/import/out/relations/*_species_plant_relationship.csv",
    ):
        for file in sorted(output.glob(pattern)):
            collected[f"data/{file.relative_to(output).as_posix()}"] = file
        if not any(Path(key).match(f"data/{pattern}") for key in collected):
            for file in sorted(source.glob(pattern)):
                collected[f"data/{file.relative_to(source).as_posix()}"] = file

    return dict(sorted(collected.items()))


def diagnostics_to_issues(diagnostics: list[dict[str, Any]]) -> list[Issue]:
    return [
        Issue(
            stage="app_import",
            severity=str(item.get("severity") or "error"),
            reason_code=str(item.get("code") or "IMPORT_API_ERROR"),
            message=str(item.get("messageDe") or item.get("message") or "Importfehler"),
            file=item.get("file"),
            row=item.get("row") if isinstance(item.get("row"), int) else None,
            details={
                "blocking": bool(item.get("blocking")),
                "dataset": item.get("dataset"),
                "field": item.get("field"),
                "value": item.get("value"),
                "sources": item.get("sources", []),
            },
        )
        for item in diagnostics
    ]


def _multipart_body(files: dict[str, Path], mode: str) -> tuple[bytes, str]:
    boundary = f"aad-{secrets.token_hex(16)}"
    chunks: list[bytes] = []

    def add(value: str) -> None:
        chunks.append(value.encode("utf-8"))

    add(f"--{boundary}\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n{mode}\r\n")
    for logical_path, file_path in files.items():
        mime = mimetypes.guess_type(file_path.name)[0] or "text/csv"
        add(f"--{boundary}\r\n")
        add(
            f"Content-Disposition: form-data; name=\"file:{logical_path}\"; "
            f"filename=\"{file_path.name}\"\r\n"
        )
        add(f"Content-Type: {mime}\r\n\r\n")
        chunks.append(file_path.read_bytes())
        add("\r\n")
    add(f"--{boundary}--\r\n")
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


class ImportApiClient:
    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        opener: Callable[..., Any] = urlopen,
        timeout: int = 60,
    ) -> None:
        self.base_url = (base_url or os.getenv("AAD_IMPORT_API_URL", "")).rstrip("/")
        self.token = token or os.getenv("AAD_IMPORT_API_TOKEN", "")
        self.opener = opener
        self.timeout = timeout
        if not self.base_url:
            raise ValueError("AAD_IMPORT_API_URL ist nicht gesetzt.")
        if not self.token:
            raise ValueError("AAD_IMPORT_API_TOKEN ist nicht gesetzt.")

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: bytes | None = None,
        content_type: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}
        if content_type:
            headers["Content-Type"] = content_type
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        request = Request(f"{self.base_url}{path}", data=body, headers=headers, method=method)
        try:
            with self.opener(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            try:
                payload = json.loads(error.read().decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                payload = {}
            details = payload.get("error", {})
            raise ImportApiError(
                error.code,
                str(details.get("code") or "http_error"),
                str(details.get("message") or "Die Import-API hat die Anfrage abgelehnt."),
                list(payload.get("diagnostics") or []),
            ) from error
        except URLError as error:
            raise ImportApiError(0, "connection_failed", f"Die Import-API ist nicht erreichbar: {error.reason}", []) from error
        if not payload.get("ok"):
            details = payload.get("error", {})
            raise ImportApiError(0, str(details.get("code") or "api_error"), str(details.get("message") or "Importfehler"), list(payload.get("diagnostics") or []))
        return payload

    def dry_run(self, files: dict[str, Path], mode: str = "merge", idempotency_key: str | None = None) -> dict[str, Any]:
        body, content_type = _multipart_body(files, mode)
        return self._request(
            "POST",
            "/api/imports/dry-run",
            body=body,
            content_type=content_type,
            idempotency_key=idempotency_key or str(uuid.uuid4()),
        )["run"]

    def get_status(self, run_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/imports/{run_id}")["run"]

    def apply(self, run_id: str, manifest_checksum: str, idempotency_key: str | None = None) -> dict[str, Any]:
        body = json.dumps({"manifestChecksum": manifest_checksum}).encode("utf-8")
        return self._request(
            "POST",
            f"/api/imports/{run_id}/apply",
            body=body,
            content_type="application/json",
            idempotency_key=idempotency_key or str(uuid.uuid4()),
        )["run"]
