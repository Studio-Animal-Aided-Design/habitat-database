from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import pandas as pd

from .models import RunConfig
from .output_viewer import open_output_data_viewer
from .pipeline import run_pipeline
from .reporting import write_html_report, write_json_report
from .tooljet_guide import write_tooljet_guide


FIX_HINTS_DE = {
    "MISSING_FILE": "Prüfen, ob die Datei am erwarteten Ort liegt und nicht umbenannt wurde.",
    "MISSING_SHEET": "Excel-Datei öffnen und prüfen, ob das erwartete Tabellenblatt existiert (z. B. 'Portrait', 'Pflanzenliste').",
    "MISSING_REQUIRED_COLUMN": "Spaltennamen in der Excel-Datei prüfen und an die erwarteten Namen anpassen.",
    "INVALID_SPECIES_NAME": "Im Blatt 'Portrait' einen gültigen wissenschaftlichen Artnamen ergänzen.",
    "UNREADABLE_FILE": "Datei schließen (falls in Excel geöffnet) und erneut versuchen; ggf. Datei reparieren.",
    "EMPTY_OUTPUT": "Quelldaten prüfen: Es wurden keine verwertbaren Zeilen gefunden.",
    "DEPENDENCY_FAILED": "Zuerst die vorherige blockierende Stufe beheben und dann neu starten.",
    "ROW_DROPPED": "Hinweise prüfen; einzelne Zeilen enthalten unvollständige oder ungültige Daten.",
    "DUPLICATE_INPUT": "Nur eine Datei soll aktiv sein. Alte/duplizierte Versionen verschieben oder umbenennen.",
}


class App(tk.Tk):
    TOOLJET_DATABASE_URL = "https://app.tooljet.ai/studio-animal-aided-design/database"
    TOOLJET_IMPORT_STEPS = [
        {
            "order": 1,
            "csv_glob": "species-portraits/classification/import/out/species.csv",
            "table": "Species",
            "depends_on": "-",
            "summary": "Arten-Grundtabelle mit wissenschaftlichen und deutschen Namen",
        },
        {
            "order": 2,
            "csv_glob": "species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv",
            "table": "SpeciesAttributeDefinitions",
            "depends_on": "Species",
            "summary": "Metadaten für den Eigenschaftsbrowser der Arten",
        },
        {
            "order": 3,
            "csv_glob": "species-portraits/images/import/out/species-images.csv",
            "table": "SpeciesImages",
            "depends_on": "Species",
            "summary": "Portrait- und Lebenszyklusbilder der Arten",
        },
        {
            "order": 4,
            "csv_glob": "species-portraits/portraits/import/out/attributes/*_attributes.csv",
            "table": "SpeciesAttributes",
            "depends_on": "Species + SpeciesAttributeDefinitions",
            "summary": "Attributwerte der Arten; kann aus mehreren CSV-Dateien bestehen",
        },
        {
            "order": 5,
            "csv_glob": "plants/import/out/plants/all_plants.csv",
            "table": "Plants",
            "depends_on": "-",
            "summary": "Pflanzen-Stammdaten",
        },
        {
            "order": 6,
            "csv_glob": "plants/import/out/relations/*_species_plant_relationship.csv",
            "table": "SpeciesPlantRelation",
            "depends_on": "Species + Plants",
            "summary": "Beziehungen zwischen Arten und Pflanzen; kann aus mehreren CSV-Dateien bestehen",
        },
        {
            "order": 7,
            "csv_glob": "habitat-elements/import/out/habitat_elements.csv",
            "table": "HabitatElements",
            "depends_on": "-",
            "summary": "Habitatelemente-Stammdaten",
        },
        {
            "order": 8,
            "csv_glob": "habitat-elements/import/out/habitat_element_images.csv",
            "table": "HabitatElementImages",
            "depends_on": "HabitatElements",
            "summary": "Bild-URLs der Habitatelemente",
        },
        {
            "order": 9,
            "csv_glob": "habitat-elements/import/out/habitat_element_species_relation.csv",
            "table": "HabitatElementSpeciesRelation",
            "depends_on": "Species + HabitatElements",
            "summary": "Beziehungen zwischen Habitatelementen und Zielarten",
        },
    ]
    EXPECTED_SOURCES = [
        ("Artenklassifikation", "species-portraits/classification", "*.xlsx", 1, True, True),
        ("Attribut-Definitionen", "species-portraits/attribute-definitions", "*.xlsx", 1, True, True),
        ("Arten-Bilder", "species-portraits/images", "*.xlsx", 1, False, True),
        ("Arten-Portraits", "species-portraits/portraits", "*.xlsx", 1, True, False),
        ("Pflanzen-Master", "plants", "*Pflanzenliste_Pflanzentyp_Datenbank.xlsx", 1, True, True),
        ("Habitat-Quelle", "habitat-elements", "*NEB AAD Habitatelemente Zielarten.xlsx", 1, True, True),
    ]
    EXPECTED_OUTPUTS = [
        ("Species", "species-portraits/classification/import/out/species.csv", ["id", "scientific_name", "common_name"]),
        ("Attribute Definitions", "species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv", ["id", "display_name", "slug"]),
        ("Species Images", "species-portraits/images/import/out/species-images.csv", ["id", "species", "image_url", "image_type"]),
        ("Plants", "plants/import/out/plants/all_plants.csv", ["scientific_name", "common_name", "id"]),
        ("Habitat Elements", "habitat-elements/import/out/habitat_elements.csv", ["id", "habitat_element", "habitat_element_type"]),
        ("Habitat Element Images", "habitat-elements/import/out/habitat_element_images.csv", ["id", "habitat_element", "image_url", "image_type"]),
        ("Habitat-Species Relations", "habitat-elements/import/out/habitat_element_species_relation.csv", ["id", "habitat_element", "species"]),
    ]
    HELP_TEXT_DE = {
        "Überblick": """AAD Converter – Hilfe

Ziel:
Diese App konvertiert Excel-Quelldaten in CSV-Dateien für den Tooljet-Import.

So funktioniert es:
1) Quellordner wählen (normal: .../habitat-database/data)
2) Ausgabeordner wählen (z. B. .../dist/conversion-output)
3) Daten-Inventar prüfen (grün/rot, Duplikate, fehlende Dateien)
4) Konvertierung starten
5) Ergebnisdateien + conversion-report + tooljet-import-guide prüfen

Wichtig:
- Die GUI und die CLI nutzen dieselbe Pipeline-Logik.
- Bei blockierenden Fehlern stoppt die Pipeline früh, damit keine inkonsistenten Folgeausgaben entstehen.
- Alle gefundenen Probleme erscheinen zusätzlich in Schritt 5 als strukturierte Tabelle.
""",
        "Eingabedaten": """Erforderliche Eingabedaten (Stand der aktuellen Pipeline)

1) species-portraits/classification/*.xlsx
   - Verwendet: neueste passende Datei
   - Sheet: erstes Sheet (Index 0)
   - Erwartete Quellspalten (typisch):
     Tier_ID, Art_lat, Art_lat2, Art_dt, Art_dt2, Klasse_dt, Klasse_lat,
     Ordnung_dt, Ordnung_lat, Familie_dt, Familie_lat, Gattung_dt, Gattung_lat

2) species-portraits/attribute-definitions/*.xlsx
   - Verwendet: neueste passende Datei
   - Sheet: Portrait

3) species-portraits/images/*.xlsx (optional)
   - Verwendet: neueste passende Datei
   - Sheet: Tabelle1 (mind. 4 Spalten)

4) species-portraits/portraits/*.xlsx
   - Pro Datei:
     - Sheet Portrait für Artenattribute und Artnamen
     - Sheet Pflanzenliste für Pflanzen-/Relationsdaten (falls vorhanden)

5) plants/*Pflanzenliste_Pflanzentyp_Datenbank.xlsx
   - Verwendet: neueste passende Datei
   - Sheet: erstes Sheet (mind. 7 Spalten)

6) habitat-elements/*NEB AAD Habitatelemente Zielarten.xlsx
   - Verwendet: neueste passende Datei
   - Sheets: Habitatelemente, Habitatelemente_Zielarten

Hinweis zu Zeitstempeln:
- Präfixe wie 20241106_... sind variabel; die App matcht über Pattern (*...).
""",
        "Outputs": """Erzeugte Hauptausgaben

Die wichtigsten CSV-Ziele:
- species-portraits/classification/import/out/species.csv
- species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv
- species-portraits/images/import/out/species-images.csv
- species-portraits/portraits/import/out/attributes/*_attributes.csv
- plants/import/out/plants/all_plants.csv
- plants/import/out/relations/*_species_plant_relationship.csv
- habitat-elements/import/out/habitat_elements.csv
- habitat-elements/import/out/habitat_element_images.csv
- habitat-elements/import/out/habitat_element_species_relation.csv

Zusätzlich im Ausgabeordner:
- conversion-report.json
- conversion-report.html
- tooljet-import-guide.md

Empfohlene Import-Reihenfolge in Tooljet:
1) species
2) species-attribute-definitions
3) species-images
4) species-attributes
5) plants
6) species-plant-relations
7) habitat-elements
8) habitat-element-images
9) habitat-element-species-relations
""",
        "Troubleshooting": """Häufige Probleme & Lösungen

MISSING_FILE
- Eine erwartete Datei fehlt (oder Pattern trifft nichts).
- Lösung: Pfad, Dateiname, Ordnerstruktur prüfen.

MISSING_SHEET
- Erwartetes Sheet fehlt (z. B. Portrait, Pflanzenliste, Tabelle1, Habitatelemente).
- Lösung: Datei öffnen und Sheet-Namen exakt prüfen.

MISSING_REQUIRED_COLUMN
- Erforderliche Spalten fehlen.
- Beispiele:
  - Pflanzen-Relationen: scientific_name, Zweck, Anmerkungen, Quelle
  - Pflanzen-Master: mindestens 7 Spalten im Master-XLSX
- Lösung: Spaltennamen korrigieren oder Datenformat anpassen.

EMPTY_OUTPUT
- Nach Filterung keine verwertbaren Zeilen.
- Beispiel species_classification: scientific_name leer nach Mapping.
- Lösung: Quellspalteninhalte prüfen.

INVALID_SPECIES_NAME
- Artname konnte aus Portrait nicht ermittelt werden.
- Lösung: wissenschaftlichen Namen im Portrait-Sheet ergänzen.

DUPLICATE_INPUT
- Mehrere passende Dateien für einen Singleton-Input.
- Verhalten: App nimmt die neueste Datei (mtime) und warnt.
- Lösung: alte/temporäre Dateien entfernen (z. B. ~$...).

ROW_DROPPED
- Zeilen wurden entfernt (z. B. ungültiger Slug, fehlende Referenz).
- Lösung: Report prüfen und Quellwerte korrigieren.

UNREADABLE_FILE
- Datei gesperrt/defekt/nicht lesbar.
- Lösung: Datei schließen, erneut speichern, neu versuchen.

DEPENDENCY_FAILED (blockierend)
- Vorstufe fehlgeschlagen; spätere Stufe kann nicht laufen.
- Beispiel: fehlende species.csv oder habitat_elements.csv für Relationsstufen.
""",
        "Datenqualität": """Datenqualität – wichtige Prüfungen vor Import

1) Eindeutigkeit
- IDs/Schlüssel sollten innerhalb einer Zieltabelle eindeutig sein.
- Die Pipeline prüft nicht überall harte Eindeutigkeit; Duplikate können erst im Tooljet-Import auffallen.

2) Referenzintegrität
- Relationstabellen müssen auf existierende Primärwerte zeigen.
- Beispiel habitat_element_species_relation:
  habitat_element muss in habitat_elements.id existieren (sonst wird Zeile verworfen).

3) Datentyp/Format
- Excel-Textfelder mit gemischten Werten können zu leeren oder unerwarteten Feldern führen.
- Vor allem wissenschaftliche Namen und Pflichtspalten auf Leerwerte prüfen.

4) Temporäre Office-Dateien
- Dateien wie ~$*.xlsx erzeugen Duplikat-Warnungen.
- Vor Konvertierung löschen oder verschieben.

5) Sichtprüfung
- In der App Datei-Viewer + Tabellenansicht nutzen.
- Nach Konvertierung conversion-report.html + tooljet-import-guide.md prüfen.
- Schritt 5 "Probleme & Lösungen" verwenden, um Fehler systematisch abzuarbeiten.
""",
    }
    WIZARD_HELP_DE = {
        "Willkommen": "Dieser Wizard führt Sie Schritt für Schritt durch Auswahl, Prüfung und Konvertierung der Quelldaten.",
        "Quelldaten": "Wählen Sie den Ordner mit den Rohdaten (normalerweise .../habitat-database/data). Der Wizard zeigt danach, was gefunden wurde.",
        "Ausgabe": "Wählen Sie einen Ausgabeordner. Dort schreibt die App CSV-Dateien, den JSON/HTML-Report und die Tooljet-Import-Hilfe.",
        "Preflight": "Die Vorprüfung prüft Kernordner und Daten-Inventar. Rot/DUPlIKAT/FEHLT zuerst bereinigen, dann weiter.",
        "Konvertierung": "Die Konvertierung läuft in Stufen. Bei blockierenden Fehlern stoppt sie und zeigt Ursachen + Lösungshinweise.",
        "Ergebnis": "Nutzen Sie die Importübersicht in diesem Schritt, um die erzeugten CSV-Dateien in der richtigen Reihenfolge nach Tooljet hochzuladen.",
    }
    TOOLJET_UPLOAD_HINT_DE = """Tooljet-Import (Habitat-Datenbank)
1) Öffnen Sie die Tabelle in Tooljet.
2) Importieren Sie CSV-Dateien in dieser Reihenfolge:
   species -> species-attribute-definitions -> species-images -> species-attributes
   -> plants -> species-plant-relations -> habitat-elements
   -> habitat-element-images -> habitat-element-species-relations
3) Nach jedem Import Zeilenanzahl und Pflichtfelder prüfen.
4) Bei Fehlern conversion-report.html und 'Probleme & Lösungen' verwenden."""

    TOOLJET_IMPORT_EXPLAINER_DE = (
        "Vollimport: Verwenden Sie die unten gezeigte Reihenfolge von 1 bis 9. "
        "Teilimporte sind möglich, wenn alle fachlichen Abhängigkeiten der Zieltabelle bereits in Tooljet vorhanden und aktuell sind. "
        "Wenn Sie nur einen Teil importieren, arbeiten Sie trotzdem innerhalb dieses Teilpfads strikt in der gezeigten Reihenfolge. "
        "Beispiel: SpeciesAttributes nur dann importieren, wenn Species und SpeciesAttributeDefinitions bereits vorhanden sind."
    )

    def __init__(self) -> None:
        super().__init__()
        self.title("AAD Converter für Tooljet")
        self.geometry("980x700")

        self.input_var = tk.StringVar(value=str(Path("data").resolve()))
        self.output_var = tk.StringVar(value=str((Path("dist") / "conversion-output").resolve()))
        self.status_var = tk.StringVar(value="Bereit")
        self.last_result = None
        self._issues_paths: dict[str, str] = {}
        self._wiz_issues_paths: dict[str, str] = {}
        self._app_icon_ref: tk.PhotoImage | None = None

        self._set_app_icon()

        self._build_menubar()
        self._build_ui()
        self._show_source_inventory()
        self.bind("<Configure>", self._on_window_resize)
        self.after(120, self._ask_start_mode)

    def _set_app_icon(self) -> None:
        assets_dir = Path(__file__).resolve().parents[1] / "assets"
        icon_path = assets_dir / "aad-icon-macos-1024.png"
        if not icon_path.exists():
            icon_path = assets_dir / "aad-icon-large.png"
        if not icon_path.exists():
            return
        try:
            img = tk.PhotoImage(file=str(icon_path))
            self.iconphoto(True, img)
            self._app_icon_ref = img
        except Exception:
            # Best effort only; app should still run if icon cannot be loaded.
            self._app_icon_ref = None

    def _build_menubar(self) -> None:
        menubar = tk.Menu(self)

        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Dateien ansehen", command=self.open_source_viewer)
        file_menu.add_command(label="Ergebnisdaten prüfen", command=self.open_output_viewer)
        file_menu.add_command(label="Quellordner im Finder öffnen", command=self.open_source_in_finder)
        file_menu.add_command(label="Ausgabeordner im Finder öffnen", command=self.open_output_in_finder)
        file_menu.add_separator()
        file_menu.add_command(label="Beenden", command=self.destroy)
        menubar.add_cascade(label="Datei", menu=file_menu)

        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="Hilfe öffnen", command=self.open_help_window)
        help_menu.add_command(label="Handbuch (PDF) öffnen", command=self.open_handbook_pdf)
        help_menu.add_command(label="Wizard starten", command=self.open_wizard)
        menubar.add_cascade(label="Hilfe", menu=help_menu)

        self.config(menu=menubar)

    def _build_ui(self) -> None:
        outer = ttk.Frame(self)
        outer.pack(fill="both", expand=True)

        content_host = ttk.Frame(outer)
        content_host.pack(fill="both", expand=True)

        self.main_canvas = tk.Canvas(content_host, highlightthickness=0)
        self.main_vscroll = ttk.Scrollbar(content_host, orient="vertical", command=self.main_canvas.yview)
        self.main_canvas.configure(yscrollcommand=self.main_vscroll.set)
        self.main_canvas.pack(side="left", fill="both", expand=True)
        self.main_vscroll.pack(side="right", fill="y")

        self.main_content = ttk.Frame(self.main_canvas, padding=16)
        self.main_canvas_window = self.main_canvas.create_window((0, 0), window=self.main_content, anchor="nw")
        frame = self.main_content

        def _sync_main_scrollregion(_event=None) -> None:
            self.main_canvas.configure(scrollregion=self.main_canvas.bbox("all"))

        def _sync_main_content_width(_event=None) -> None:
            self.main_canvas.itemconfigure(self.main_canvas_window, width=self.main_canvas.winfo_width())
            self.main_canvas.configure(scrollregion=self.main_canvas.bbox("all"))

        self.main_content.bind("<Configure>", _sync_main_scrollregion)
        self.main_canvas.bind("<Configure>", _sync_main_content_width)

        def _on_mousewheel(event):
            # macOS/Windows compatible wheel handling
            if event.delta:
                self.main_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            else:
                # Linux fallback (Button-4/5)
                direction = -1 if getattr(event, "num", None) == 4 else 1
                self.main_canvas.yview_scroll(direction, "units")

        self.main_canvas.bind_all("<MouseWheel>", _on_mousewheel)
        self.main_canvas.bind_all("<Button-4>", _on_mousewheel)
        self.main_canvas.bind_all("<Button-5>", _on_mousewheel)

        ttk.Label(frame, text="Quelldaten", font=("Helvetica", 14, "bold")).pack(anchor="w")
        row1 = ttk.Frame(frame)
        row1.pack(fill="x", pady=6)
        ttk.Entry(row1, textvariable=self.input_var).pack(side="left", fill="x", expand=True)
        ttk.Button(row1, text="Ordner wählen", command=self.pick_input).pack(side="left", padx=8)
        source_actions = ttk.Frame(frame)
        source_actions.pack(fill="x", pady=(0, 10))
        ttk.Button(source_actions, text="🗂️ Dateien ansehen", command=self.open_source_viewer).pack(side="left")
        ttk.Button(source_actions, text="📂 Quellordner im Finder öffnen", command=self.open_source_in_finder).pack(side="left", padx=8)
        ttk.Button(source_actions, text="🔄 Inventar aktualisieren", command=self._show_source_inventory).pack(side="left", padx=8)

        ttk.Label(frame, text="Ausgabeordner", font=("Helvetica", 14, "bold")).pack(anchor="w", pady=(8, 0))
        row2 = ttk.Frame(frame)
        row2.pack(fill="x", pady=6)
        ttk.Entry(row2, textvariable=self.output_var).pack(side="left", fill="x", expand=True)
        ttk.Button(row2, text="Ordner wählen", command=self.pick_output).pack(side="left", padx=8)
        output_actions = ttk.Frame(frame)
        output_actions.pack(fill="x", pady=(0, 10))
        ttk.Button(output_actions, text="📂 Ausgabeordner im Finder öffnen", command=self.open_output_in_finder).pack(side="left")
        ttk.Button(output_actions, text="📊 Ergebnisdaten-Viewer öffnen", command=self.open_output_viewer).pack(side="left", padx=8)

        btns = ttk.Frame(frame)
        btns.pack(fill="x", pady=8)

        self.toolbar_buttons: list[tuple[ttk.Button, str, str]] = []
        self._add_toolbar_button(btns, "🧪 Preflight prüfen", "🧪 Preflight", self.preflight, padx=0)
        self._add_toolbar_button(btns, "▶️ Konvertierung starten", "▶️ Start", self.run_conversion, padx=8)
        self._add_toolbar_button(btns, "💾 Konfiguration speichern", "💾 Speichern", self.save_config, padx=8)
        self._add_toolbar_button(btns, "❓ Hilfe", "❓", self.open_help_window, padx=8)

        inv_body = self._create_collapsible_section(frame, "Daten-Inventar", key="step3", expanded=True)
        inv = ttk.Panedwindow(inv_body, orient="horizontal")
        inv.pack(fill="both", expand=True, pady=(6, 10))

        left = ttk.Frame(inv)
        right = ttk.Frame(inv)
        inv.add(left, weight=1)
        inv.add(right, weight=1)

        ttk.Label(left, text="Erwartete Inputs / Status", font=("Helvetica", 11, "bold")).pack(anchor="w", pady=(0, 4))
        self.inventory_table = ttk.Treeview(
            left,
            columns=("dataset", "expected", "found", "status"),
            show="headings",
            height=8,
        )
        self.inventory_table.heading("dataset", text="Datensatz")
        self.inventory_table.heading("expected", text="Erwartet")
        self.inventory_table.heading("found", text="Gefunden")
        self.inventory_table.heading("status", text="Status")
        self.inventory_table.column("dataset", width=190, anchor="w")
        self.inventory_table.column("expected", width=220, anchor="w")
        self.inventory_table.column("found", width=80, anchor="center")
        self.inventory_table.column("status", width=110, anchor="center")
        self.inventory_table.tag_configure("ok", foreground="#1b5e20")
        self.inventory_table.tag_configure("warn", foreground="#b26a00")
        self.inventory_table.tag_configure("missing", foreground="#b00020")
        self.inventory_table.tag_configure("conflict", foreground="#b00020")
        self.inventory_table.pack(fill="both", expand=True)

        ttk.Label(right, text="Gefundene relevante Dateien", font=("Helvetica", 11, "bold")).pack(anchor="w", pady=(0, 4))
        self.found_tree = ttk.Treeview(right, show="tree", height=8)
        self.found_tree.tag_configure("group_ok", foreground="#1b5e20")
        self.found_tree.tag_configure("group_missing", foreground="#b00020")
        self.found_tree.tag_configure("group_conflict", foreground="#b00020")
        self.found_tree.pack(fill="both", expand=True)
        self.found_tree.bind("<Double-1>", self._open_viewer_from_main_tree)

        # Bottom status bar (always at very bottom).
        status_bar = ttk.Frame(outer, padding=(10, 6))
        status_bar.pack(side="bottom", fill="x")
        ttk.Label(status_bar, textvariable=self.status_var).pack(side="left")

        # Separator between bottom dock and status bar.
        status_sep = tk.Frame(outer, height=1, bg="#c8c8c8")
        status_sep.pack(side="bottom", fill="x")

        # Sticky Bottom Dock (outside scroll content): tabs for logs/results and issues/solutions.
        self.bottom_dock = ttk.Frame(outer, padding=0)
        self.bottom_dock.pack(side="bottom", fill="x")

        bottom_header = ttk.Frame(self.bottom_dock)
        bottom_header.pack(fill="x")
        self.bottom_expanded = True
        self.bottom_toggle_btn = ttk.Button(
            bottom_header,
            text="▼ Logs & Probleme",
            command=self._toggle_bottom_bar,
        )
        self.bottom_toggle_btn.pack(side="left", padx=(0, 4), pady=0)

        self.bottom_body = ttk.Frame(self.bottom_dock)
        self.bottom_body.pack(fill="both", expand=True, pady=0)

        self.bottom_tabs = ttk.Notebook(self.bottom_body)
        self.bottom_tabs.pack(fill="both", expand=True, pady=0)

        logs_tab = ttk.Frame(self.bottom_tabs)
        issues_tab = ttk.Frame(self.bottom_tabs)
        outputs_tab = ttk.Frame(self.bottom_tabs)
        self.bottom_tabs.add(logs_tab, text="Logs & Ergebnisse")
        self.bottom_tabs.add(issues_tab, text="Probleme & Lösungen")
        self.bottom_tabs.add(outputs_tab, text="Ergebnis-Dateien")

        self.log = tk.Text(logs_tab, height=14, wrap="none")
        self.log.pack(fill="both", expand=True, pady=0)
        self.log.configure(state="disabled")

        logs_actions = ttk.Frame(logs_tab)
        logs_actions.pack(fill="x", pady=(6, 0))
        ttk.Button(logs_actions, text="📂 Ausgabeordner im Finder öffnen", command=self.open_output_in_finder).pack(side="left")
        ttk.Button(logs_actions, text="📊 Ergebnisdaten-Viewer öffnen", command=self.open_output_viewer).pack(side="left", padx=8)

        issues_wrap = ttk.Frame(issues_tab)
        issues_wrap.pack(fill="both", expand=True, pady=0)

        self.issues_table = ttk.Treeview(
            issues_wrap,
            columns=("severity", "stage", "code", "beschreibung", "datei", "fix"),
            show="headings",
            height=8,
        )
        self.issues_table.heading("severity", text="Severity")
        self.issues_table.heading("stage", text="Stufe")
        self.issues_table.heading("code", text="Code")
        self.issues_table.heading("beschreibung", text="Beschreibung")
        self.issues_table.heading("datei", text="Datei")
        self.issues_table.heading("fix", text="So beheben")
        self.issues_table.column("severity", width=80, anchor="center")
        self.issues_table.column("stage", width=180, anchor="w")
        self.issues_table.column("code", width=150, anchor="w")
        self.issues_table.column("beschreibung", width=370, anchor="w")
        self.issues_table.column("datei", width=360, anchor="e")
        self.issues_table.column("fix", width=420, anchor="w")
        self.issues_table.tag_configure("sev_error", foreground="#b00020")
        self.issues_table.tag_configure("sev_warning", foreground="#b26a00")
        self.issues_table.grid(row=0, column=0, sticky="nsew")
        self.issues_table.bind("<Double-1>", lambda e: self._open_issue_file_from_table(self.issues_table, self._issues_paths, e))

        issues_scroll_y = ttk.Scrollbar(issues_wrap, orient="vertical", command=self.issues_table.yview)
        issues_scroll_y.grid(row=0, column=1, sticky="ns")
        issues_scroll_x = ttk.Scrollbar(issues_wrap, orient="horizontal", command=self.issues_table.xview)
        issues_scroll_x.grid(row=1, column=0, sticky="ew")
        issues_wrap.grid_rowconfigure(0, weight=1)
        issues_wrap.grid_columnconfigure(0, weight=1)
        self.issues_table.configure(yscrollcommand=issues_scroll_y.set, xscrollcommand=issues_scroll_x.set)

        output_actions_tab = ttk.Frame(outputs_tab)
        output_actions_tab.pack(fill="x", padx=6, pady=6)
        ttk.Button(output_actions_tab, text="🔄 Aktualisieren", command=self._refresh_output_inventory_tree).pack(side="left")
        ttk.Button(output_actions_tab, text="📂 Ausgabeordner im Finder öffnen", command=self.open_output_in_finder).pack(side="left", padx=8)
        ttk.Button(output_actions_tab, text="📊 Ergebnisdaten-Viewer öffnen", command=self.open_output_viewer).pack(side="left", padx=8)

        output_split = ttk.Panedwindow(outputs_tab, orient="horizontal")
        output_split.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        output_left = ttk.Frame(output_split)
        output_right = ttk.Frame(output_split)
        output_split.add(output_left, weight=1)
        output_split.add(output_right, weight=2)

        self.output_tree = ttk.Treeview(output_left, show="tree")
        self.output_tree.pack(fill="both", expand=True, side="left")
        output_tree_scroll = ttk.Scrollbar(output_left, orient="vertical", command=self.output_tree.yview)
        output_tree_scroll.pack(fill="y", side="right")
        self.output_tree.configure(yscrollcommand=output_tree_scroll.set)

        self.output_preview = tk.Text(output_right, wrap="none")
        self.output_preview.pack(fill="both", expand=True, side="left")
        output_preview_scroll_y = ttk.Scrollbar(output_right, orient="vertical", command=self.output_preview.yview)
        output_preview_scroll_y.pack(fill="y", side="right")
        self.output_preview.configure(yscrollcommand=output_preview_scroll_y.set, state="disabled")

        self.output_tree.bind("<<TreeviewSelect>>", self._on_output_tree_select)
        self.output_tree.bind("<Double-1>", self._on_output_tree_open)

        # Separator above the bottom dock.
        dock_sep = tk.Frame(outer, height=1, bg="#c8c8c8")
        dock_sep.pack(side="bottom", fill="x")
        self._refresh_output_inventory_tree()

    def _create_collapsible_section(self, parent: ttk.Frame, title: str, key: str, expanded: bool = True) -> ttk.Frame:
        if not hasattr(self, "_section_state"):
            self._section_state = {}

        wrap = ttk.Frame(parent)
        wrap.pack(fill="both", expand=True, pady=(2, 0))

        header = ttk.Frame(wrap)
        header.pack(fill="x")
        body = ttk.Frame(wrap)

        state = {"expanded": expanded}

        def render_header_text() -> str:
            return f"{'▼' if state['expanded'] else '▶'} {title}"

        def toggle() -> None:
            state["expanded"] = not state["expanded"]
            if state["expanded"]:
                body.pack(fill="both", expand=True)
            else:
                body.pack_forget()
            btn.configure(text=render_header_text())
            self.main_canvas.configure(scrollregion=self.main_canvas.bbox("all"))

        btn = ttk.Button(header, text=render_header_text(), command=toggle)
        btn.pack(anchor="w")

        if state["expanded"]:
            body.pack(fill="both", expand=True)

        self._section_state[key] = {"state": state, "button": btn, "body": body}
        return body

    def _add_toolbar_button(
        self,
        parent: ttk.Frame,
        full_label: str,
        short_label: str,
        command,
        padx: int,
    ) -> None:
        btn = ttk.Button(parent, text=full_label, command=command)
        btn.pack(side="left", padx=padx)
        self.toolbar_buttons.append((btn, full_label, short_label))

    def _toggle_bottom_bar(self) -> None:
        self.bottom_expanded = not self.bottom_expanded
        if self.bottom_expanded:
            self.bottom_body.pack(fill="both", expand=True, pady=0)
            self.bottom_toggle_btn.configure(text="▼ Bottom-Bar: Logs & Probleme")
            self.bottom_dock.configure(padding=0)
        else:
            self.bottom_body.pack_forget()
            self.bottom_toggle_btn.configure(text="▶ Bottom-Bar: Logs & Probleme")
            self.bottom_dock.configure(padding=0)

    def _on_window_resize(self, _event=None) -> None:
        self._update_toolbar_labels()

    def _update_toolbar_labels(self) -> None:
        # Simple adaptive truncation strategy by window width.
        width = self.winfo_width()
        if width <= 0:
            return

        if width < 980:
            for btn, full, short in self.toolbar_buttons:
                btn.configure(text=short)
        else:
            for btn, full, short in self.toolbar_buttons:
                btn.configure(text=full)

    def pick_input(self) -> None:
        path = filedialog.askdirectory(initialdir=self.input_var.get() or ".")
        if path:
            self.input_var.set(path)
            self._append_log(f"[SOURCE] Neuer Quellordner: {path}")
            self._show_source_inventory()

    def pick_output(self) -> None:
        path = filedialog.askdirectory(initialdir=self.output_var.get() or ".")
        if path:
            self.output_var.set(path)
            self._refresh_output_inventory_tree()

    def _append_log(self, line: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", line + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _append_result_summary(self, result) -> None:
        self._append_log("[RUN][DETAILS] Zusammenfassung pro Stufe:")
        for stage in result.stage_results:
            blocking = " (BLOCKIEREND)" if stage.blocking else ""
            self._append_log(f"- {stage.stage}: {stage.status}{blocking}")

            if stage.row_counts:
                for key, val in stage.row_counts.items():
                    self._append_log(f"    Zeilen {key}: {val}")

            if stage.issues:
                for issue in stage.issues:
                    file_part = f" | Datei: {issue.file}" if issue.file else ""
                    self._append_log(
                        f"    [{issue.severity.upper()}] {issue.reason_code}: {issue.message}{file_part}"
                    )
                    hint = FIX_HINTS_DE.get(issue.reason_code)
                    if hint:
                        self._append_log(f"      -> Vorschlag: {hint}")

        blocking_stage = next(
            (s for s in result.stage_results if s.blocking and s.status == "failed"),
            None,
        )
        if blocking_stage is not None:
            self._append_log(
                f"[RUN][BLOCKER] Die Konvertierung wurde in '{blocking_stage.stage}' gestoppt. "
                "Bitte die oben genannten Fehler beheben und erneut starten."
            )

    def _populate_issues_table(self, result) -> None:
        self.issues_table.delete(*self.issues_table.get_children())
        self._issues_paths = {}

        rows = []
        for stage in result.stage_results:
            for issue in stage.issues:
                hint = FIX_HINTS_DE.get(
                    issue.reason_code,
                    "Bitte conversion-report.html öffnen und Eingabedaten/Format prüfen.",
                )
                file_val = issue.file or "-"
                file_display = self._display_path_tail(file_val)
                rows.append(
                    (
                        issue.severity.upper(),
                        stage.stage,
                        issue.reason_code,
                        issue.message,
                        file_display,
                        hint,
                        file_val,
                        "sev_error" if issue.severity == "error" else "sev_warning",
                    )
                )

        if not rows:
            self.issues_table.insert(
                "",
                "end",
                values=("OK", "-", "-", "Keine Probleme oder Warnungen erkannt.", "-", "-",),
            )
            return

        for sev, stg, code, desc, file_display, fix, file_raw, tag in rows:
            iid = self.issues_table.insert(
                "",
                "end",
                values=(sev, stg, code, desc, file_display, fix),
                tags=(tag,),
            )
            self._issues_paths[iid] = file_raw

    def _build_config(self) -> RunConfig:
        return RunConfig(
            input_root=self.input_var.get().strip(),
            output_root=self.output_var.get().strip(),
            mode="tolerant",
            locale="de",
        )

    def _ask_start_mode(self) -> None:
        dlg = tk.Toplevel(self)
        dlg.title("App-Modus wählen")
        dlg.geometry("520x230")
        dlg.transient(self)
        dlg.grab_set()
        dlg.resizable(False, False)

        wrap = ttk.Frame(dlg, padding=16)
        wrap.pack(fill="both", expand=True)
        ttk.Label(wrap, text="App-Modus wählen", font=("Helvetica", 13, "bold")).pack(anchor="w")
        ttk.Label(
            wrap,
            text=(
                "Wizard (geführt): Schritt-für-Schritt-Ansicht mit erklärender Hilfe.\n"
                "Direktmodus (freie Arbeitsansicht): klassische Gesamtansicht mit allen Bereichen gleichzeitig."
            ),
        ).pack(anchor="w", pady=(8, 14))

        btns = ttk.Frame(wrap)
        btns.pack(fill="x")

        def use_wizard() -> None:
            dlg.destroy()
            self.open_wizard()

        ttk.Button(btns, text="Wizard (geführt)", command=use_wizard).pack(side="left")
        ttk.Button(btns, text="Direktmodus (freie Arbeitsansicht)", command=dlg.destroy).pack(side="left", padx=8)

    def _build_config_from_values(self, input_root: str, output_root: str) -> RunConfig:
        return RunConfig(
            input_root=input_root.strip(),
            output_root=output_root.strip(),
            mode="tolerant",
            locale="de",
        )

    def _run_conversion_async(self, cfg: RunConfig, on_line, on_done) -> None:
        def worker() -> None:
            on_line("[RUN] Konvertierung gestartet")

            def cb(line: str) -> None:
                self.after(0, lambda: on_line(line))

            result = run_pipeline(cfg, progress_cb=cb)
            out = Path(cfg.output_root)
            out.mkdir(parents=True, exist_ok=True)
            json_report = write_json_report(result, out)
            html_report = write_html_report(result, out)
            guide = write_tooljet_guide(result, out)
            self.after(0, lambda: on_done(result, json_report, html_report, guide))

        threading.Thread(target=worker, daemon=True).start()

    def open_source_in_finder(self) -> None:
        cfg = self._build_config()
        root = Path(cfg.input_root)
        if not root.exists():
            messagebox.showerror("Quellordner", f"Ordner existiert nicht:\n{root}")
            return
        self._open_in_finder(root)

    def open_output_in_finder(self) -> None:
        cfg = self._build_config()
        root = Path(cfg.output_root)
        if not root.exists():
            messagebox.showerror("Ausgabeordner", f"Ordner existiert nicht:\n{root}")
            return
        self._open_in_finder(root)

    def _display_path_tail(self, path_value: str, max_chars: int = 72) -> str:
        if not path_value or path_value == "-":
            return "-"
        txt = str(path_value).strip()
        if len(txt) <= max_chars:
            return txt
        return "…" + txt[-(max_chars - 1) :]

    def _open_in_finder(self, target: Path) -> None:
        if target.is_file():
            subprocess.run(["open", "-R", str(target)], check=False)
            return
        if target.is_dir():
            subprocess.run(["open", str(target)], check=False)
            return
        parent = target.parent
        if parent.exists():
            subprocess.run(["open", str(parent)], check=False)
            return
        messagebox.showerror("Finder", f"Pfad nicht gefunden:\n{target}")

    def _open_issue_file_from_table(self, table: ttk.Treeview, path_map: dict[str, str], _event=None) -> None:
        sel = table.selection()
        if not sel:
            return
        iid = sel[0]
        raw = path_map.get(iid, "-")
        if not raw or raw == "-":
            return
        path = Path(raw)
        self._open_in_finder(path)

    def _refresh_output_inventory_tree(self) -> None:
        if not hasattr(self, "output_tree"):
            return
        self.output_tree.delete(*self.output_tree.get_children())
        out_root = Path(self.output_var.get().strip())
        self._set_output_preview_text("")
        if not out_root.exists():
            self.output_tree.insert("", "end", text=f"Ordner fehlt: {out_root}", values=[str(out_root)])
            return

        root_id = self.output_tree.insert("", "end", text=f"📁 {out_root}", values=[str(out_root)], open=True)

        def insert_dir(parent_id: str, path: Path, depth: int = 0) -> None:
            if depth > 6:
                self.output_tree.insert(parent_id, "end", text="... (Tiefe begrenzt)")
                return
            entries = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
            for entry in entries:
                if entry.name.startswith("."):
                    continue
                if entry.is_dir():
                    node = self.output_tree.insert(parent_id, "end", text=f"📁 {entry.name}", values=[str(entry)])
                    insert_dir(node, entry, depth + 1)
                else:
                    self.output_tree.insert(parent_id, "end", text=f"📄 {entry.name}", values=[str(entry)])

        insert_dir(root_id, out_root)

    def _set_output_preview_text(self, text: str) -> None:
        self.output_preview.configure(state="normal")
        self.output_preview.delete("1.0", "end")
        if text:
            self.output_preview.insert("1.0", text)
        self.output_preview.configure(state="disabled")

    def _on_output_tree_select(self, _event=None) -> None:
        sel = self.output_tree.selection()
        if not sel:
            return
        item = sel[0]
        values = self.output_tree.item(item).get("values") or []
        if not values:
            return
        path = Path(values[0])
        if path.is_dir():
            self._set_output_preview_text(f"Ordner: {path}\n\nBitte eine Datei auswählen.")
            return

        try:
            suffix = path.suffix.lower()
            if suffix == ".csv":
                df = pd.read_csv(path)
                preview = (
                    f"Datei: {path}\n"
                    f"Zeilen: {len(df)} | Spalten: {len(df.columns)}\n"
                    f"Spalten: {list(df.columns)}\n\n"
                    f"{df.head(60).to_string(index=False)}"
                )
            elif suffix in {".xlsx", ".xls"}:
                xls = pd.ExcelFile(path)
                txt = [f"Datei: {path}", f"Sheets: {xls.sheet_names}", ""]
                for sheet in xls.sheet_names[:3]:
                    df = pd.read_excel(xls, sheet_name=sheet)
                    txt.append(f"=== Sheet: {sheet} ===")
                    txt.append(f"Zeilen: {len(df)} | Spalten: {len(df.columns)}")
                    txt.append(f"Spalten: {list(df.columns)}")
                    txt.append(df.head(12).to_string(index=False))
                    txt.append("")
                preview = "\n".join(txt)
            elif suffix in {".md", ".txt", ".json", ".log"}:
                preview = path.read_text(encoding="utf-8", errors="replace")[:80000]
            else:
                preview = f"Vorschau für Dateityp {suffix or '(ohne Endung)'} nicht unterstützt.\n\nPfad:\n{path}"
        except Exception as exc:  # noqa: BLE001
            preview = f"Fehler beim Lesen von:\n{path}\n\n{exc}"
        self._set_output_preview_text(preview)

    def _on_output_tree_open(self, _event=None) -> None:
        sel = self.output_tree.selection()
        if not sel:
            return
        item = sel[0]
        values = self.output_tree.item(item).get("values") or []
        if not values:
            return
        path = Path(values[0])
        target = path if path.is_dir() else path.parent
        self._open_in_finder(target)

    def open_output_viewer(self) -> None:
        cfg = self._build_config()
        out = Path(cfg.output_root)
        if not out.exists():
            messagebox.showerror("Ergebnis-Viewer", f"Ausgabeordner existiert nicht:\n{out}")
            return
        open_output_data_viewer(self, out)

    def open_tooljet_database(self) -> None:
        webbrowser.open(self.TOOLJET_DATABASE_URL)

    def _copy_to_clipboard(self, value: str, status_text: str | None = None) -> None:
        self.clipboard_clear()
        self.clipboard_append(value)
        self.update_idletasks()
        if status_text:
            self.status_var.set(status_text)

    def _resolve_import_plan(self, output_root: Path) -> list[dict]:
        plan: list[dict] = []
        for spec in self.TOOLJET_IMPORT_STEPS:
            matches = sorted(output_root.glob(spec["csv_glob"])) if output_root.exists() else []
            plan.append(
                {
                    **spec,
                    "files": matches,
                    "status": "vorhanden" if matches else "fehlt",
                }
            )
        return plan

    def _open_generated_output_target(self, path: Path) -> None:
        if path.is_dir():
            self._open_in_finder(path)
            return
        if path.exists():
            subprocess.run(["open", str(path)], check=False)
            return
        self._open_in_finder(path.parent)

    def open_help_window(self) -> None:
        win = tk.Toplevel(self)
        win.title("Hilfe – AAD Converter")
        win.geometry("980x700")

        outer = ttk.Frame(win, padding=10)
        outer.pack(fill="both", expand=True)

        header = ttk.Frame(outer)
        header.pack(fill="x", pady=(0, 8))
        ttk.Label(
            header,
            text="Hilfe & Benutzeranleitung (basierend auf aktueller Konvertierungslogik)",
            font=("Helvetica", 12, "bold"),
        ).pack(side="left", anchor="w")
        ttk.Button(header, text="PDF-Handbuch öffnen", command=self.open_handbook_pdf).pack(side="right")

        nb = ttk.Notebook(outer)
        nb.pack(fill="both", expand=True)

        for title, content in self.HELP_TEXT_DE.items():
            tab = ttk.Frame(nb)
            nb.add(tab, text=title)

            text = tk.Text(tab, wrap="word")
            text.pack(fill="both", expand=True, side="left")
            scroll = ttk.Scrollbar(tab, orient="vertical", command=text.yview)
            scroll.pack(fill="y", side="right")
            text.configure(yscrollcommand=scroll.set)
            text.insert("1.0", content)
            text.configure(state="disabled")

    def _resource_root(self) -> Path:
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            return Path(sys._MEIPASS)
        return Path(__file__).resolve().parents[1]

    def _find_handbook_pdf(self) -> Path | None:
        candidates = [
            self._resource_root() / "docs" / "converter" / "AAD-Converter-Handbuch.pdf",
            Path(__file__).resolve().parents[1] / "docs" / "converter" / "AAD-Converter-Handbuch.pdf",
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return None

    def open_handbook_pdf(self) -> None:
        pdf_path = self._find_handbook_pdf()
        if pdf_path is None:
            messagebox.showerror(
                "Handbuch",
                "Das PDF-Handbuch wurde nicht gefunden.\n\n"
                "Erwartet unter:\n"
                "docs/converter/AAD-Converter-Handbuch.pdf",
            )
            return
        subprocess.run(["open", str(pdf_path)], check=False)

    def open_source_viewer(self, initial_path: Path | None = None) -> None:
        cfg = self._build_config()
        root = Path(cfg.input_root)
        if not root.exists():
            messagebox.showerror("Quellordner", f"Ordner existiert nicht:\n{root}")
            return

        win = tk.Toplevel(self)
        win.title(f"Quell-Dateien: {root}")
        win.geometry("900x620")

        container = ttk.Frame(win, padding=10)
        container.pack(fill="both", expand=True)

        top = ttk.Frame(container)
        top.pack(fill="x", pady=(0, 8))
        ttk.Label(top, text="Datei-Viewer (Quelle)", font=("Helvetica", 12, "bold")).pack(side="left")
        ttk.Button(top, text="Aktualisieren", command=lambda: populate()).pack(side="right")

        split = ttk.Panedwindow(container, orient="horizontal")
        split.pack(fill="both", expand=True)

        left = ttk.Frame(split)
        right = ttk.Frame(split)
        split.add(left, weight=1)
        split.add(right, weight=2)

        tree = ttk.Treeview(left, show="tree")
        tree.pack(fill="both", expand=True, side="left")
        scroll = ttk.Scrollbar(left, orient="vertical", command=tree.yview)
        scroll.pack(fill="y", side="right")
        tree.configure(yscrollcommand=scroll.set)

        preview_tabs = ttk.Notebook(right)
        preview_tabs.pack(fill="both", expand=True)

        source_tab = ttk.Frame(preview_tabs)
        expected_tab = ttk.Frame(preview_tabs)
        preview_tabs.add(source_tab, text="Datei-Vorschau")
        preview_tabs.add(expected_tab, text="Erwartete Outputs")

        source_view_tabs = ttk.Notebook(source_tab)
        source_view_tabs.pack(fill="both", expand=True)

        source_text_frame = ttk.Frame(source_view_tabs)
        source_table_frame = ttk.Frame(source_view_tabs)
        source_view_tabs.add(source_text_frame, text="Python/Text")
        source_view_tabs.add(source_table_frame, text="Tabellenansicht")

        source_preview = tk.Text(source_text_frame, wrap="none")
        source_preview.pack(fill="both", expand=True)

        table_toolbar = ttk.Frame(source_table_frame)
        table_toolbar.pack(fill="x", padx=6, pady=6)
        ttk.Label(table_toolbar, text="Sheet:").pack(side="left")
        sheet_var = tk.StringVar()
        sheet_combo = ttk.Combobox(table_toolbar, textvariable=sheet_var, state="readonly", width=40)
        sheet_combo.pack(side="left", padx=6)
        sheet_combo.configure(values=[])

        source_table_container = ttk.Frame(source_table_frame)
        source_table_container.pack(fill="both", expand=True)

        source_table = ttk.Treeview(source_table_container, show="headings")
        source_table.grid(row=0, column=0, sticky="nsew")

        source_table_scroll_y = ttk.Scrollbar(source_table_container, orient="vertical", command=source_table.yview)
        source_table_scroll_y.grid(row=0, column=1, sticky="ns")

        source_table_scroll_x = ttk.Scrollbar(source_table_container, orient="horizontal", command=source_table.xview)
        source_table_scroll_x.grid(row=1, column=0, sticky="ew")

        source_table_container.grid_rowconfigure(0, weight=1)
        source_table_container.grid_columnconfigure(0, weight=1)

        source_table.configure(
            yscrollcommand=source_table_scroll_y.set,
            xscrollcommand=source_table_scroll_x.set,
        )

        current_source_path: dict[str, Path | None] = {"path": None}
        current_xls: dict[str, pd.ExcelFile | None] = {"xls": None}

        expected_top = ttk.Frame(expected_tab)
        expected_top.pack(fill="x", padx=6, pady=6)
        ttk.Label(expected_top, text="Output-Datei:").pack(side="left")
        expected_var = tk.StringVar()
        expected_combo = ttk.Combobox(
            expected_top,
            textvariable=expected_var,
            values=[f"{name} — {rel}" for name, rel, _ in self.EXPECTED_OUTPUTS],
            state="readonly",
            width=70,
        )
        expected_combo.pack(side="left", padx=6)
        if self.EXPECTED_OUTPUTS:
            expected_combo.current(0)
        expected_preview = tk.Text(expected_tab, wrap="none")
        expected_preview.pack(fill="both", expand=True)

        info = ttk.Label(win, text="Doppelklick: Datei/Finder öffnen • Auswahl zeigt Vorschau")
        info.pack(anchor="w", padx=10, pady=(0, 6))

        def clear_table() -> None:
            source_table.delete(*source_table.get_children())
            source_table["columns"] = ()

        def render_df_table(df: pd.DataFrame) -> None:
            clear_table()
            # keep UI responsive for very wide/tall sheets
            view_df = df.head(300).copy()
            if len(view_df.columns) > 40:
                view_df = view_df.iloc[:, :40]

            cols = [str(c) for c in view_df.columns]
            source_table["columns"] = cols
            for c in cols:
                source_table.heading(c, text=c)
                source_table.column(c, width=140, anchor="w")

            for row in view_df.itertuples(index=False, name=None):
                source_table.insert("", "end", values=[("" if pd.isna(v) else str(v)) for v in row])

        def preview_path(path: Path) -> None:
            current_source_path["path"] = path
            current_xls["xls"] = None
            source_preview.delete("1.0", "end")
            clear_table()
            sheet_combo.configure(values=[])
            sheet_var.set("")
            if path.is_dir():
                source_preview.insert("end", f"Ordner: {path}\n\nBitte eine Datei auswählen.")
                return

            try:
                if path.suffix.lower() == ".csv":
                    df = pd.read_csv(path)
                    source_preview.insert("end", f"Datei: {path}\n")
                    source_preview.insert("end", f"Zeilen: {len(df)} | Spalten: {len(df.columns)}\n")
                    source_preview.insert("end", f"Spalten: {list(df.columns)}\n\n")
                    source_preview.insert("end", df.head(40).to_string(index=False))
                    render_df_table(df)
                elif path.suffix.lower() in {".xlsx", ".xls"}:
                    xls = pd.ExcelFile(path)
                    current_xls["xls"] = xls
                    source_preview.insert("end", f"Datei: {path}\n")
                    source_preview.insert("end", f"Sheets: {xls.sheet_names}\n\n")
                    sheet_combo.configure(values=xls.sheet_names)
                    if xls.sheet_names:
                        sheet_var.set(xls.sheet_names[0])
                    for sheet in xls.sheet_names[:3]:
                        df = pd.read_excel(xls, sheet_name=sheet)
                        source_preview.insert("end", f"=== Sheet: {sheet} ===\n")
                        source_preview.insert("end", f"Zeilen: {len(df)} | Spalten: {len(df.columns)}\n")
                        source_preview.insert("end", f"Spalten: {list(df.columns)}\n")
                        source_preview.insert("end", df.head(12).to_string(index=False))
                        source_preview.insert("end", "\n\n")
                    if xls.sheet_names:
                        first_df = pd.read_excel(xls, sheet_name=xls.sheet_names[0])
                        render_df_table(first_df)
                elif path.suffix.lower() in {".md", ".txt", ".json"}:
                    source_preview.insert("end", path.read_text(encoding="utf-8")[:50000])
                else:
                    source_preview.insert("end", f"Vorschau für Dateityp {path.suffix} nicht unterstützt.")
            except Exception as exc:  # noqa: BLE001
                source_preview.insert("end", f"Fehler beim Lesen von {path}:\n{exc}")

        def on_sheet_change(_event) -> None:
            path = current_source_path["path"]
            xls = current_xls["xls"]
            sheet = sheet_var.get()
            if path is None or xls is None or not sheet:
                return
            try:
                df = pd.read_excel(xls, sheet_name=sheet)
                render_df_table(df)
            except Exception as exc:  # noqa: BLE001
                clear_table()
                source_preview.insert("end", f"\n\nFehler beim Laden von Sheet '{sheet}': {exc}")

        def preview_expected() -> None:
            expected_preview.delete("1.0", "end")
            idx = expected_combo.current()
            if idx < 0:
                return
            name, rel, schema_hint = self.EXPECTED_OUTPUTS[idx]
            output_root = Path(self.output_var.get().strip())
            out_path = output_root / rel
            expected_preview.insert("end", f"Datensatz: {name}\nErwartete Datei: {out_path}\n\n")
            if out_path.exists():
                try:
                    df = pd.read_csv(out_path)
                    expected_preview.insert("end", "Status: Datei vorhanden\n")
                    expected_preview.insert("end", f"Zeilen: {len(df)} | Spalten: {len(df.columns)}\n")
                    expected_preview.insert("end", f"Spalten: {list(df.columns)}\n\n")
                    expected_preview.insert("end", df.head(40).to_string(index=False))
                except Exception as exc:  # noqa: BLE001
                    expected_preview.insert("end", f"Datei vorhanden, aber nicht lesbar:\n{exc}\n")
            else:
                expected_preview.insert("end", "Status: Noch nicht erzeugt\n")
                expected_preview.insert("end", "Erwartete Kernspalten (Schema-Hinweis):\n")
                for col in schema_hint:
                    expected_preview.insert("end", f"- {col}\n")
                expected_preview.insert("end", "\nFühre die Konvertierung aus, um reale Ausgabevorschau zu sehen.")

        def insert_dir(parent_id: str, path: Path, depth: int = 0) -> None:
            if depth > 5:
                tree.insert(parent_id, "end", text="... (Tiefe begrenzt)")
                return

            entries = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
            for entry in entries:
                if entry.name.startswith("."):
                    continue
                if entry.is_dir():
                    node = tree.insert(parent_id, "end", text=f"📁 {entry.name}", values=[str(entry)])
                    insert_dir(node, entry, depth + 1)
                else:
                    tree.insert(parent_id, "end", text=f"📄 {entry.name}", values=[str(entry)])

        def populate() -> None:
            tree.delete(*tree.get_children())
            root_node = tree.insert("", "end", text=f"📁 {root}", values=[str(root)], open=True)
            insert_dir(root_node, root)
            if initial_path is not None:
                item_id = find_item_by_path(str(initial_path))
                if item_id:
                    tree.selection_set(item_id)
                    tree.focus(item_id)
                    tree.see(item_id)
                    preview_path(initial_path)
                else:
                    # Fallback: if exact file not found, try parent folder.
                    parent = initial_path.parent if initial_path.is_file() else initial_path
                    parent_id = find_item_by_path(str(parent))
                    if parent_id:
                        tree.selection_set(parent_id)
                        tree.focus(parent_id)
                        tree.see(parent_id)
                        preview_path(parent)

        def on_double_click(_event) -> None:
            sel = tree.selection()
            if not sel:
                return
            item = sel[0]
            values = tree.item(item).get("values") or []
            if not values:
                return
            path = Path(values[0])
            target = path if path.is_dir() else path.parent
            os.system(f'open "{target}"')

        def on_select(_event) -> None:
            sel = tree.selection()
            if not sel:
                return
            item = sel[0]
            values = tree.item(item).get("values") or []
            if not values:
                return
            preview_path(Path(values[0]))

        def find_item_by_path(path_value: str) -> str | None:
            def walk(parent: str = "") -> str | None:
                for child in tree.get_children(parent):
                    vals = tree.item(child).get("values") or []
                    if vals and vals[0] == path_value:
                        return child
                    found = walk(child)
                    if found:
                        return found
                return None

            return walk("")

        tree.bind("<Double-1>", on_double_click)
        tree.bind("<<TreeviewSelect>>", on_select)
        expected_combo.bind("<<ComboboxSelected>>", lambda _e: preview_expected())
        sheet_combo.bind("<<ComboboxSelected>>", on_sheet_change)
        populate()
        preview_expected()

    def _open_viewer_from_main_tree(self, _event) -> None:
        sel = self.found_tree.selection()
        if not sel:
            return
        item = sel[0]
        values = self.found_tree.item(item).get("values") or []
        if not values:
            self.open_source_viewer()
            return
        target = Path(values[0])
        self.open_source_viewer(initial_path=target)

    def _show_source_inventory(self) -> None:
        cfg = self._build_config()
        root = Path(cfg.input_root)
        self.inventory_table.delete(*self.inventory_table.get_children())
        self.found_tree.delete(*self.found_tree.get_children())

        for label, rel_dir, pattern, min_required, required, expect_single in self.EXPECTED_SOURCES:
            base = root / rel_dir
            if "*" in pattern:
                matches = sorted(base.glob(pattern)) if base.exists() else []
            else:
                candidate = base / pattern
                matches = [candidate] if candidate.exists() else []

            found = len(matches)
            expected_label = f"{rel_dir}/{pattern}"
            has_duplicate_conflict = expect_single and found > 1
            if has_duplicate_conflict:
                status = "DUPLIKAT"
                tag = "conflict"
            elif found >= min_required:
                status = "OK"
                tag = "ok"
            elif required:
                status = "FEHLT"
                tag = "missing"
            else:
                status = "OPTIONAL FEHLT"
                tag = "warn"

            self.inventory_table.insert(
                "",
                "end",
                values=(label, expected_label, str(found), status),
                tags=(tag,),
            )

            if has_duplicate_conflict:
                group_tag = "group_conflict"
            else:
                group_tag = "group_ok" if found > 0 else "group_missing"
            group_text = f"{label} ({rel_dir})"
            group_id = self.found_tree.insert(
                "",
                "end",
                text=group_text,
                values=[str(base)],
                tags=(group_tag,),
                open=(found > 0),
            )

            if matches:
                chosen = max(matches, key=lambda p: p.stat().st_mtime)
                self.found_tree.insert(group_id, "end", text=f"→ Verwendet: {chosen.name}", values=[str(chosen)])
                for p in matches[:50]:
                    self.found_tree.insert(group_id, "end", text=p.name, values=[str(p)])
                if len(matches) > 50:
                    self.found_tree.insert(group_id, "end", text=f"... +{len(matches)-50} weitere")
                if has_duplicate_conflict:
                    self.found_tree.insert(
                        group_id,
                        "end",
                        text="⚠ Konflikt: Mehrere passende Dateien gefunden. Nur eine sollte aktiv sein.",
                        tags=("group_conflict",),
                    )
            else:
                self.found_tree.insert(group_id, "end", text="Keine passenden Dateien gefunden")

        self._append_log("[SOURCE] Inventar aktualisiert (siehe Tabelle + Dateibaum).")

    def preflight(self) -> None:
        cfg = self._build_config()
        root = Path(cfg.input_root)
        self._show_source_inventory()
        required = [
            root / "species-portraits/portraits",
            root / "species-portraits/attribute-definitions",
            root / "species-portraits/images",
            root / "plants",
            root / "habitat-elements",
        ]
        missing = [str(p) for p in required if not p.exists()]
        self._append_log("[PRECHECK] Starte Verzeichnisprüfung...")
        if missing:
            for m in missing:
                self._append_log(f"[PRECHECK][FEHLT] {m}")
            self.status_var.set("Preflight: Warnungen")
        else:
            self._append_log("[PRECHECK][OK] Alle Kernordner vorhanden")
            self.status_var.set("Preflight: OK")

    def save_config(self) -> None:
        cfg = self._build_config()
        path = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON", "*.json")])
        if not path:
            return
        Path(path).write_text(json.dumps(cfg.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        self._append_log(f"[CONFIG] Gespeichert: {path}")

    def run_conversion(self) -> None:
        cfg = self._build_config()
        self.status_var.set("Konvertierung läuft...")
        self.after(0, lambda: self.issues_table.delete(*self.issues_table.get_children()))

        def on_line(line: str) -> None:
            self._append_log(line)

        def on_done(result, json_report: Path, html_report: Path, guide: Path) -> None:
            self.last_result = result
            self._append_result_summary(result)
            self._populate_issues_table(result)
            self._append_log(f"[RUN] Status: {result.overall_status}")
            self._append_log(f"[RUN] JSON: {json_report}")
            self._append_log(f"[RUN] HTML: {html_report}")
            self._append_log(f"[RUN] GUIDE: {guide}")
            self._refresh_output_inventory_tree()
            self.status_var.set(f"Fertig: {result.overall_status}")
            if result.overall_status == "failed":
                messagebox.showerror("Konvertierung", "Konvertierung fehlgeschlagen. Bitte Bericht prüfen.")
            else:
                messagebox.showinfo("Konvertierung", "Konvertierung abgeschlossen.")

        self._run_conversion_async(cfg, on_line=on_line, on_done=on_done)

    def open_wizard(self) -> None:
        WizardWindow(self)


class WizardWindow(tk.Toplevel):
    STEPS = ["Willkommen", "Quelldaten", "Ausgabe", "Preflight", "Konvertierung", "Ergebnis"]

    def __init__(self, app: App) -> None:
        super().__init__(app)
        self.app = app
        self.title("AAD Wizard")
        self.geometry("1280x860")
        self.minsize(1220, 800)
        self.transient(app)
        self.input_var = tk.StringVar(value=app.input_var.get())
        self.output_var = tk.StringVar(value=app.output_var.get())
        self.step_index = 0
        self.last_result = app.last_result
        self.last_paths: tuple[Path, Path, Path] | None = None

        root = ttk.Frame(self, padding=14)
        root.pack(fill="both", expand=True)
        root.grid_columnconfigure(1, weight=1)
        root.grid_rowconfigure(0, weight=1)

        left = ttk.Frame(root)
        left.grid(row=0, column=0, sticky="ns", padx=(0, 12))
        ttk.Label(left, text="Schritte", font=("Helvetica", 12, "bold")).pack(anchor="w", pady=(0, 6))
        self.step_list = tk.Listbox(left, height=10, exportselection=False)
        self.step_list.pack(fill="y", expand=False)
        for i, step in enumerate(self.STEPS):
            self.step_list.insert("end", f"{i+1}. {step}")
        self.step_list.bind("<<ListboxSelect>>", self._on_step_select)

        right = ttk.Frame(root)
        right.grid(row=0, column=1, sticky="nsew")
        right.grid_rowconfigure(1, weight=1)
        right.grid_columnconfigure(0, weight=1)

        self.step_title = ttk.Label(right, text="", font=("Helvetica", 13, "bold"))
        self.step_title.grid(row=0, column=0, sticky="w")

        self.step_body = ttk.Frame(right)
        self.step_body.grid(row=1, column=0, sticky="nsew", pady=(8, 8))

        help_frame = ttk.LabelFrame(right, text="Hilfe zu diesem Schritt")
        help_frame.grid(row=2, column=0, sticky="ew")
        self.help_label = tk.Text(help_frame, height=6, wrap="word")
        self.help_label.pack(fill="x", expand=True, padx=6, pady=6)
        self.help_label.configure(state="disabled")

        nav = ttk.Frame(right)
        nav.grid(row=3, column=0, sticky="ew", pady=(8, 0))
        self.back_btn = ttk.Button(nav, text="Zurück", command=self.prev_step)
        self.back_btn.pack(side="left")
        self.next_btn = ttk.Button(nav, text="Weiter", command=self.next_step)
        self.next_btn.pack(side="left", padx=8)
        self.finish_btn = ttk.Button(nav, text="Schließen", command=self.destroy)
        self.finish_btn.pack(side="right")

        self._render_step()

    def _on_step_select(self, _event=None) -> None:
        sel = self.step_list.curselection()
        if not sel:
            return
        self.step_index = int(sel[0])
        self._render_step()

    def prev_step(self) -> None:
        if self.step_index > 0:
            self.step_index -= 1
            self._render_step()

    def next_step(self) -> None:
        if self.step_index < len(self.STEPS) - 1:
            self.step_index += 1
            self._render_step()

    def _clear_step_body(self) -> None:
        for child in self.step_body.winfo_children():
            child.destroy()

    def _set_help(self, step_name: str) -> None:
        self.help_label.configure(height=4 if step_name == "Ergebnis" else 6)
        self.help_label.configure(state="normal")
        self.help_label.delete("1.0", "end")
        self.help_label.insert("1.0", self.app.WIZARD_HELP_DE.get(step_name, ""))
        self.help_label.configure(state="disabled")

    def _render_step(self) -> None:
        self._clear_step_body()
        step_name = self.STEPS[self.step_index]
        if self.last_result is None and self.app.last_result is not None:
            self.last_result = self.app.last_result
        self.step_title.configure(text=f"Schritt {self.step_index + 1}: {step_name}")
        self._set_help(step_name)
        self.step_list.selection_clear(0, "end")
        self.step_list.selection_set(self.step_index)
        self.step_list.activate(self.step_index)

        self.back_btn.configure(state="normal" if self.step_index > 0 else "disabled")
        self.next_btn.configure(state="normal" if self.step_index < len(self.STEPS) - 1 else "disabled")

        if step_name == "Willkommen":
            ttk.Label(
                self.step_body,
                text=(
                    "Willkommen im geführten Modus.\n\n"
                    "Sie werden nacheinander durch Quellordner, Ausgabe, Preflight,\n"
                    "Konvertierung und Ergebnisprüfung geführt."
                ),
                justify="left",
            ).pack(anchor="w")
        elif step_name == "Quelldaten":
            row = ttk.Frame(self.step_body)
            row.pack(fill="x", pady=4)
            ttk.Entry(row, textvariable=self.input_var).pack(side="left", fill="x", expand=True)
            ttk.Button(row, text="Ordner wählen", command=self._pick_input).pack(side="left", padx=8)
            ttk.Button(row, text="Inventar anzeigen", command=self._refresh_wizard_inventory).pack(side="left")
            ttk.Button(row, text="Dateien ansehen", command=self._open_source_viewer).pack(side="left", padx=8)
            ttk.Label(
                self.step_body,
                text="Tipp: 'Inventar anzeigen' zeigt die Prüfung direkt im Wizard. 'Dateien ansehen' öffnet den Datei-Viewer.",
            ).pack(anchor="w", pady=(8, 0))
            self._build_wizard_inventory_ui(self.step_body)
            self._refresh_wizard_inventory()
        elif step_name == "Ausgabe":
            row = ttk.Frame(self.step_body)
            row.pack(fill="x", pady=4)
            ttk.Entry(row, textvariable=self.output_var).pack(side="left", fill="x", expand=True)
            ttk.Button(row, text="Ordner wählen", command=self._pick_output).pack(side="left", padx=8)
            ttk.Label(
                self.step_body,
                text="Im Ausgabeordner liegen danach CSVs, conversion-report.{json,html} und tooljet-import-guide.md",
            ).pack(anchor="w", pady=(8, 0))
        elif step_name == "Preflight":
            top = ttk.Frame(self.step_body)
            top.pack(fill="x", pady=(0, 8))
            ttk.Button(top, text="Preflight ausführen", command=self._run_preflight).pack(side="left")
            ttk.Button(top, text="Inventar aktualisieren", command=self._refresh_wizard_inventory).pack(side="left", padx=8)
            ttk.Label(
                self.step_body,
                text="Preflight-Ergebnisse werden hier im Wizard angezeigt.",
            ).pack(anchor="w", pady=(0, 6))
            self._build_wizard_preflight_ui(self.step_body)
        elif step_name == "Konvertierung":
            ttk.Button(self.step_body, text="Konvertierung starten", command=self._run_conversion).pack(anchor="w")
            self.wizard_log = tk.Text(self.step_body, height=18, wrap="none")
            self.wizard_log.pack(fill="both", expand=True, pady=(8, 0))
            self.wizard_log.configure(state="disabled")
        elif step_name == "Ergebnis":
            status = getattr(self.last_result, "overall_status", "") if self.last_result is not None else ""
            if status == "success":
                text = "Konvertierung erfolgreich. Sie können jetzt die Ergebnisdateien prüfen und in Tooljet importieren."
            elif status == "warning":
                text = (
                    "Konvertierung mit Warnungen abgeschlossen (unvollständig/teilweise fehlerhaft). "
                    "Bitte Probleme & Lösungen prüfen, dann Daten vor dem Import kontrollieren."
                )
            elif status == "failed":
                text = (
                    "Konvertierung fehlgeschlagen. Es wurden nicht alle benötigten Ausgaben erzeugt. "
                    "Bitte Probleme & Lösungen prüfen und erneut ausführen."
                )
            else:
                text = "Es wurde noch keine Konvertierung ausgeführt."
            ttk.Label(self.step_body, text=text).pack(anchor="w")
            actions = ttk.Frame(self.step_body)
            actions.pack(fill="x", pady=(8, 0))
            ttk.Button(actions, text="Ausgabeordner im Finder öffnen", command=self._open_output).pack(side="left")
            ttk.Button(actions, text="Ergebnisdaten prüfen", command=self._open_output_viewer).pack(side="left", padx=8)
            ttk.Button(actions, text="Tooljet-Datenbank öffnen", command=self.app.open_tooljet_database).pack(side="left", padx=8)

            nb = ttk.Notebook(self.step_body)
            nb.pack(fill="both", expand=True, pady=(10, 0))

            import_tab = ttk.Frame(nb)
            issues_tab = ttk.Frame(nb)
            nb.add(import_tab, text="Import in Tooljet")
            nb.add(issues_tab, text="Probleme & Lösungen")

            self._build_wizard_import_plan_ui(import_tab)
            self._populate_wizard_import_plan()
            self._build_wizard_issues_ui(issues_tab)
            self._populate_wizard_issues()

    def _pick_input(self) -> None:
        path = filedialog.askdirectory(initialdir=self.input_var.get() or ".")
        if path:
            self.input_var.set(path)
            self.app.input_var.set(path)
            self.app._append_log(f"[WIZARD] Quellordner gesetzt: {path}")
            self.app._show_source_inventory()
            self._refresh_wizard_inventory()

    def _pick_output(self) -> None:
        path = filedialog.askdirectory(initialdir=self.output_var.get() or ".")
        if path:
            self.output_var.set(path)
            self.app.output_var.set(path)
            self.app._append_log(f"[WIZARD] Ausgabeordner gesetzt: {path}")

    def _run_preflight(self) -> None:
        self.app.input_var.set(self.input_var.get())
        self.app.output_var.set(self.output_var.get())
        root = Path(self.input_var.get().strip())
        required = [
            root / "species-portraits/portraits",
            root / "species-portraits/attribute-definitions",
            root / "species-portraits/images",
            root / "plants",
            root / "habitat-elements",
        ]
        missing = [str(p) for p in required if not p.exists()]
        lines = ["[PRECHECK] Starte Verzeichnisprüfung..."]
        rows = []
        for p in required:
            exists = p.exists()
            rows.append((str(p), "OK" if exists else "FEHLT"))
            if not exists:
                lines.append(f"[PRECHECK][FEHLT] {p}")
        if missing:
            self.app.status_var.set("Preflight: Warnungen")
        else:
            lines.append("[PRECHECK][OK] Alle Kernordner vorhanden")
            self.app.status_var.set("Preflight: OK")
        for ln in lines:
            self.app._append_log(ln)
        self._set_wizard_preflight_results(rows, lines)
        self._refresh_wizard_inventory()
        messagebox.showinfo("Wizard", "Preflight abgeschlossen. Ergebnisse sind im Wizard sichtbar.")

    def _run_conversion(self) -> None:
        self.app.input_var.set(self.input_var.get())
        self.app.output_var.set(self.output_var.get())
        cfg = self.app._build_config_from_values(self.input_var.get(), self.output_var.get())

        log_widget = getattr(self, "wizard_log", None)
        if log_widget is not None:
            log_widget.configure(state="normal")
            log_widget.delete("1.0", "end")
            log_widget.configure(state="disabled")

        def on_line(line: str) -> None:
            if log_widget is not None:
                log_widget.configure(state="normal")
                log_widget.insert("end", line + "\n")
                log_widget.see("end")
                log_widget.configure(state="disabled")
            self.app._append_log(line)

        def on_done(result, json_report: Path, html_report: Path, guide: Path) -> None:
            self.last_result = result
            self.app.last_result = result
            self.last_paths = (json_report, html_report, guide)
            self.app._append_result_summary(result)
            self.app._populate_issues_table(result)
            self.app._append_log(f"[RUN] Status: {result.overall_status}")
            self.app._append_log(f"[RUN] JSON: {json_report}")
            self.app._append_log(f"[RUN] HTML: {html_report}")
            self.app._append_log(f"[RUN] GUIDE: {guide}")
            if log_widget is not None:
                log_widget.configure(state="normal")
                log_widget.insert("end", f"\n[RUN] Status: {result.overall_status}\n")
                log_widget.insert("end", f"[RUN] JSON: {json_report}\n")
                log_widget.insert("end", f"[RUN] HTML: {html_report}\n")
                log_widget.insert("end", f"[RUN] GUIDE: {guide}\n")
                log_widget.see("end")
                log_widget.configure(state="disabled")

            self.step_index = len(self.STEPS) - 1
            if result.overall_status == "success":
                messagebox.showinfo("Wizard", "Konvertierung erfolgreich. Weiter zu 'Ergebnis'.")
            elif result.overall_status == "warning":
                messagebox.showwarning(
                    "Wizard",
                    "Konvertierung mit Warnungen abgeschlossen. Weiter zu 'Ergebnis' mit Problemen & Lösungen.",
                )
            else:
                messagebox.showerror(
                    "Wizard",
                    "Konvertierung fehlgeschlagen. Weiter zu 'Ergebnis' mit Problemen & Lösungen.",
                )
            self._render_step()

        self.app._run_conversion_async(cfg, on_line=on_line, on_done=on_done)

    def _open_output(self) -> None:
        target = Path(self.output_var.get().strip())
        if target.exists():
            os.system(f'open "{target}"')
        else:
            messagebox.showerror("Wizard", f"Ausgabeordner fehlt:\n{target}")

    def _open_output_viewer(self) -> None:
        out = Path(self.output_var.get().strip())
        if not out.exists():
            messagebox.showerror("Wizard", f"Ausgabeordner fehlt:\n{out}")
            return
        open_output_data_viewer(self, out)

    def _open_source_viewer(self) -> None:
        self.app.input_var.set(self.input_var.get())
        self.app.open_source_viewer()

    def _build_wizard_inventory_ui(self, parent: ttk.Frame) -> None:
        inv_wrap = ttk.Frame(parent)
        inv_wrap.pack(fill="both", expand=True, pady=(10, 0))

        split = ttk.Panedwindow(inv_wrap, orient="horizontal")
        split.pack(fill="both", expand=True)

        left = ttk.Frame(split)
        right = ttk.Frame(split)
        split.add(left, weight=1)
        split.add(right, weight=1)

        ttk.Label(left, text="Erwartete Inputs / Status", font=("Helvetica", 10, "bold")).pack(anchor="w")
        self.wiz_inventory_table = ttk.Treeview(
            left,
            columns=("dataset", "expected", "found", "status"),
            show="headings",
            height=9,
        )
        self.wiz_inventory_table.heading("dataset", text="Datensatz")
        self.wiz_inventory_table.heading("expected", text="Erwartet")
        self.wiz_inventory_table.heading("found", text="Gefunden")
        self.wiz_inventory_table.heading("status", text="Status")
        self.wiz_inventory_table.column("dataset", width=180, anchor="w")
        self.wiz_inventory_table.column("expected", width=260, anchor="w")
        self.wiz_inventory_table.column("found", width=90, anchor="center")
        self.wiz_inventory_table.column("status", width=110, anchor="center")
        self.wiz_inventory_table.tag_configure("ok", foreground="#1b5e20")
        self.wiz_inventory_table.tag_configure("warn", foreground="#b26a00")
        self.wiz_inventory_table.tag_configure("missing", foreground="#b00020")
        self.wiz_inventory_table.tag_configure("conflict", foreground="#b00020")
        self.wiz_inventory_table.pack(fill="both", expand=True, pady=(4, 0))

        ttk.Label(right, text="Gefundene relevante Dateien", font=("Helvetica", 10, "bold")).pack(anchor="w")
        self.wiz_found_tree = ttk.Treeview(right, show="tree", height=9)
        self.wiz_found_tree.tag_configure("group_ok", foreground="#1b5e20")
        self.wiz_found_tree.tag_configure("group_missing", foreground="#b00020")
        self.wiz_found_tree.tag_configure("group_conflict", foreground="#b00020")
        self.wiz_found_tree.pack(fill="both", expand=True, pady=(4, 0))
        self.wiz_found_tree.bind("<Double-1>", self._open_viewer_from_wizard_tree)

    def _refresh_wizard_inventory(self) -> None:
        if not hasattr(self, "wiz_inventory_table") or not hasattr(self, "wiz_found_tree"):
            return

        root = Path(self.input_var.get().strip())
        self.wiz_inventory_table.delete(*self.wiz_inventory_table.get_children())
        self.wiz_found_tree.delete(*self.wiz_found_tree.get_children())

        for label, rel_dir, pattern, min_required, required, expect_single in self.app.EXPECTED_SOURCES:
            base = root / rel_dir
            if "*" in pattern:
                matches = sorted(base.glob(pattern)) if base.exists() else []
            else:
                candidate = base / pattern
                matches = [candidate] if candidate.exists() else []

            found = len(matches)
            expected_label = f"{rel_dir}/{pattern}"
            has_duplicate_conflict = expect_single and found > 1
            if has_duplicate_conflict:
                status = "DUPLIKAT"
                tag = "conflict"
            elif found >= min_required:
                status = "OK"
                tag = "ok"
            elif required:
                status = "FEHLT"
                tag = "missing"
            else:
                status = "OPTIONAL FEHLT"
                tag = "warn"

            self.wiz_inventory_table.insert(
                "",
                "end",
                values=(label, expected_label, str(found), status),
                tags=(tag,),
            )

            group_tag = "group_conflict" if has_duplicate_conflict else ("group_ok" if found > 0 else "group_missing")
            group_id = self.wiz_found_tree.insert(
                "",
                "end",
                text=f"{label} ({rel_dir})",
                values=[str(base)],
                tags=(group_tag,),
                open=(found > 0),
            )

            if matches:
                chosen = max(matches, key=lambda p: p.stat().st_mtime)
                self.wiz_found_tree.insert(group_id, "end", text=f"→ Verwendet: {chosen.name}", values=[str(chosen)])
                for p in matches[:40]:
                    self.wiz_found_tree.insert(group_id, "end", text=p.name, values=[str(p)])
                if len(matches) > 40:
                    self.wiz_found_tree.insert(group_id, "end", text=f"... +{len(matches)-40} weitere")
                if has_duplicate_conflict:
                    self.wiz_found_tree.insert(
                        group_id,
                        "end",
                        text="⚠ Konflikt: Mehrere passende Dateien gefunden. Nur eine sollte aktiv sein.",
                        tags=("group_conflict",),
                    )
            else:
                self.wiz_found_tree.insert(group_id, "end", text="Keine passenden Dateien gefunden")

    def _open_viewer_from_wizard_tree(self, _event) -> None:
        sel = self.wiz_found_tree.selection()
        if not sel:
            self._open_source_viewer()
            return
        values = self.wiz_found_tree.item(sel[0]).get("values") or []
        if not values:
            self._open_source_viewer()
            return
        target = Path(values[0])
        self.app.input_var.set(self.input_var.get())
        self.app.open_source_viewer(initial_path=target)

    def _build_wizard_preflight_ui(self, parent: ttk.Frame) -> None:
        wrap = ttk.Frame(parent)
        wrap.pack(fill="both", expand=True)

        self.wiz_preflight_table = ttk.Treeview(
            wrap,
            columns=("path", "status"),
            show="headings",
            height=6,
        )
        self.wiz_preflight_table.heading("path", text="Pfad")
        self.wiz_preflight_table.heading("status", text="Status")
        self.wiz_preflight_table.column("path", width=620, anchor="w")
        self.wiz_preflight_table.column("status", width=120, anchor="center")
        self.wiz_preflight_table.tag_configure("ok", foreground="#1b5e20")
        self.wiz_preflight_table.tag_configure("missing", foreground="#b00020")
        self.wiz_preflight_table.pack(fill="x")

        self.wiz_preflight_log = tk.Text(wrap, height=8, wrap="none")
        self.wiz_preflight_log.pack(fill="both", expand=True, pady=(8, 0))
        self.wiz_preflight_log.configure(state="disabled")

    def _set_wizard_preflight_results(self, rows: list[tuple[str, str]], lines: list[str]) -> None:
        if not hasattr(self, "wiz_preflight_table") or not hasattr(self, "wiz_preflight_log"):
            return
        self.wiz_preflight_table.delete(*self.wiz_preflight_table.get_children())
        for p, st in rows:
            tag = "ok" if st == "OK" else "missing"
            self.wiz_preflight_table.insert("", "end", values=(p, st), tags=(tag,))
        self.wiz_preflight_log.configure(state="normal")
        self.wiz_preflight_log.delete("1.0", "end")
        self.wiz_preflight_log.insert("1.0", "\n".join(lines))
        self.wiz_preflight_log.configure(state="disabled")

    def _build_wizard_issues_ui(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="Probleme & Lösungen (aus der letzten Konvertierung)", font=("Helvetica", 10, "bold")).pack(anchor="w", pady=(10, 4))
        wrap = ttk.Frame(parent)
        wrap.pack(fill="both", expand=True)
        self.wiz_issues_table = ttk.Treeview(
            wrap,
            columns=("severity", "stage", "code", "beschreibung", "datei", "fix"),
            show="headings",
            height=7,
        )
        self.wiz_issues_table.heading("severity", text="Severity")
        self.wiz_issues_table.heading("stage", text="Stufe")
        self.wiz_issues_table.heading("code", text="Code")
        self.wiz_issues_table.heading("beschreibung", text="Beschreibung")
        self.wiz_issues_table.heading("datei", text="Datei")
        self.wiz_issues_table.heading("fix", text="So beheben")
        self.wiz_issues_table.column("severity", width=80, anchor="center")
        self.wiz_issues_table.column("stage", width=130, anchor="w")
        self.wiz_issues_table.column("code", width=130, anchor="w")
        self.wiz_issues_table.column("beschreibung", width=250, anchor="w")
        self.wiz_issues_table.column("datei", width=230, anchor="e")
        self.wiz_issues_table.column("fix", width=300, anchor="w")
        self.wiz_issues_table.tag_configure("sev_error", foreground="#b00020")
        self.wiz_issues_table.tag_configure("sev_warning", foreground="#b26a00")
        self.wiz_issues_table.grid(row=0, column=0, sticky="nsew")
        self.wiz_issues_table.bind("<Double-1>", lambda e: self._open_issue_file_from_table(self.wiz_issues_table, self._wiz_issues_paths, e))
        sy = ttk.Scrollbar(wrap, orient="vertical", command=self.wiz_issues_table.yview)
        sy.grid(row=0, column=1, sticky="ns")
        sx = ttk.Scrollbar(wrap, orient="horizontal", command=self.wiz_issues_table.xview)
        sx.grid(row=1, column=0, sticky="ew")
        wrap.grid_columnconfigure(0, weight=1)
        wrap.grid_rowconfigure(0, weight=1)
        self.wiz_issues_table.configure(yscrollcommand=sy.set, xscrollcommand=sx.set)

    def _populate_wizard_issues(self) -> None:
        if not hasattr(self, "wiz_issues_table"):
            return
        self.wiz_issues_table.delete(*self.wiz_issues_table.get_children())
        self._wiz_issues_paths = {}
        result = self.last_result or self.app.last_result
        if result is None:
            self.wiz_issues_table.insert("", "end", values=("INFO", "-", "-", "Noch keine Konvertierung ausgeführt.", "-", "-"))
            return

        inserted = False
        for stage in result.stage_results:
            for issue in stage.issues:
                hint = FIX_HINTS_DE.get(
                    issue.reason_code,
                    "Bitte conversion-report.html öffnen und Eingabedaten/Format prüfen.",
                )
                tag = "sev_error" if issue.severity == "error" else "sev_warning"
                file_raw = issue.file or "-"
                file_display = self.app._display_path_tail(file_raw)
                iid = self.wiz_issues_table.insert(
                    "",
                    "end",
                    values=(
                        issue.severity.upper(),
                        stage.stage,
                        issue.reason_code,
                        issue.message,
                        file_display,
                        hint,
                    ),
                    tags=(tag,),
                )
                self._wiz_issues_paths[iid] = file_raw
                inserted = True
        if not inserted:
            self.wiz_issues_table.insert("", "end", values=("OK", "-", "-", "Keine Probleme oder Warnungen erkannt.", "-", "-"))

    def _build_wizard_import_plan_ui(self, parent: ttk.Frame) -> None:
        intro = ttk.LabelFrame(parent, text="Import-Hinweise", padding=10)
        intro.pack(fill="x", pady=(6, 8))
        self.wiz_import_intro_primary = tk.Label(
            intro,
            text=self.app.TOOLJET_IMPORT_EXPLAINER_DE,
            justify="left",
            anchor="w",
        )
        self.wiz_import_intro_primary.pack(fill="x", anchor="w")
        self.wiz_import_intro_secondary = tk.Label(
            intro,
            text=(
                "Deep Links auf einzelne Tooljet-Tabellen werden derzeit nicht verwendet. "
                "Öffnen Sie die Tooljet-Datenbank, wählen Sie links die angegebene Tabelle aus und nutzen Sie dort "
                "'Add new data' -> 'Bulk upload data'."
            ),
            justify="left",
            anchor="w",
            fg="#5b6570",
        )
        self.wiz_import_intro_secondary.pack(fill="x", anchor="w", pady=(6, 0))

        def _sync_intro_wrap(_event=None) -> None:
            width = max(intro.winfo_width() - 24, 640)
            self.wiz_import_intro_primary.configure(wraplength=width)
            self.wiz_import_intro_secondary.configure(wraplength=width)

        intro.bind("<Configure>", _sync_intro_wrap)

        scroll_wrap = ttk.Frame(parent)
        scroll_wrap.pack(fill="both", expand=True)
        scroll_wrap.grid_rowconfigure(0, weight=1)
        scroll_wrap.grid_columnconfigure(0, weight=1)

        self.wiz_import_canvas = tk.Canvas(scroll_wrap, highlightthickness=0)
        wiz_scroll = ttk.Scrollbar(scroll_wrap, orient="vertical", command=self.wiz_import_canvas.yview)
        self.wiz_import_canvas.configure(yscrollcommand=wiz_scroll.set)
        self.wiz_import_canvas.grid(row=0, column=0, sticky="nsew")
        wiz_scroll.grid(row=0, column=1, sticky="ns")

        self.wiz_import_content = ttk.Frame(self.wiz_import_canvas)
        self.wiz_import_window = self.wiz_import_canvas.create_window((0, 0), window=self.wiz_import_content, anchor="nw")

        def _sync_import_scroll(_event=None) -> None:
            self.wiz_import_canvas.configure(scrollregion=self.wiz_import_canvas.bbox("all"))

        def _sync_import_width(_event=None) -> None:
            self.wiz_import_canvas.itemconfigure(self.wiz_import_window, width=self.wiz_import_canvas.winfo_width())
            self.wiz_import_canvas.configure(scrollregion=self.wiz_import_canvas.bbox("all"))

        self.wiz_import_content.bind("<Configure>", _sync_import_scroll)
        self.wiz_import_canvas.bind("<Configure>", _sync_import_width)

        def _on_import_wheel(event):
            if event.delta:
                self.wiz_import_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            else:
                direction = -1 if getattr(event, "num", None) == 4 else 1
                self.wiz_import_canvas.yview_scroll(direction, "units")

        def _bind_mousewheel(_event=None):
            self.wiz_import_canvas.bind_all("<MouseWheel>", _on_import_wheel)
            self.wiz_import_canvas.bind_all("<Button-4>", _on_import_wheel)
            self.wiz_import_canvas.bind_all("<Button-5>", _on_import_wheel)

        def _unbind_mousewheel(_event=None):
            self.wiz_import_canvas.unbind_all("<MouseWheel>")
            self.wiz_import_canvas.unbind_all("<Button-4>")
            self.wiz_import_canvas.unbind_all("<Button-5>")

        self.wiz_import_canvas.bind("<Enter>", _bind_mousewheel)
        self.wiz_import_canvas.bind("<Leave>", _unbind_mousewheel)
        self.wiz_import_content.bind("<Enter>", _bind_mousewheel)
        self.wiz_import_content.bind("<Leave>", _unbind_mousewheel)

    def _populate_wizard_import_plan(self) -> None:
        if not hasattr(self, "wiz_import_content"):
            return
        for child in self.wiz_import_content.winfo_children():
            child.destroy()

        output_root = Path(self.output_var.get().strip())
        plan = self.app._resolve_import_plan(output_root)

        def refresh_import_scrollregion() -> None:
            self.wiz_import_content.update_idletasks()
            self.wiz_import_canvas.configure(scrollregion=self.wiz_import_canvas.bbox("all"))

        def category_color(table_name: str) -> tuple[str, str]:
            table_lower = table_name.lower()
            if "species" in table_lower:
                return "#2d8a57", "#e7f6eb"
            if "plant" in table_lower:
                return "#6d8c2d", "#eef7e6"
            if "habitat" in table_lower:
                return "#3178a8", "#e9f3fa"
            return "#6c757d", "#f1f3f5"

        def add_kv_row(parent, label: str, value: str, row: int, column: int, value_fg: str = "#111111") -> None:
            wrap = ttk.Frame(parent)
            wrap.grid(row=row, column=column, sticky="nsew", padx=6, pady=4)
            wrap.grid_columnconfigure(1, weight=1)
            ttk.Label(wrap, text=f"{label}:", font=("Helvetica", 9, "bold")).grid(row=0, column=0, sticky="nw")
            tk.Label(
                wrap,
                text=value,
                justify="left",
                anchor="w",
                wraplength=360,
                fg=value_fg,
            ).grid(row=0, column=1, sticky="nw", padx=(8, 0))

        for idx, step in enumerate(plan):
            tone_fg, tone_bg = category_color(step["table"])
            has_files = bool(step["files"])
            status_bg = tone_bg if has_files else "#fdecec"
            status_fg = "#1b5e20" if has_files else "#b00020"
            expanded = tk.BooleanVar(value=(idx == 0))
            files = step["files"]
            depends_value = step["depends_on"] if step["depends_on"] != "-" else "Keine fachliche Vorgängertabelle"
            files_value = "\n".join(p.name for p in files[:3]) if files else "Keine CSV gefunden"
            if files and len(files) > 3:
                files_value += f"\n… +{len(files) - 3} weitere"

            section = ttk.Frame(self.wiz_import_content)
            section.pack(fill="x", expand=False, pady=(0, 10))

            header = ttk.Frame(section)
            header.pack(fill="x")

            toggle_btn = ttk.Button(header, text="", width=36)
            toggle_btn.pack(side="left", anchor="w")

            target = files[0] if len(files) == 1 else (files[0].parent if files else output_root / Path(step["csv_glob"]).parent)
            file_button_label = "CSV öffnen" if len(files) == 1 else "CSV-Ordner öffnen"

            ttk.Button(header, text=file_button_label, command=lambda p=target: self.app._open_generated_output_target(p)).pack(side="right", padx=(6, 0))
            ttk.Button(header, text="Tooljet öffnen", command=self.app.open_tooljet_database).pack(side="right", padx=(6, 0))
            tk.Label(
                header,
                text=step["status"].upper(),
                bg=status_bg,
                fg=status_fg,
                padx=10,
                pady=4,
                font=("Helvetica", 10, "bold"),
            ).pack(side="right", padx=(6, 0))

            details = ttk.LabelFrame(section, text="")
            details.pack(fill="x", padx=(10, 0), pady=(6, 0))

            accent = tk.Frame(details, bg=tone_fg, width=6)
            accent.pack(side="left", fill="y")

            details_body = ttk.Frame(details, padding=10)
            details_body.pack(side="left", fill="both", expand=True)

            ttk.Label(details_body, text=step["summary"]).pack(anchor="w", pady=(0, 8))

            meta = ttk.Frame(details_body)
            meta.pack(fill="x")
            meta.grid_columnconfigure(0, weight=1)
            meta.grid_columnconfigure(1, weight=1)

            add_kv_row(meta, "CSV-Muster", step["csv_glob"], 0, 0)
            add_kv_row(meta, "Tooljet-Tabelle", step["table"], 0, 1)
            add_kv_row(meta, "Abhängig von", depends_value, 1, 0)
            add_kv_row(meta, "Erzeugte Datei(en)", files_value, 1, 1, value_fg=("#1b5e20" if files else "#b00020"))

            if files and len(files) > 3:
                files_toggle_var = tk.BooleanVar(value=False)
                files_list = ttk.Frame(details_body)

                def _toggle_files(frame=files_list, var=files_toggle_var, generated=files):
                    if var.get():
                        frame.pack_forget()
                        var.set(False)
                    else:
                        if not frame.winfo_children():
                            for generated_file in generated:
                                ttk.Label(frame, text=f"• {generated_file.name}").pack(anchor="w")
                        frame.pack(fill="x", pady=(6, 0))
                        var.set(True)
                    refresh_import_scrollregion()

                ttk.Button(details_body, text=f"Dateiliste anzeigen ({len(files)})", command=_toggle_files).pack(anchor="w", pady=(6, 0))

            def _apply_toggle_state(frame=details, var=expanded, btn=toggle_btn, spec=step):
                btn.configure(text=f"{'▾' if var.get() else '▸'} {spec['order']}. {spec['table']}")
                if var.get():
                    frame.pack(fill="x", padx=(10, 0), pady=(6, 0))
                else:
                    frame.pack_forget()
                refresh_import_scrollregion()

            def _toggle_section(var=expanded, apply_fn=_apply_toggle_state):
                var.set(not var.get())
                apply_fn()

            toggle_btn.configure(command=_toggle_section)
            _apply_toggle_state()

            if idx < len(plan) - 1:
                ttk.Label(self.wiz_import_content, text="↓ Nächster Import").pack(anchor="center", pady=(0, 8))
                ttk.Separator(self.wiz_import_content, orient="horizontal").pack(fill="x", pady=(0, 12))

        refresh_import_scrollregion()

    def _open_issue_file_from_table(self, table: ttk.Treeview, path_map: dict[str, str], _event=None) -> None:
        self.app._open_issue_file_from_table(table, path_map, _event)


def main() -> int:
    app = App()
    app.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
