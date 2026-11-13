"""Guard the local rehearsal's isolation and truthful result reporting."""
import importlib.util
import json
from pathlib import Path
from unittest.mock import patch

import pytest

SPEC = importlib.util.spec_from_file_location("rehearsal", Path(__file__).parents[1] / "scripts/local_rc_rehearsal.py")
rehearsal = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rehearsal)


def test_unavailable_engine_is_blocked_even_when_cli_exits_zero(tmp_path):
    (tmp_path / "run.json").write_text(json.dumps({"port": 3120}))
    commands = []

    def command(args, **kwargs):
        commands.append(args)
        return "revision" if args[:2] == ["git", "rev-parse"] else ""

    with patch.object(rehearsal, "execute", side_effect=command), patch.object(rehearsal, "compose") as compose:
        rehearsal.run_checks(tmp_path)
    evidence = json.loads((tmp_path / "evidence.json").read_text())
    assert evidence["status"] == "blocked"
    assert evidence["steps"] == []
    compose.assert_not_called()


def test_prepare_keeps_secrets_private_and_out_of_evidence(tmp_path):
    with patch.object(rehearsal, "RUNS", tmp_path), patch.object(rehearsal, "execute", return_value="revision"), patch.object(rehearsal, "compose"):
        run = rehearsal.prepare(3120)
    token = (run / "import-token").read_text()
    assert len(token) >= 32
    assert (run / "app.env").stat().st_mode & 0o777 == 0o600
    assert run.stat().st_mode & 0o777 == 0o700
    assert token not in (run / "evidence.json").read_text()
    assert "IMPORT_API_TOKEN_HASH='scrypt$" in (run / "app.env").read_text()
    assert "APP_ENV=production" in (run / "app.env").read_text()


@pytest.mark.parametrize("run_id", ["../production", "/tmp/example", "latest"])
def test_refuses_arbitrary_run_paths(run_id):
    with pytest.raises(ValueError):
        rehearsal.resolve_run(run_id)
