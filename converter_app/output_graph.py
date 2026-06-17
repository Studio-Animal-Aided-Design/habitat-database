from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd


@dataclass
class QualityIssue:
    severity: str
    code: str
    message: str
    entity: str
    row_index: int | None = None
    field: str | None = None


@dataclass
class EntityTable:
    name: str
    path: str
    rows: pd.DataFrame
    key_fields: list[str]
    display_fields: list[str]
    status: str
    optional: bool = False


@dataclass
class RelationDef:
    name: str
    src_entity: str
    src_field: str
    dst_entity: str
    dst_field: str


@dataclass
class OutputGraph:
    entities: dict[str, EntityTable]
    relations: list[RelationDef]
    forward_index: dict[tuple[str, int], dict[str, list[int]]] = field(default_factory=dict)
    reverse_index: dict[tuple[str, int], dict[str, list[int]]] = field(default_factory=dict)
    quality_issues: list[QualityIssue] = field(default_factory=list)


ENTITY_SPECS: list[dict] = [
    {
        "name": "species",
        "path": "species-portraits/classification/import/out/species.csv",
        # Tooljet referenziert Species über scientific_name (nicht über id).
        # In den Notebook-Baselines ist id absichtlich leer.
        "key_fields": ["scientific_name"],
        "display_fields": ["scientific_name", "common_name", "id"],
        "optional": False,
    },
    {
        "name": "species_attribute_definitions",
        "path": "species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv",
        # Referenzen laufen über slug; id ist in den Baselines leer.
        "key_fields": ["slug"],
        "display_fields": ["display_name", "slug", "level1_category_display_name", "level2_category_display_name"],
        "optional": False,
    },
    {
        "name": "species_images",
        "path": "species-portraits/images/import/out/species-images.csv",
        "key_fields": ["id"],
        "display_fields": ["species", "image_type", "image_url"],
        "optional": True,
    },
    {
        "name": "plants",
        "path": "plants/import/out/plants/all_plants.csv",
        "key_fields": ["scientific_name", "id"],
        "display_fields": ["scientific_name", "common_name", "plant_type"],
        "optional": False,
    },
    {
        "name": "habitat_elements",
        "path": "habitat-elements/import/out/habitat_elements.csv",
        "key_fields": ["id"],
        "display_fields": ["habitat_element", "habitat_element_type", "id"],
        "optional": False,
    },
    {
        "name": "habitat_element_images",
        "path": "habitat-elements/import/out/habitat_element_images.csv",
        "key_fields": ["id"],
        "display_fields": ["habitat_element", "image_type", "image_url"],
        "optional": True,
    },
    {
        "name": "habitat_element_species_relations",
        "path": "habitat-elements/import/out/habitat_element_species_relation.csv",
        "key_fields": ["id"],
        "display_fields": ["habitat_element", "species", "lifecycle_stage", "purpose"],
        "optional": False,
    },
    {
        "name": "species_attributes",
        "glob": "species-portraits/portraits/import/out/attributes/*_attributes.csv",
        "key_fields": ["id"],
        "display_fields": ["species", "attribute_slug", "attribute_value"],
        "optional": True,
    },
    {
        "name": "plant_relations",
        "glob": "plants/import/out/relations/*_species_plant_relationship.csv",
        "key_fields": ["id"],
        "display_fields": ["species", "plant", "purpose", "annotations"],
        "optional": True,
    },
]


RELATIONS: list[RelationDef] = [
    RelationDef(
        name="habitat_relation_species",
        src_entity="habitat_element_species_relations",
        src_field="species",
        dst_entity="species",
        dst_field="scientific_name",
    ),
    RelationDef(
        name="habitat_relation_habitat_element",
        src_entity="habitat_element_species_relations",
        src_field="habitat_element",
        dst_entity="habitat_elements",
        dst_field="id",
    ),
    RelationDef(
        name="species_images_species",
        src_entity="species_images",
        src_field="species",
        dst_entity="species",
        dst_field="scientific_name",
    ),
    RelationDef(
        name="habitat_images_habitat",
        src_entity="habitat_element_images",
        src_field="habitat_element",
        dst_entity="habitat_elements",
        dst_field="id",
    ),
    RelationDef(
        name="plant_rel_species",
        src_entity="plant_relations",
        src_field="species",
        dst_entity="species",
        dst_field="scientific_name",
    ),
    RelationDef(
        name="plant_rel_plant",
        src_entity="plant_relations",
        src_field="plant",
        dst_entity="plants",
        dst_field="scientific_name",
    ),
    RelationDef(
        name="species_attr_species",
        src_entity="species_attributes",
        src_field="species",
        dst_entity="species",
        dst_field="scientific_name",
    ),
    RelationDef(
        name="species_attr_definition",
        src_entity="species_attributes",
        src_field="attribute_slug",
        dst_entity="species_attribute_definitions",
        dst_field="slug",
    ),
]


def _read_csv_safe(path: Path) -> tuple[pd.DataFrame | None, str | None]:
    try:
        df = pd.read_csv(path)
        return df, None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


def _add_quality_issue(
    issues: list[QualityIssue],
    severity: str,
    code: str,
    message: str,
    entity: str,
    row_index: int | None = None,
    field: str | None = None,
) -> None:
    issues.append(
        QualityIssue(
            severity=severity,
            code=code,
            message=message,
            entity=entity,
            row_index=row_index,
            field=field,
        )
    )


def _normalize_key_value(value) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def load_output_graph(output_root: Path) -> OutputGraph:
    entities: dict[str, EntityTable] = {}
    quality_issues: list[QualityIssue] = []

    for spec in ENTITY_SPECS:
        name = spec["name"]
        key_fields = spec["key_fields"]
        display_fields = spec["display_fields"]
        optional = bool(spec.get("optional", False))

        if "path" in spec:
            path = output_root / spec["path"]
            if not path.exists():
                empty = pd.DataFrame()
                status = "missing_optional" if optional else "missing"
                entities[name] = EntityTable(
                    name=name,
                    path=str(path),
                    rows=empty,
                    key_fields=key_fields,
                    display_fields=display_fields,
                    status=status,
                    optional=optional,
                )
                _add_quality_issue(
                    quality_issues,
                    "warning" if optional else "error",
                    "MISSING_FILE",
                    f"Datei fehlt: {path}",
                    name,
                )
                continue

            df, err = _read_csv_safe(path)
            if df is None:
                entities[name] = EntityTable(
                    name=name,
                    path=str(path),
                    rows=pd.DataFrame(),
                    key_fields=key_fields,
                    display_fields=display_fields,
                    status="unreadable",
                    optional=optional,
                )
                _add_quality_issue(quality_issues, "error", "UNREADABLE_FILE", f"Nicht lesbar: {path} ({err})", name)
                continue

            entities[name] = EntityTable(
                name=name,
                path=str(path),
                rows=df.reset_index(drop=True),
                key_fields=key_fields,
                display_fields=display_fields,
                status="ok",
                optional=optional,
            )

        else:
            pattern = spec["glob"]
            files = sorted(output_root.glob(pattern))
            if not files:
                entities[name] = EntityTable(
                    name=name,
                    path=f"{output_root}/{pattern}",
                    rows=pd.DataFrame(),
                    key_fields=key_fields,
                    display_fields=display_fields,
                    status="missing_optional",
                    optional=optional,
                )
                _add_quality_issue(quality_issues, "warning", "MISSING_FILE", f"Keine Dateien gefunden: {pattern}", name)
                continue

            frames: list[pd.DataFrame] = []
            for f in files:
                df, err = _read_csv_safe(f)
                if df is None:
                    _add_quality_issue(quality_issues, "error", "UNREADABLE_FILE", f"Nicht lesbar: {f} ({err})", name)
                    continue
                df = df.copy()
                df["_source_file"] = f.name
                frames.append(df)

            merged = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
            status = "ok" if len(merged) > 0 else "unreadable"
            entities[name] = EntityTable(
                name=name,
                path=f"{output_root}/{pattern}",
                rows=merged.reset_index(drop=True),
                key_fields=key_fields,
                display_fields=display_fields,
                status=status,
                optional=optional,
            )

    # key quality checks
    for entity_name, entity in entities.items():
        if entity.rows.empty:
            continue
        for key in entity.key_fields:
            if key not in entity.rows.columns:
                _add_quality_issue(
                    quality_issues,
                    "warning",
                    "MISSING_REQUIRED_COLUMN",
                    f"Schlüsselfeld fehlt: {key}",
                    entity_name,
                    field=key,
                )
                continue

            key_series = entity.rows[key].map(_normalize_key_value)
            empty_idx = key_series[key_series == ""].index.tolist()
            for idx in empty_idx[:200]:
                _add_quality_issue(
                    quality_issues,
                    "warning",
                    "MISSING_KEY_VALUE",
                    f"Leerer Schlüsselwert in Feld '{key}'",
                    entity_name,
                    row_index=int(idx),
                    field=key,
                )

            dup_mask = (key_series != "") & key_series.duplicated(keep=False)
            if dup_mask.any():
                duplicated_values = key_series[dup_mask].unique().tolist()
                _add_quality_issue(
                    quality_issues,
                    "warning",
                    "DUPLICATE_KEY",
                    f"Duplikate im Schlüsselfeld '{key}': {duplicated_values[:8]}",
                    entity_name,
                    field=key,
                )

    forward_index: dict[tuple[str, int], dict[str, list[int]]] = {}
    reverse_index: dict[tuple[str, int], dict[str, list[int]]] = {}

    for rel in RELATIONS:
        src = entities.get(rel.src_entity)
        dst = entities.get(rel.dst_entity)
        if not src or not dst or src.rows.empty or dst.rows.empty:
            continue
        if rel.src_field not in src.rows.columns or rel.dst_field not in dst.rows.columns:
            continue

        dst_map: dict[str, list[int]] = {}
        for d_idx, d_row in dst.rows.iterrows():
            key = _normalize_key_value(d_row.get(rel.dst_field))
            if key == "":
                continue
            dst_map.setdefault(key, []).append(int(d_idx))

        src_map: dict[str, list[int]] = {}
        for s_idx, s_row in src.rows.iterrows():
            key = _normalize_key_value(s_row.get(rel.src_field))
            if key == "":
                continue
            src_map.setdefault(key, []).append(int(s_idx))

        for s_idx, s_row in src.rows.iterrows():
            src_key = _normalize_key_value(s_row.get(rel.src_field))
            linked_dst = dst_map.get(src_key, [])
            if src_key != "" and not linked_dst:
                _add_quality_issue(
                    quality_issues,
                    "warning",
                    "ORPHAN_REFERENCE",
                    f"Keine Zielreferenz für {rel.src_field}='{src_key}' in Relation '{rel.name}'",
                    rel.src_entity,
                    row_index=int(s_idx),
                    field=rel.src_field,
                )

            fkey = (rel.src_entity, int(s_idx))
            forward_index.setdefault(fkey, {}).setdefault(rel.name, []).extend(linked_dst)

            for d_idx in linked_dst:
                rkey = (rel.dst_entity, int(d_idx))
                reverse_index.setdefault(rkey, {}).setdefault(rel.name, []).append(int(s_idx))

        for d_idx, d_row in dst.rows.iterrows():
            dst_key = _normalize_key_value(d_row.get(rel.dst_field))
            linked_src = src_map.get(dst_key, []) if dst_key != "" else []
            rkey = (rel.dst_entity, int(d_idx))
            reverse_index.setdefault(rkey, {}).setdefault(rel.name, []).extend(linked_src)

    return OutputGraph(
        entities=entities,
        relations=RELATIONS,
        forward_index=forward_index,
        reverse_index=reverse_index,
        quality_issues=quality_issues,
    )
