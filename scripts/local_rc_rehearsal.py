#!/usr/bin/env python3
"""Exercise the IONOS images on loopback with a new, isolated PostgreSQL volume.

prepare requires only the Compose CLI; run requires a running Docker engine and
the converter Python dependencies. Evidence is technical, never customer sign-off.
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / ".local" / "rc-runs"
TABLES = (
    "species", "plants", "habitat_elements", "species_attribute_definitions",
    "species_attribute_values", "media_assets", "species_media", "habitat_element_media",
    "plant_media", "species_plant_relations", "species_habitat_relations",
    "entity_aliases", "species_lifecycle_phases",
)


def execute(args: list[str], *, timeout: int = 1800) -> str:
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        # Do not echo env-file content or command output containing credentials.
        raise RuntimeError(f"Command failed ({result.returncode}): {args[0]} {args[1]}")
    return result.stdout


def write_private(path: Path, text: str) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        stream.write(text)


def prepare(port: int) -> Path:
    if not 1024 <= port <= 65535:
        raise ValueError("Use an unprivileged local port (1024–65535).")
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + secrets.token_hex(3)
    run = RUNS / run_id
    run.mkdir(parents=True, mode=0o700)
    password, token = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    salt = secrets.token_bytes(16)
    b64 = lambda value: base64.urlsafe_b64encode(value).decode().rstrip("=")
    digest = hashlib.scrypt(token.encode(), salt=salt, n=16384, r=8, p=1, dklen=64)
    token_hash = f"scrypt${b64(salt)}${b64(digest)}"
    db = f"POSTGRES_USER=aad_rc\nPOSTGRES_DB=aad_rc\nPOSTGRES_PASSWORD={password}\n"
    # Literal $ must survive Compose's env-file interpolation.
    app = (
        "APP_ENV=production\nCATALOG_DATA_SOURCE=postgres\nALLOW_MOCK_CATALOG_IN_PREVIEW=false\n"
        f"DATABASE_URL=postgresql://aad_rc:{password}@preview-db:5432/aad_rc\n"
        "PREVIEW_ACCESS_MODE=off\nIMPORT_API_ENABLED=true\n"
        f"IMPORT_API_TOKEN_HASH='{token_hash}'\nIMPORT_STAGING_ROOT=/var/lib/aad/import-staging\n"
    )
    for name, value in (("db.env", db), ("app.env", app), ("import-token", token)):
        write_private(run / name, value)
    values = {
        "ACME_EMAIL": "unused@example.invalid", "PREVIEW_DOMAIN": "preview.invalid",
        "PRODUCTION_DOMAIN": "production.invalid", "LOCAL_RC_PORT": str(port),
        "AAD_APP_IMAGE": "aad-local-105", "AAD_APP_TAG": run_id.lower(),
        "PREVIEW_APP_ENV_FILE": str(run / "app.env"),
        "PRODUCTION_APP_ENV_FILE": str(run / "app.env"),
        "PREVIEW_DB_ENV_FILE": str(run / "db.env"),
        "PRODUCTION_DB_ENV_FILE": str(run / "db.env"),
    }
    write_private(run / "project.env", "".join(f"{key}={value}\n" for key, value in values.items()))
    revision = execute(["git", "rev-parse", "HEAD"]).strip()
    metadata = {"project": "aad-local-105-" + run_id.lower(), "port": port, "revision": revision}
    write_private(run / "run.json", json.dumps(metadata, indent=2) + "\n")
    compose(run, "config", "--quiet")
    save_report(run, {"status": "prepared", "revision": revision, "steps": [],
                      "limits": "No Docker execution, GUI, TLS, preview login or IONOS proof yet."})
    return run


def resolve_run(value: str) -> Path:
    if not re.fullmatch(r"\d{8}T\d{6}Z-[0-9a-f]{6}", value):
        raise ValueError("Use the run ID printed by prepare.")
    run = RUNS / value
    if run.is_symlink() or not (run / "run.json").is_file():
        raise ValueError("Unknown rehearsal run.")
    return run


def compose(run: Path, *args: str) -> str:
    meta = json.loads((run / "run.json").read_text())
    # Never accept a supplied remote engine or production project.
    endpoint = execute(["docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], timeout=15).strip()
    if not endpoint.startswith("unix://") or os.getenv("DOCKER_HOST") or os.getenv("COMPOSE_PROFILES"):
        raise ValueError("Use a local Unix-socket Docker context without DOCKER_HOST/COMPOSE_PROFILES.")
    return execute([
        "docker", "compose", "--project-name", meta["project"], "--env-file", str(run / "project.env"),
        "-f", str(ROOT / "deploy/ionos/compose.yaml"),
        "-f", str(ROOT / "deploy/ionos/compose.local.yaml"), *args,
    ])


def save_report(run: Path, report: dict) -> None:
    report["recordedAt"] = datetime.now(timezone.utc).isoformat()
    (run / "evidence.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")


def sql(run: Path, query: str) -> str:
    return compose(run, "exec", "-T", "preview-db", "psql", "-U", "aad_rc", "-d", "aad_rc", "-At", "-c", query).strip()


def snapshot(run: Path) -> dict:
    result = {}
    for table in TABLES:
        # Ignore bookkeeping timestamps; preserve all business values and IDs.
        rows = sql(run, f"SELECT (to_jsonb(t)-'created_at'-'updated_at')::text FROM {table} t ORDER BY 1")
        result[table] = {"rows": len(rows.splitlines()) if rows else 0,
                         "sha256": hashlib.sha256(rows.encode()).hexdigest()}
    return result


def run_checks(run: Path) -> None:
    meta = json.loads((run / "run.json").read_text())
    report = {"status": "running", "revision": execute(["git", "rev-parse", "HEAD"]).strip(),
              "dirty": bool(execute(["git", "status", "--porcelain"]).strip()),
              "environment": f"http://127.0.0.1:{meta['port']}", "steps": [],
              "limits": "CLI integration only. Native GUI, TLS, preview access and IONOS remain separate UAT."}

    def passed(name: str, **details) -> None:
        report["steps"].append({"name": name, "status": "passed", **details})
        save_report(run, report)
        print(f"OK: {name}", flush=True)

    try:
        try:
            server_version = execute(["docker", "info", "--format", "{{.ServerVersion}}"], timeout=15).strip()
            if not server_version:
                raise RuntimeError("Docker returned no server version.")
        except (RuntimeError, subprocess.TimeoutExpired):
            report["status"] = "blocked"
            report["reason"] = "Local Docker engine is unavailable. Start Docker Desktop, then run this ID again."
            save_report(run, report)
            print(report["reason"])
            return
        compose(run, "config", "--quiet")
        passed("Compose configuration")
        print("Building web and migration images …", flush=True)
        compose(run, "build", "preview-app", "preview-db-tools")
        passed("Container images built")
        compose(run, "up", "-d", "--wait", "preview-db")
        compose(run, "--profile", "ops", "run", "--rm", "preview-db-tools", "db:migrate")
        empty = snapshot(run)
        if any(value["rows"] for value in empty.values()):
            raise RuntimeError("Rehearsal DB is not empty. Prepare a new run; existing volumes are preserved.")
        passed("Migrations and empty business tables", database=empty)
        compose(run, "up", "-d", "--wait", "preview-app")
        base_url = report["environment"]

        def page(path: str) -> str:
            with urlopen(base_url + path, timeout=20) as response:
                return response.read().decode()

        page("/species")
        passed("Public catalogue responds before import")
        sys.path.insert(0, str(ROOT))
        from converter_app.api_client import ImportApiClient, ImportApiError, collect_import_files
        from converter_app.models import RunConfig
        from converter_app.pipeline import run_pipeline
        from converter_app.reporting import write_html_report, write_json_report

        def rejected(action, status: int) -> None:
            try:
                action()
            except ImportApiError as error:
                if error.status == status:
                    return
                raise RuntimeError(f"Expected HTTP {status}, received {error.status}.") from None
            raise RuntimeError(f"Expected HTTP {status}, request unexpectedly succeeded.")

        client = ImportApiClient(base_url, (run / "import-token").read_text(), timeout=120)
        client.test_connection()
        rejected(ImportApiClient(base_url, "invalid-local-token").test_connection, 401)
        passed("Connection and invalid-token rejection")
        output = run / "conversion-output"
        result = run_pipeline(RunConfig(input_root=str(ROOT / "data"), output_root=str(output)))
        write_json_report(result, output)
        write_html_report(result, output)
        if result.overall_status not in {"success", "warning"}:
            raise RuntimeError("Converter pipeline failed; inspect the local conversion report.")
        files = collect_import_files(output, ROOT / "data")
        report["files"] = {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in files.items()}
        passed("Converter creates import snapshot", fileCount=len(files), result=result.overall_status)
        dry = client.dry_run(files)
        if dry["status"] != "dry_run_succeeded" or snapshot(run) != empty:
            raise RuntimeError("Dry-run changed business data or did not succeed.")
        report["manifestChecksum"] = dry["manifestChecksum"]
        passed("Dry-run leaves business data unchanged", datasets=dry["report"]["datasets"])
        rejected(lambda: client.apply(dry["id"], "wrong-checksum"), 409)
        if snapshot(run) != empty:
            raise RuntimeError("Rejected apply changed business data.")
        passed("Wrong-checksum rejection")
        key = secrets.token_hex(16)
        applied = client.apply(dry["id"], dry["manifestChecksum"], key)
        after = snapshot(run)
        if applied["status"] != "applied" or after["species"]["rows"] == 0:
            raise RuntimeError("Apply did not populate the canonical species table.")
        client.apply(dry["id"], dry["manifestChecksum"], key)
        if snapshot(run) != after:
            raise RuntimeError("Apply retry changed business data.")
        if "Gimpel" not in page("/species"):
            raise RuntimeError("Imported representative species is missing from the public catalogue.")
        passed("Apply, idempotent retry and public data", database=after)
        second = client.dry_run(files)
        client.apply(second["id"], second["manifestChecksum"])
        if snapshot(run) != after:
            raise RuntimeError("Second identical import changed business data.")
        passed("Second import preserves business values and IDs", datasets=second["report"]["datasets"])
        broken = run / "invalid-species.csv"
        broken.write_text("invalid_header\ninvalid_row\n")
        invalid_files = {**files, "data/species-portraits/classification/import/out/species.csv": broken}
        rejected(lambda: client.dry_run(invalid_files), 422)
        if snapshot(run) != after:
            raise RuntimeError("Invalid CSV changed business data.")
        remaining = compose(run, "exec", "-T", "preview-app", "node", "-e",
                            "console.log(require('fs').readdirSync('/var/lib/aad/import-staging').length)").strip()
        if remaining != "0":
            raise RuntimeError("Staged upload directories remain after applied/invalid imports.")
        passed("Invalid CSV rejected atomically and staging cleaned")
        audit = sql(run, "SELECT action || ':' || count(*) FROM audit_events GROUP BY action ORDER BY action")
        if "import.dry_run:" not in audit or "import.applied:" not in audit:
            raise RuntimeError("Expected dry-run/apply audit events are missing.")
        passed("Audit events persisted", actions=audit.splitlines())
        compose(run, "restart", "preview-app")
        for _ in range(30):
            try:
                page("/health")
                break
            except OSError:
                time.sleep(1)
        if snapshot(run) != after or "Gimpel" not in page("/species"):
            raise RuntimeError("Data missing after app restart.")
        passed("Database and public view survive app restart")
        report["status"] = "passed"
    except Exception as error:
        report["status"] = "failed"
        # Exception messages from the API may include uploaded values; retain only type.
        report["failureType"] = type(error).__name__
        if type(error) in (RuntimeError, ValueError):
            report["reason"] = str(error)
        print(f"Rehearsal failed ({type(error).__name__}); last successful step is recorded.", file=sys.stderr)
        raise RuntimeError("Local rehearsal failed; inspect evidence.json.") from None
    finally:
        save_report(run, report)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("prepare", "run", "stop", "status"))
    parser.add_argument("run_id", nargs="?")
    parser.add_argument("--port", type=int, default=3120)
    args = parser.parse_args()
    if args.action == "prepare":
        run = prepare(args.port)
        print(f"Prepared: {run.name}\nEvidence: {run / 'evidence.json'}")
        return
    if not args.run_id:
        parser.error("run, stop and status require a run ID")
    run = resolve_run(args.run_id)
    if args.action == "run":
        run_checks(run)
        if json.loads((run / "evidence.json").read_text())["status"] != "passed":
            raise SystemExit(2)
    elif args.action == "stop":
        compose(run, "down")  # Deliberately preserve named volumes and all evidence.
    else:
        print((run / "evidence.json").read_text())


if __name__ == "__main__":
    main()
