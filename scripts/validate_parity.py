#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from itertools import zip_longest

TARGETS = [
    "species-portraits/classification/import/out/species.csv",
    "species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv",
    "species-portraits/images/import/out/species-images.csv",
    "plants/import/out/plants/all_plants.csv",
    "habitat-elements/import/out/habitat_elements.csv",
    "habitat-elements/import/out/habitat_element_images.csv",
    "habitat-elements/import/out/habitat_element_species_relation.csv",
]
WILDCARD_TARGETS = [
    "species-portraits/portraits/import/out/attributes/*.csv",
    "plants/import/out/relations/*.csv",
]


def csv_rows(path: Path) -> tuple[list[str], list[list[str]]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, [])
        rows = [row for row in reader]
    if header:
        header[0] = header[0].lstrip("\ufeff")
    return header, rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline-root", default="data", help="Baseline root (notebook outputs)")
    ap.add_argument("--candidate-root", default="dist/conversion-output", help="New converter output root")
    args = ap.parse_args()

    baseline = Path(args.baseline_root)
    candidate = Path(args.candidate_root)
    failed = 0

    for rel in TARGETS:
        b = baseline / rel
        c = candidate / rel
        print(f"\n[{rel}]")
        if not b.exists() or not c.exists():
            print(f"MISSING: baseline={b.exists()} candidate={c.exists()}")
            failed += 1
            continue
        hb, rb = csv_rows(b)
        hc, rc = csv_rows(c)
        print(f"rows baseline={len(rb)} candidate={len(rc)}")
        print(f"header baseline={hb}")
        print(f"header candidate={hc}")
        if hb != hc:
            print("HEADER MISMATCH")
            failed += 1
            continue
        if rb != rc:
            print("CONTENT MISMATCH")
            for i, (br, cr) in enumerate(zip_longest(rb, rc, fillvalue=[]), start=1):
                if br != cr:
                    print(f"first diff row={i}")
                    print(f"baseline:  {br}")
                    print(f"candidate: {cr}")
                    break
            failed += 1

    for pattern in WILDCARD_TARGETS:
        print(f"\n[pattern {pattern}]")
        b_files = sorted(baseline.glob(pattern))
        c_files = sorted(candidate.glob(pattern))
        b_rel = [str(p.relative_to(baseline)) for p in b_files]
        c_rel = [str(p.relative_to(candidate)) for p in c_files]
        if b_rel != c_rel:
            print("FILE-SET MISMATCH")
            print(f"baseline files={len(b_rel)} candidate files={len(c_rel)}")
            missing = sorted(set(b_rel) - set(c_rel))
            extra = sorted(set(c_rel) - set(b_rel))
            if missing:
                print("missing in candidate:")
                for m in missing[:20]:
                    print(f"  - {m}")
            if extra:
                print("extra in candidate:")
                for e in extra[:20]:
                    print(f"  - {e}")
            failed += 1
            continue

        print(f"files={len(b_rel)}")
        for rel in b_rel:
            b = baseline / rel
            c = candidate / rel
            hb, rb = csv_rows(b)
            hc, rc = csv_rows(c)
            if hb != hc:
                print(f"HEADER MISMATCH in {rel}")
                failed += 1
                continue
            if rb != rc:
                print(f"CONTENT MISMATCH in {rel}")
                for i, (br, cr) in enumerate(zip_longest(rb, rc, fillvalue=[]), start=1):
                    if br != cr:
                        print(f"first diff row={i}")
                        print(f"baseline:  {br}")
                        print(f"candidate: {cr}")
                        break
                failed += 1

    if failed:
        print(f"\nParity checks finished with {failed} mismatches.")
        return 1
    print("\nParity checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
