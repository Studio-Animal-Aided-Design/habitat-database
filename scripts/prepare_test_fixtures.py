#!/usr/bin/env python3
from __future__ import annotations

import shutil
from pathlib import Path


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    fixture_root = repo / "tests/fixtures"
    fixture_input = fixture_root / "current_input"
    fixture_expected = fixture_root / "expected_output"

    src_input = repo / "data"
    src_expected = repo / "data"

    fixture_root.mkdir(parents=True, exist_ok=True)

    # Input fixtures: full data tree as used by converter.
    copy_tree(src_input, fixture_input)

    # Expected outputs from notebook workflow (already located under data/**/import/out)
    if fixture_expected.exists():
        shutil.rmtree(fixture_expected)
    fixture_expected.mkdir(parents=True, exist_ok=True)

    rel_targets = [
        "species-portraits/classification/import/out",
        "species-portraits/attribute-definitions/import/out",
        "species-portraits/images/import/out",
        "species-portraits/portraits/import/out/attributes",
        "plants/import/out/plants",
        "plants/import/out/relations",
        "habitat-elements/import/out",
    ]

    for rel in rel_targets:
        src = src_expected / rel
        dst = fixture_expected / rel
        if src.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copytree(src, dst)

    print(f"Prepared input fixtures: {fixture_input}")
    print(f"Prepared expected baselines: {fixture_expected}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
