from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
from typing import Callable
import unicodedata

import pandas as pd

from .models import Issue, RunConfig, RunResult, StageResult
from .reason_codes import reason_message
from .utils import norm_col, slugify_de


@dataclass
class PipelineContext:
    config: RunConfig
    project_root: Path
    data_root: Path
    output_root: Path
    progress_cb: Callable[[str], None] | None = None

    def log(self, line: str) -> None:
        if self.progress_cb:
            self.progress_cb(line)


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def slugify_notebook_like(text: object) -> str:
    value = "" if text is None else str(text)
    value = unicodedata.normalize("NFC", value)
    value = value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "_", value).strip("_")
    value = re.sub(r"_{2,}", "_", value)
    return value


def _issue(stage: str, severity: str, code: str, msg: str, **kwargs) -> Issue:
    file = kwargs.pop("file", None)
    row = kwargs.pop("row", None)
    return Issue(
        stage=stage,
        severity=severity,
        reason_code=code,
        message=msg,
        file=file,
        row=row,
        details=kwargs,
    )


def _safe_read_excel(
    stage: str,
    path: Path,
    sheet_name: str,
    issues: list[Issue],
    *,
    missing_sheet_severity: str = "error",
) -> pd.DataFrame | None:
    try:
        return pd.read_excel(path, sheet_name=sheet_name)
    except ValueError:
        issues.append(
            _issue(
                stage,
                missing_sheet_severity,
                "MISSING_SHEET",
                f"{reason_message('MISSING_SHEET')} Sheet='{sheet_name}' Datei='{path.name}'",
                file=str(path),
                sheet_name=sheet_name,
            )
        )
    except Exception as exc:  # noqa: BLE001
        issues.append(
            _issue(
                stage,
                "error",
                "UNREADABLE_FILE",
                f"{reason_message('UNREADABLE_FILE')} Datei='{path.name}' Fehler='{exc}'",
                file=str(path),
            )
        )
    return None


def _ensure_cols(stage: str, df: pd.DataFrame, required: list[str], issues: list[Issue], file: Path) -> bool:
    normalized = {norm_col(c): c for c in df.columns}
    missing = [c for c in required if norm_col(c) not in normalized]
    if missing:
        issues.append(
            _issue(
                stage,
                "error",
                "MISSING_REQUIRED_COLUMN",
                f"{reason_message('MISSING_REQUIRED_COLUMN')} Fehlend: {missing}",
                file=str(file),
                missing=missing,
            )
        )
        return False
    return True


def _resolve_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    normalized = {norm_col(c): c for c in df.columns}
    for c in candidates:
        key = norm_col(c)
        if key in normalized:
            return normalized[key]
    return None


def _require_and_rename_cols(
    stage: str,
    df: pd.DataFrame,
    aliases: dict[str, list[str]],
    issues: list[Issue],
    file: Path,
) -> pd.DataFrame | None:
    missing: list[str] = []
    rename_map: dict[str, str] = {}
    for target, candidates in aliases.items():
        src = _resolve_col(df, candidates)
        if src is None:
            missing.append(target)
        else:
            rename_map[src] = target
    if missing:
        issues.append(
            _issue(
                stage,
                "error",
                "MISSING_REQUIRED_COLUMN",
                f"{reason_message('MISSING_REQUIRED_COLUMN')} Fehlend (kanonisch): {missing}",
                file=str(file),
                missing=missing,
            )
        )
        return None
    out = df.rename(columns=rename_map).copy()
    return out


def _status_from_issues(issues: list[Issue], failed: bool = False) -> str:
    if failed:
        return "failed"
    if any(i.severity == "error" for i in issues):
        return "warning"
    return "success"


def _resolve_single_source(
    ctx: PipelineContext,
    stage: str,
    base_dir: Path,
    pattern: str,
    issues: list[Issue],
    required: bool = True,
) -> Path | None:
    candidates = sorted(base_dir.glob(pattern))
    ctx.log(f"[{stage}] Suche Input unter: {base_dir}")
    ctx.log(f"[{stage}] Pattern: {pattern}")

    if not candidates:
        if required:
            issues.append(
                _issue(
                    stage,
                    "error",
                    "MISSING_FILE",
                    reason_message("MISSING_FILE"),
                    file=f"{base_dir}/{pattern}",
                )
            )
        return None

    if len(candidates) > 1:
        issues.append(
            _issue(
                stage,
                "warning",
                "DUPLICATE_INPUT",
                f"{reason_message('DUPLICATE_INPUT')} Pattern='{pattern}'",
                file=str(base_dir),
                candidates=[c.name for c in candidates],
            )
        )
        ctx.log(f"[{stage}] ⚠ Mehrere Dateien gefunden: {', '.join(c.name for c in candidates)}")

    chosen = max(candidates, key=lambda p: p.stat().st_mtime)
    ctx.log(f"[{stage}] Verwendete Datei: {chosen}")
    return chosen


def stage_species_classification(ctx: PipelineContext) -> StageResult:
    stage = "species_classification"
    issues: list[Issue] = []
    out_file = ctx.output_root / "species-portraits/classification/import/out/species.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    precomputed_file = ctx.data_root / "species-portraits/classification/import/out/species.csv"

    if precomputed_file.exists():
        ctx.log(f"[species_classification] Verwende vorhandene Import-Datei: {precomputed_file}")
        df = pd.read_csv(precomputed_file)
        df.to_csv(out_file, index=False)
        return StageResult(
            stage=stage,
            status="success",
            produced_files=[str(out_file)],
            row_counts={"species": int(len(df))},
            issues=issues,
        )

    source_file = _resolve_single_source(
        ctx,
        stage,
        ctx.data_root / "species-portraits/classification",
        "*.xlsx",
        issues,
        required=True,
    )
    if source_file is None:
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    ctx.log("[species_classification] Lese Sheet: index 0")
    df = _safe_read_excel(stage, source_file, sheet_name=0, issues=issues)
    if df is None:
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)
    ctx.log(f"[species_classification] Zeilen roh: {len(df)}")
    source_columns = list(df.columns)
    ctx.log(f"[species_classification] Quellspalten: {source_columns}")
    normalized = {norm_col(c): c for c in df.columns}

    out = pd.DataFrame()

    # Primary mapping for known 'Tierarten_Systematik' structure
    def pick(col_candidates: list[str]) -> pd.Series:
        for c in col_candidates:
            if c in normalized:
                return df[normalized[c]]
        return pd.Series([None] * len(df))

    out["scientific_name"] = pick(
        ["art_lat", "scientific_name", "name_wissenschaftlich", "wissenschaftlicher_name"]
    )
    out["alternative_scientific_name"] = None
    out["common_name"] = pick(["art_dt", "common_name", "name_deutsch", "deutscher_name"])
    out["alternative_common_name"] = pick(["art_dt2", "alternative_common_name"])
    out["class_common"] = pick(["klasse_dt", "class_common", "klasse"])
    out["class_scientific"] = pick(["klasse_lat", "class_scientific"])
    out["order_common"] = pick(["ordnung_dt", "order_common", "ordnung"])
    out["order_scientific"] = pick(["ordnung_lat", "order_scientific"])
    out["family_common"] = pick(["familie_dt", "family_common", "familie"])
    out["family_scientific"] = pick(["familie_lat", "family_scientific"])
    out["genus_common"] = pick(["gattung_dt", "genus_common", "gattung"])
    out["genus_scientific"] = pick(["gattung_lat", "genus_scientific"])

    # Notebook parity: species.csv has an empty id column in the baseline export.
    # Keep this intentionally empty so parity tests can compare 1:1.
    out["id"] = None

    target_cols = [
        "id",
        "scientific_name",
        "alternative_scientific_name",
        "common_name",
        "alternative_common_name",
        "class_common",
        "class_scientific",
        "order_common",
        "order_scientific",
        "family_common",
        "family_scientific",
        "genus_common",
        "genus_scientific",
    ]

    df = out[target_cols]
    before_filter = len(df)
    df = df.dropna(subset=["scientific_name"], how="all")
    ctx.log(
        f"[species_classification] Filter scientific_name != leer: {before_filter} -> {len(df)}"
    )
    if len(df) == 0:
        issues.append(_issue(stage, "error", "EMPTY_OUTPUT", reason_message("EMPTY_OUTPUT"), file=str(source_file)))
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    df.to_csv(out_file, index=False)
    ctx.log(f"[species_classification] Schreibe Ausgabe: {out_file}")
    return StageResult(
        stage=stage,
        status=_status_from_issues(issues),
        produced_files=[str(out_file)],
        row_counts={"species": int(len(df))},
        issues=issues,
    )


def stage_attribute_definitions(ctx: PipelineContext) -> StageResult:
    stage = "species_attribute_definitions"
    issues: list[Issue] = []
    out_file = ctx.output_root / "species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    source_file = _resolve_single_source(
        ctx,
        stage,
        ctx.data_root / "species-portraits/attribute-definitions",
        "*.xlsx",
        issues,
        required=True,
    )
    if source_file is None:
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    df = _safe_read_excel(stage, source_file, sheet_name="Portrait", issues=issues)
    if df is None:
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    df.columns = [norm_col(c) for c in df.columns]
    target_cols = [
        "id",
        "primary_sort",
        "secondary_sort",
        "level1_category",
        "level2_category",
        "level1_category_display_name",
        "level2_category_display_name",
        "field_name",
        "display_name",
        "description",
        "explanation",
        "has_sources",
        "slug",
    ]

    if "id" not in df.columns:
        df.insert(0, "id", range(1, len(df) + 1))
    if "has_sources" not in df.columns:
        df["has_sources"] = True

    for c in [
        "level1_category_display_name",
        "level2_category_display_name",
        "display_name",
    ]:
        if c not in df.columns:
            df[c] = ""

    tmp = (
        df["level1_category_display_name"].fillna("").astype(str)
        + " "
        + df["level2_category_display_name"].fillna("").astype(str)
        + " "
        + df["display_name"].fillna("").astype(str)
    )
    df["slug"] = tmp.map(slugify_notebook_like)

    for c in target_cols:
        if c not in df.columns:
            df[c] = None

    df = df[target_cols]
    df = df.dropna(subset=["display_name"], how="all")
    if len(df) == 0:
        issues.append(_issue(stage, "error", "EMPTY_OUTPUT", reason_message("EMPTY_OUTPUT")))
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    df.to_csv(out_file, index=False)
    return StageResult(stage=stage, status=_status_from_issues(issues), produced_files=[str(out_file)], row_counts={"species_attribute_definitions": int(len(df))}, issues=issues)


def stage_species_images(ctx: PipelineContext) -> StageResult:
    stage = "species_images"
    issues: list[Issue] = []
    out_file = ctx.output_root / "species-portraits/images/import/out/species-images.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    source_file = _resolve_single_source(
        ctx,
        stage,
        ctx.data_root / "species-portraits/images",
        "*.xlsx",
        issues,
        required=False,
    )
    if source_file is None:
        return StageResult(stage=stage, status="warning", issues=issues)

    df = _safe_read_excel(stage, source_file, sheet_name="Tabelle1", issues=issues)
    if df is None:
        return StageResult(stage=stage, status="warning", issues=issues)

    if len(df.columns) < 4:
        issues.append(_issue(stage, "error", "MISSING_REQUIRED_COLUMN", reason_message("MISSING_REQUIRED_COLUMN"), file=str(source_file)))
        return StageResult(stage=stage, status="warning", issues=issues)

    df = df.iloc[:, :4].copy()
    df.columns = ["common_name", "scientific_name", "portrait_image", "lifecycle_image"]

    portrait = df[["scientific_name", "portrait_image"]].copy()
    portrait.columns = ["species", "image_url"]
    portrait["image_type"] = "portrait"

    lifecycle = df[["scientific_name", "lifecycle_image"]].copy()
    lifecycle.columns = ["species", "image_url"]
    lifecycle["image_type"] = "lifecycle"

    out_df = pd.concat([portrait, lifecycle], ignore_index=True)
    out_df.insert(0, "id", range(1, len(out_df) + 1))
    out_df.insert(3, "attribution", None)
    out_df.insert(4, "image_alt", None)
    out_df = out_df[["id", "species", "image_url", "attribution", "image_alt", "image_type"]]
    out_df = out_df.dropna(subset=["species", "image_url"], how="all")

    if len(out_df) == 0:
        issues.append(_issue(stage, "error", "EMPTY_OUTPUT", reason_message("EMPTY_OUTPUT")))
        return StageResult(stage=stage, status="warning", issues=issues)

    out_df.to_csv(out_file, index=False)
    return StageResult(stage=stage, status=_status_from_issues(issues), produced_files=[str(out_file)], row_counts={"species_images": int(len(out_df))}, issues=issues)


def _extract_species_name_from_portrait(df_portrait: pd.DataFrame) -> str | None:
    cols_norm = [norm_col(c) for c in df_portrait.columns]
    mapping = dict(zip(cols_norm, df_portrait.columns))

    # 1) Preferred explicit fields.
    for c in ["scientific_name", "art_wissenschaftlich", "name_wissenschaftlich", "species"]:
        if c in mapping:
            val = df_portrait[mapping[c]].dropna()
            if len(val):
                name = " ".join(str(val.iloc[0]).strip().split())
                if name:
                    return name

    # 2) Notebook-compatible fallback:
    # In portrait workbooks, the scientific name is usually in column "Text"
    # at row 0, or in the row where category indicates "Lateinischer Name".
    text_col = mapping.get("text")
    if text_col is not None:
        category_col = None
        for cand in [
            "oberkategorie_uberschrift_level_1",
            "oberkategorie",
            "kategorie_uberschrift_level_1",
        ]:
            if cand in mapping:
                category_col = mapping[cand]
                break

        if category_col is not None:
            cat = df_portrait[category_col].fillna("").astype(str).str.lower().str.strip()
            hit = df_portrait[cat.str.contains("latein", na=False)]
            if not hit.empty:
                v = hit.iloc[0].get(text_col)
                if not pd.isna(v):
                    name = " ".join(str(v).strip().split())
                    if name:
                        return name

        vals = df_portrait[text_col].dropna().astype(str).map(lambda s: " ".join(s.strip().split()))
        vals = vals[vals != ""]
        if len(vals):
            return str(vals.iloc[0])

    return None


def stage_portrait_attributes(ctx: PipelineContext) -> StageResult:
    stage = "species_portrait_attributes"
    issues: list[Issue] = []
    out_dir = ctx.output_root / "species-portraits/portraits/import/out/attributes"
    out_dir.mkdir(parents=True, exist_ok=True)
    definitions = ctx.output_root / "species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv"
    if not definitions.exists():
        return StageResult(stage=stage, status="failed", issues=[_issue(stage, "error", "DEPENDENCY_FAILED", reason_message("DEPENDENCY_FAILED"), file=str(definitions))], blocking=True)

    defs_df = pd.read_csv(definitions)
    allowed = set(defs_df["slug"].dropna().astype(str).tolist()) if "slug" in defs_df.columns else set()

    portraits_dir = ctx.data_root / "species-portraits/portraits"
    files = sorted(portraits_dir.glob("*.xlsx"))
    if not files:
        return StageResult(stage=stage, status="warning", issues=[_issue(stage, "error", "MISSING_FILE", reason_message("MISSING_FILE"), file=str(portraits_dir))])

    produced = []
    total_rows = 0
    for f in files:
        df = _safe_read_excel(stage, f, sheet_name="Portrait", issues=issues)
        if df is None:
            continue
        species_name = _extract_species_name_from_portrait(df)
        if not species_name:
            issues.append(_issue(stage, "error", "INVALID_SPECIES_NAME", reason_message("INVALID_SPECIES_NAME"), file=str(f)))
            continue

        raw = df.copy()
        if raw.shape[1] < 9:
            issues.append(
                _issue(
                    stage,
                    "error",
                    "MISSING_REQUIRED_COLUMN",
                    f"{reason_message('MISSING_REQUIRED_COLUMN')} Datei='{f.name}' (mind. 9 Spalten benötigt)",
                    file=str(f),
                )
            )
            continue

        raw = raw.iloc[:, :9].copy()
        raw.columns = [
            "sort_1",
            "sort_2",
            "category_1",
            "category_2",
            "field_name",
            "description",
            "explanation",
            "attribute_value",
            "sources",
        ]

        slug_series = (
            raw["category_1"].fillna("").astype(str)
            + " "
            + raw["category_2"].fillna("").astype(str)
            + " "
            + raw["field_name"].fillna("").astype(str)
        ).map(slugify_notebook_like)

        out_df = pd.DataFrame(
            {
                "id": None,
                "attribute_value": raw["attribute_value"],
                "sources": raw["sources"],
                "species": species_name,
                "attribute_slug": slug_series,
            }
        )
        if allowed:
            before = len(out_df)
            out_df = out_df[out_df["attribute_slug"].isin(allowed)]
            dropped = before - len(out_df)
            if dropped > 0:
                issues.append(_issue(stage, "warning", "ROW_DROPPED", f"{dropped} Zeilen ohne gültigen Attribut-Slug verworfen.", file=str(f), dropped=dropped))

        out_df = out_df[["id", "attribute_value", "sources", "species", "attribute_slug"]]
        if len(out_df) == 0:
            issues.append(_issue(stage, "warning", "EMPTY_OUTPUT", f"Leere Ausgabe für {f.name}", file=str(f)))
            continue

        target = out_dir / f"{species_name}_attributes.csv"
        out_df.to_csv(target, index=False)
        produced.append(str(target))
        total_rows += len(out_df)

    status = _status_from_issues(issues)
    if not produced:
        status = "warning"
    return StageResult(stage=stage, status=status, produced_files=produced, row_counts={"species_attributes": total_rows}, issues=issues)


def stage_plants(ctx: PipelineContext) -> StageResult:
    stage = "plants"
    issues: list[Issue] = []
    out_file = ctx.output_root / "plants/import/out/plants/all_plants.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    portraits_dir = ctx.data_root / "species-portraits/portraits"
    rows = []
    for f in sorted(portraits_dir.glob("*.xlsx")):
        df = _safe_read_excel(
            stage,
            f,
            sheet_name="Pflanzenliste",
            issues=issues,
            missing_sheet_severity="warning",
        )
        if df is None:
            continue
        mapped = _require_and_rename_cols(
            stage,
            df,
            {
                "scientific_name": ["Art_botanisch", "Name_botanisch", "scientific_name"],
                "common_name": ["Art_deutsch", "Name_deutsch", "common_name"],
            },
            issues,
            f,
        )
        if mapped is None:
            continue
        sub = mapped[["scientific_name", "common_name"]].copy()
        sub["source_file"] = f.name
        rows.append(sub)

    combined = (
        pd.concat(rows, ignore_index=True)
        if rows
        else pd.DataFrame(columns=["scientific_name", "common_name", "source_file"])
    )
    combined = combined.drop_duplicates(subset=["scientific_name", "source_file"], keep="first")
    combined = combined.drop_duplicates(subset="scientific_name", keep="last")
    if "source_file" in combined.columns:
        combined = combined.drop(columns=["source_file"])

    plants_file = _resolve_single_source(
        ctx,
        stage,
        ctx.data_root / "plants",
        "*Pflanzenliste_Pflanzentyp_Datenbank.xlsx",
        issues,
        required=True,
    )
    plants_df = None
    if plants_file and plants_file.exists():
        src_df = _safe_read_excel(stage, plants_file, sheet_name=0, issues=issues)
        if src_df is not None and len(src_df.columns) >= 7:
            src_df = src_df.iloc[:, :7].copy()
            src_df.columns = [
                "scientific_name",
                "common_name",
                "plant_type",
                "growing_height",
                "flowering_time",
                "is_native",
                "local_fauna_importance",
            ]
            plants_df = src_df
    else:
        issues.append(_issue(stage, "error", "MISSING_FILE", reason_message("MISSING_FILE"), file=str(ctx.data_root / "plants")))

    if plants_df is None:
        enriched = combined.copy()
        for c in ["plant_type", "flowering_time", "is_native", "local_fauna_importance"]:
            enriched[c] = None
    else:
        enriched = pd.merge(combined, plants_df, on="scientific_name", how="outer", suffixes=("_combined", "_plants"))
        if "common_name_plants" in enriched.columns and "common_name_combined" in enriched.columns:
            enriched["common_name"] = enriched["common_name_plants"].combine_first(enriched["common_name_combined"])
            enriched = enriched.drop(columns=["common_name_plants", "common_name_combined"])

    for c in ["scientific_name", "common_name", "plant_type", "flowering_time", "is_native", "local_fauna_importance"]:
        if c not in enriched.columns:
            enriched[c] = None

    enriched = enriched[["scientific_name", "common_name", "plant_type", "flowering_time", "is_native", "local_fauna_importance"]]
    enriched = enriched.drop_duplicates(subset="scientific_name", keep="first")
    enriched = enriched.dropna(subset=["common_name"], how="all")
    enriched.insert(2, "id", range(1, len(enriched) + 1))

    if len(enriched) == 0:
        issues.append(_issue(stage, "error", "EMPTY_OUTPUT", reason_message("EMPTY_OUTPUT")))
        return StageResult(stage=stage, status="warning", issues=issues)

    enriched.to_csv(out_file, index=False)
    return StageResult(stage=stage, status=_status_from_issues(issues), produced_files=[str(out_file)], row_counts={"plants": int(len(enriched))}, issues=issues)


def stage_plant_relations(ctx: PipelineContext) -> StageResult:
    stage = "plant_relations"
    issues: list[Issue] = []
    out_dir = ctx.output_root / "plants/import/out/relations"
    out_dir.mkdir(parents=True, exist_ok=True)

    produced = []
    total_rows = 0
    for f in sorted((ctx.data_root / "species-portraits/portraits").glob("*.xlsx")):
        df_plants = _safe_read_excel(
            stage,
            f,
            sheet_name="Pflanzenliste",
            issues=issues,
            missing_sheet_severity="warning",
        )
        if df_plants is None:
            continue
        mapped = _require_and_rename_cols(
            stage,
            df_plants,
            {
                "scientific_name": ["scientific_name", "Art_botanisch", "Name_botanisch"],
                "purpose": ["Zweck", "purpose"],
                "annotations": ["Anmerkungen", "annotations"],
                "sources": ["Quelle", "sources", "source"],
            },
            issues,
            f,
        )
        if mapped is None:
            continue
        df_portrait = _safe_read_excel(stage, f, sheet_name="Portrait", issues=issues)
        if df_portrait is None:
            continue
        species_name = _extract_species_name_from_portrait(df_portrait)
        if not species_name:
            issues.append(_issue(stage, "error", "INVALID_SPECIES_NAME", reason_message("INVALID_SPECIES_NAME"), file=str(f)))
            continue
        out_df = pd.DataFrame()
        out_df["plant"] = mapped["scientific_name"]
        out_df["purpose"] = mapped["purpose"]
        out_df["annotations"] = mapped["annotations"]
        out_df["sources"] = mapped["sources"]
        out_df.insert(0, "species", species_name)
        out_df.insert(0, "id", range(1, len(out_df) + 1))
        target = out_dir / f"{species_name}_species_plant_relationship.csv"
        out_df.to_csv(target, index=False)
        produced.append(str(target))
        total_rows += len(out_df)

    status = _status_from_issues(issues)
    if not produced:
        status = "warning"
    return StageResult(stage=stage, status=status, produced_files=produced, row_counts={"plant_relations": total_rows}, issues=issues)


def stage_habitat_elements(ctx: PipelineContext) -> StageResult:
    stage = "habitat_elements"
    issues: list[Issue] = []
    out_file = ctx.output_root / "habitat-elements/import/out/habitat_elements.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    src = _resolve_single_source(
        ctx,
        stage,
        ctx.data_root / "habitat-elements",
        "*NEB AAD Habitatelemente Zielarten.xlsx",
        issues,
        required=True,
    )
    if src is None:
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    df = _safe_read_excel(stage, src, sheet_name="Habitatelemente", issues=issues)
    if df is None:
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    if len(df.columns) < 8:
        issues.append(_issue(stage, "error", "MISSING_REQUIRED_COLUMN", reason_message("MISSING_REQUIRED_COLUMN"), file=str(src)))
        return StageResult(stage=stage, status="failed", issues=issues, blocking=True)

    df = df.iloc[:, :8].copy()
    df.columns = [
        "habitat_element_type",
        "habitat_element",
        "size",
        "location",
        "measure_description",
        "maintenance",
        "combined_with",
        "image_url",
    ]
    df["id"] = df["habitat_element"].map(slugify_de)
    out_df = df[["id", "habitat_element", "habitat_element_type", "size", "location", "measure_description", "maintenance", "combined_with"]]
    out_df.to_csv(out_file, index=False)

    return StageResult(stage=stage, status=_status_from_issues(issues), produced_files=[str(out_file)], row_counts={"habitat_elements": int(len(out_df))}, issues=issues)


def stage_habitat_element_images(ctx: PipelineContext) -> StageResult:
    stage = "habitat_element_images"
    issues: list[Issue] = []
    out_file = ctx.output_root / "habitat-elements/import/out/habitat_element_images.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    src = _resolve_single_source(
        ctx,
        stage,
        ctx.data_root / "habitat-elements",
        "*NEB AAD Habitatelemente Zielarten.xlsx",
        issues,
        required=False,
    )
    if src is None:
        return StageResult(stage=stage, status="warning", issues=issues)
    df = _safe_read_excel(stage, src, sheet_name="Habitatelemente", issues=issues)
    if df is None:
        return StageResult(stage=stage, status="warning", issues=issues)
    if len(df.columns) < 8:
        issues.append(_issue(stage, "error", "MISSING_REQUIRED_COLUMN", reason_message("MISSING_REQUIRED_COLUMN"), file=str(src)))
        return StageResult(stage=stage, status="warning", issues=issues)

    df = df.iloc[:, :8].copy()
    df.columns = [
        "habitat_element_type",
        "habitat_element",
        "size",
        "location",
        "measure_description",
        "maintenance",
        "combined_with",
        "image_url",
    ]
    images = df[["habitat_element", "image_url"]].copy()
    images["image_type"] = "portrait"
    images["image_alt"] = images["habitat_element"]
    images["habitat_element"] = images["habitat_element"].map(slugify_de)
    images.insert(0, "id", range(1, len(images) + 1))
    images.insert(3, "attribution", "Studio Animal-Aided Design")
    images = images[["id", "habitat_element", "image_url", "image_alt", "attribution", "image_type"]]
    images.to_csv(out_file, index=False)
    return StageResult(stage=stage, status=_status_from_issues(issues), produced_files=[str(out_file)], row_counts={"habitat_element_images": int(len(images))}, issues=issues)


def stage_habitat_element_species_relations(ctx: PipelineContext) -> StageResult:
    stage = "habitat_element_species_relations"
    issues: list[Issue] = []
    out_file = ctx.output_root / "habitat-elements/import/out/habitat_element_species_relation.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    src = _resolve_single_source(
        ctx,
        stage,
        ctx.data_root / "habitat-elements",
        "*NEB AAD Habitatelemente Zielarten.xlsx",
        issues,
        required=False,
    )
    if src is None:
        return StageResult(stage=stage, status="warning", issues=issues)
    df = _safe_read_excel(stage, src, sheet_name="Habitatelemente_Zielarten", issues=issues)
    if df is None:
        return StageResult(stage=stage, status="warning", issues=issues)

    species_file = ctx.output_root / "species-portraits/classification/import/out/species.csv"
    habitat_file = ctx.output_root / "habitat-elements/import/out/habitat_elements.csv"
    if not species_file.exists() or not habitat_file.exists():
        return StageResult(
            stage=stage,
            status="failed",
            issues=[_issue(stage, "error", "DEPENDENCY_FAILED", reason_message("DEPENDENCY_FAILED"), file=f"{species_file} / {habitat_file}")],
            blocking=True,
        )

    species_df = pd.read_csv(species_file)
    if len(df.columns) < 5:
        issues.append(_issue(stage, "error", "MISSING_REQUIRED_COLUMN", reason_message("MISSING_REQUIRED_COLUMN"), file=str(src)))
        return StageResult(stage=stage, status="warning", issues=issues)

    df = df.iloc[:, :5].copy()
    df.columns = ["habitat_element", "purpose", "purpose_element", "species_name", "lifecycle_stage"]
    df["habitat_element"] = df["habitat_element"].map(slugify_de)

    map_df = species_df[[c for c in ["common_name", "scientific_name"] if c in species_df.columns]].copy()
    if len(map_df.columns) == 2:
        map_df.columns = ["common_name", "scientific_name"]
        df = df.merge(map_df, left_on="species_name", right_on="common_name", how="left")
        df["species"] = df["scientific_name"]
    else:
        df["species"] = None

    df = df[["habitat_element", "species", "lifecycle_stage", "purpose", "purpose_element"]]
    df.insert(0, "id", range(1, len(df) + 1))

    habitat_df = pd.read_csv(habitat_file)
    valid_ids = set(habitat_df["id"].astype(str).tolist()) if "id" in habitat_df.columns else set()
    before = len(df)
    df = df[df["habitat_element"].astype(str).isin(valid_ids)]
    dropped = before - len(df)
    if dropped > 0:
        issues.append(_issue(stage, "warning", "ROW_DROPPED", f"{dropped} Relationen ohne gültiges Habitatelement entfernt.", dropped=dropped))

    df.to_csv(out_file, index=False)
    return StageResult(stage=stage, status=_status_from_issues(issues), produced_files=[str(out_file)], row_counts={"habitat_element_species_relations": int(len(df))}, issues=issues)


def build_context(config: RunConfig) -> PipelineContext:
    output_root = Path(config.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    project_root = Path(__file__).resolve().parents[1]
    data_root = Path(config.input_root)
    return PipelineContext(config=config, project_root=project_root, data_root=data_root, output_root=output_root)


def run_pipeline(config: RunConfig, progress_cb: Callable[[str], None] | None = None) -> RunResult:
    ctx = build_context(config)
    ctx.progress_cb = progress_cb
    result = RunResult(config=config, started_at=now_iso())

    ordered = [
        stage_species_classification,
        stage_attribute_definitions,
        stage_portrait_attributes,
        stage_species_images,
        stage_plants,
        stage_plant_relations,
        stage_habitat_elements,
        stage_habitat_element_images,
        stage_habitat_element_species_relations,
    ]

    for fn in ordered:
        if progress_cb:
            progress_cb(f"Starte Stufe: {fn.__name__}")
        sr = fn(ctx)
        result.stage_results.append(sr)
        if progress_cb:
            progress_cb(f"Stufe {sr.stage}: {sr.status}")
        if sr.blocking and sr.status == "failed":
            if progress_cb:
                progress_cb(f"Abbruch wegen blockierendem Fehler in {sr.stage}")
            break

    statuses = [s.status for s in result.stage_results]
    if any(s == "failed" for s in statuses):
        result.overall_status = "failed"
    elif any(s == "warning" for s in statuses):
        result.overall_status = "warning"
    else:
        result.overall_status = "success"

    result.finished_at = now_iso()
    return result
