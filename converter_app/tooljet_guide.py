from __future__ import annotations

from pathlib import Path

from .models import RunResult


IMPORT_ORDER = [
    ("species-portraits/classification/import/out/species.csv", "Species"),
    ("species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv", "SpeciesAttributeDefinitions"),
    ("species-portraits/images/import/out/species-images.csv", "SpeciesImages"),
    ("species-portraits/portraits/import/out/attributes/*.csv", "SpeciesAttributes"),
    ("plants/import/out/plants/all_plants.csv", "Plants"),
    ("plants/import/out/relations/*.csv", "SpeciesPlantRelation"),
    ("habitat-elements/import/out/habitat_elements.csv", "HabitatElements"),
    ("habitat-elements/import/out/habitat_element_images.csv", "HabitatElementImages"),
    ("habitat-elements/import/out/habitat_element_species_relation.csv", "HabitatElementSpeciesRelation"),
]


def write_tooljet_guide(run_result: RunResult, output_root: Path) -> Path:
    rows = []
    for stage in run_result.stage_results:
        for f in stage.produced_files:
            rows.append(f"- `{f}`")

    guide = [
        "# Tooljet Import Guide",
        "",
        "## 1) Empfohlene Import-Reihenfolge",
    ]
    for i, (path, table) in enumerate(IMPORT_ORDER, start=1):
        guide.append(f"{i}. `{path}` -> Tabelle `{table}`")

    guide.extend(
        [
            "",
            "## 2) Erzeugte Dateien dieser Ausführung",
            *(rows if rows else ["- Keine Dateien erzeugt"]),
            "",
            "## 3) Manuelle Checkliste in Tooljet",
            "Hinweis: Ein Teilimport ist möglich, wenn alle Abhängigkeiten der Zieltabelle bereits in Tooljet vorhanden sind. Für vollständige Neuimporte immer die oben angegebene Reihenfolge verwenden.",
            "1. Vor dem Import bestehende Daten sichern.",
            "2. CSV-Datei pro Tabelle mit UTF-8 importieren.",
            "3. Nach jedem Import Zeilenanzahl prüfen.",
            "4. Bei Relationen prüfen, ob Fremdschlüsselwerte existieren.",
            "5. Anschließend in der App Stichprobe auf 2-3 Arten durchführen.",
            "",
            "## 4) Fehlerbehandlung",
            "- Bei Warnungen zuerst `conversion-report.html` öffnen.",
            "- Danach problematische Quelldateien korrigieren und erneut starten.",
        ]
    )

    target = output_root / "tooljet-import-guide.md"
    target.write_text("\n".join(guide), encoding="utf-8")
    return target
