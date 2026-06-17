from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
import hashlib
import ssl
import threading
import tkinter as tk
from tkinter import ttk
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import pandas as pd

from .output_graph import OutputGraph, load_output_graph

try:
    from PIL import Image, ImageOps, ImageTk  # type: ignore

    PIL_AVAILABLE = True
except Exception:  # noqa: BLE001
    PIL_AVAILABLE = False

try:
    import certifi  # type: ignore

    CERTIFI_AVAILABLE = True
except Exception:  # noqa: BLE001
    CERTIFI_AVAILABLE = False


VISIBLE_ENTITIES = [
    "species",
    "plants",
    "habitat_elements",
    "species_attribute_definitions",
]

ENTITY_LABELS = {
    "species": "Species",
    "plants": "Plants",
    "habitat_elements": "Habitat Elements",
    "species_attribute_definitions": "Species Attribute Definitions",
}

LIST_THUMB_SIZE = (64, 64)
DETAIL_THUMB_SIZE = (108, 108)
LIFECYCLE_THUMB_SIZE = (160, 160)


@dataclass
class NavEntry:
    entity: str
    row_index: int
    label: str


class OutputDataViewer(tk.Toplevel):
    def __init__(self, parent: tk.Misc, output_root: Path) -> None:
        super().__init__(parent)
        self.title(f"Ergebnisdaten-Viewer: {output_root}")
        self.geometry("1460x920")

        self.output_root = output_root
        self.graph: OutputGraph = load_output_graph(output_root)

        self.current_entity: str | None = None
        self.current_row: int | None = None

        self.displayed_indices: list[int] = []
        self.manual_view_mode: str = "table"  # table|list
        self.detail_open = False

        self.nav_history: list[NavEntry] = []
        self.nav_pos: int = -1
        self._suspend_history = False
        self._suspend_row_select = False

        self.search_var = tk.StringVar()
        self.breadcrumb_var = tk.StringVar(value="-")
        self.status_var = tk.StringVar(value="Bereit")
        self.quality_summary_var = tk.StringVar(value="Keine Hinweise")

        self.image_cache: dict[str, object] = {}
        self.placeholder_cache: dict[str, object] = {}
        self.image_fail_cache: set[str] = set()
        self.image_error_cache: dict[str, str] = {}
        self._image_jobs_inflight: set[str] = set()
        self.image_cache_dir = self.output_root / "_image-cache"
        self.image_cache_dir.mkdir(parents=True, exist_ok=True)
        self.list_cards: list[tk.Frame] = []
        self._tooltips: list[SimpleTooltip] = []
        self.card_colors = {
            "default": "#ffffff",
            "hover": "#f4f8fc",
            "selected": "#e8f2ff",
            "selected_border": "#4a9eff",
            "default_border": "#d7dde4",
        }

        self._build_ui()
        self._populate_entities()
        self._start_image_preload()
        self.bind("<Configure>", self._on_resize)

    def _build_ui(self) -> None:
        outer = ttk.Frame(self, padding=8)
        outer.pack(fill="both", expand=True)
        outer.grid_rowconfigure(2, weight=1)
        outer.grid_columnconfigure(0, weight=1)

        top = ttk.Frame(outer)
        top.grid(row=0, column=0, sticky="ew", pady=(0, 6))
        ttk.Button(top, text="↻ Neu laden", command=self._reload).pack(side="left")
        ttk.Button(top, text="← Zurück", command=self._nav_back).pack(side="left", padx=(8, 0))
        ttk.Button(top, text="→ Vor", command=self._nav_forward).pack(side="left", padx=(4, 0))
        ttk.Button(top, text="⚠ Qualität prüfen", command=self._open_quality_viewer).pack(side="left", padx=(8, 0))
        self.view_toggle_btn = ttk.Button(top, text="Listenansicht", command=self._toggle_view_mode)
        self.view_toggle_btn.pack(side="left", padx=(10, 0))
        self.close_detail_btn = ttk.Button(top, text="Detailansicht schließen", command=self._close_detail)
        self.close_detail_btn.pack(side="left", padx=(6, 0))
        self.close_detail_btn.configure(state="disabled")
        ttk.Label(top, text="Suche:").pack(side="left", padx=(14, 4))
        search = ttk.Entry(top, textvariable=self.search_var, width=42)
        search.pack(side="left")
        search.bind("<KeyRelease>", lambda _e: self._render_master())

        ttk.Label(outer, textvariable=self.breadcrumb_var).grid(row=1, column=0, sticky="ew", pady=(0, 6))

        self.main_split = ttk.Panedwindow(outer, orient="horizontal")
        self.main_split.grid(row=2, column=0, sticky="nsew")

        # left panel
        left = ttk.Frame(self.main_split)
        self.main_split.add(left, weight=1)
        ttk.Label(left, text="Entitäten", font=("Helvetica", 11, "bold")).pack(anchor="w")
        self.entity_list = tk.Listbox(left, exportselection=False, height=8)
        self.entity_list.pack(fill="x", pady=(4, 8))
        self.entity_list.bind("<<ListboxSelect>>", self._on_entity_change)

        ttk.Label(left, text="Qualitätshinweise", font=("Helvetica", 11, "bold")).pack(anchor="w")
        quality_box = ttk.Frame(left)
        quality_box.pack(fill="x", pady=(4, 0))
        ttk.Label(quality_box, textvariable=self.quality_summary_var, foreground="#666").pack(anchor="w")
        ttk.Button(quality_box, text="Alle Hinweise öffnen", command=self._open_quality_viewer).pack(anchor="w", pady=(6, 0))

        # center panel (master)
        self.center_panel = ttk.Frame(self.main_split)
        self.main_split.add(self.center_panel, weight=2)
        ttk.Label(self.center_panel, text="Datensätze", font=("Helvetica", 11, "bold")).pack(anchor="w")

        self.master_stack = ttk.Frame(self.center_panel)
        self.master_stack.pack(fill="both", expand=True, pady=(4, 0))

        self.master_table_wrap = ttk.Frame(self.master_stack)
        self.master_tree = ttk.Treeview(self.master_table_wrap, show="headings")
        self.master_tree.grid(row=0, column=0, sticky="nsew")
        table_sy = ttk.Scrollbar(self.master_table_wrap, orient="vertical", command=self.master_tree.yview)
        table_sy.grid(row=0, column=1, sticky="ns")
        table_sx = ttk.Scrollbar(self.master_table_wrap, orient="horizontal", command=self.master_tree.xview)
        table_sx.grid(row=1, column=0, sticky="ew")
        self.master_table_wrap.grid_rowconfigure(0, weight=1)
        self.master_table_wrap.grid_columnconfigure(0, weight=1)
        self.master_tree.configure(yscrollcommand=table_sy.set, xscrollcommand=table_sx.set)
        self.master_tree.bind("<<TreeviewSelect>>", self._on_row_select)

        self.master_list_wrap = ttk.Frame(self.master_stack)
        self.list_canvas = tk.Canvas(self.master_list_wrap, highlightthickness=0)
        self.list_canvas.pack(side="left", fill="both", expand=True)
        list_sy = ttk.Scrollbar(self.master_list_wrap, orient="vertical", command=self.list_canvas.yview)
        list_sy.pack(side="right", fill="y")
        self.list_canvas.configure(yscrollcommand=list_sy.set)
        self.list_canvas.bind("<MouseWheel>", self._on_list_mousewheel)
        self.list_canvas.bind("<Button-4>", lambda _e: self.list_canvas.yview_scroll(-1, "units"))
        self.list_canvas.bind("<Button-5>", lambda _e: self.list_canvas.yview_scroll(1, "units"))
        self.list_body = ttk.Frame(self.list_canvas)
        self.list_window = self.list_canvas.create_window((0, 0), window=self.list_body, anchor="nw")
        self.list_body.bind("<Configure>", lambda _e: self.list_canvas.configure(scrollregion=self.list_canvas.bbox("all")))
        self.list_canvas.bind("<Configure>", lambda _e: self.list_canvas.itemconfigure(self.list_window, width=self.list_canvas.winfo_width()))

        # right panel (details + relation tabs)
        self.right_panel = ttk.Frame(self.main_split)
        self.main_split.add(self.right_panel, weight=3)
        self.right_panel.grid_rowconfigure(2, weight=1)
        self.right_panel.grid_columnconfigure(0, weight=1)

        self.detail_title = ttk.Label(self.right_panel, text="Detailansicht", font=("Helvetica", 11, "bold"))
        self.detail_title.grid(row=0, column=0, sticky="w")

        self.detail_tabs = ttk.Notebook(self.right_panel)
        self.detail_tabs.grid(row=1, column=0, sticky="nsew", pady=(4, 0))

        status_sep = ttk.Separator(outer, orient="horizontal")
        status_sep.grid(row=3, column=0, sticky="ew", pady=(6, 0))
        status = ttk.Frame(outer)
        status.grid(row=4, column=0, sticky="ew")
        ttk.Label(status, textvariable=self.status_var).pack(anchor="w")

    def _on_resize(self, _event=None) -> None:
        self._apply_view_state()

    def _toggle_view_mode(self) -> None:
        self.manual_view_mode = "list" if self.manual_view_mode == "table" else "table"
        self._apply_view_state()

    def _close_detail(self) -> None:
        self.detail_open = False
        self.current_row = None
        self._render_detail_tabs()
        self._render_breadcrumb()
        self._apply_view_state()

    def _effective_master_view(self) -> str:
        if self.detail_open:
            return "list"
        if self.winfo_width() < 1200:
            return "list"
        return self.manual_view_mode

    def _apply_view_state(self) -> None:
        view = self._effective_master_view()

        if view == "table":
            if self.master_list_wrap.winfo_ismapped():
                self.master_list_wrap.pack_forget()
            if not self.master_table_wrap.winfo_ismapped():
                self.master_table_wrap.pack(fill="both", expand=True)
            self.view_toggle_btn.configure(text="Listenansicht")
        else:
            if self.master_table_wrap.winfo_ismapped():
                self.master_table_wrap.pack_forget()
            if not self.master_list_wrap.winfo_ismapped():
                self.master_list_wrap.pack(fill="both", expand=True)
            self.view_toggle_btn.configure(text="Tabellenansicht")

        self.close_detail_btn.configure(state="normal" if self.detail_open else "disabled")

        try:
            self.main_split.sashpos(0, 260)
            self.main_split.sashpos(1, 520 if self.detail_open else 980)
        except Exception:
            pass

    def _reload(self) -> None:
        self.graph = load_output_graph(self.output_root)
        self.image_cache.clear()
        self._populate_entities()
        self.status_var.set("Neu geladen")

    def _populate_entities(self) -> None:
        self.entity_list.delete(0, "end")
        self.entity_names = [e for e in VISIBLE_ENTITIES if e in self.graph.entities]
        for name in self.entity_names:
            e = self.graph.entities[name]
            self.entity_list.insert("end", f"{ENTITY_LABELS.get(name, name)} ({len(e.rows)}) [{e.status}]")

        if self.entity_names:
            self.entity_list.selection_set(0)
            self._select_entity(self.entity_names[0])

        self._render_quality_issues()

    def _on_entity_change(self, _event=None) -> None:
        sel = self.entity_list.curselection()
        if not sel:
            return
        self._select_entity(self.entity_names[int(sel[0])])

    def _select_entity(self, entity_name: str) -> None:
        self.current_entity = entity_name
        self.current_row = None
        self.detail_open = False
        self._render_master()
        self._render_detail_tabs()
        self._render_quality_issues()
        self._render_breadcrumb()
        self.status_var.set(f"Entität: {ENTITY_LABELS.get(entity_name, entity_name)}")
        self._apply_view_state()

    def _filtered_df(self) -> pd.DataFrame:
        if not self.current_entity:
            return pd.DataFrame()
        entity = self.graph.entities[self.current_entity]
        df = entity.rows.copy()
        if df.empty:
            return df
        q = self.search_var.get().strip().lower()
        if q:
            mask = pd.Series(False, index=df.index)
            for c in df.columns:
                mask = mask | df[c].astype(str).str.lower().str.contains(q, na=False)
            df = df[mask]
        return df

    def _render_master(self) -> None:
        df = self._filtered_df()
        self.displayed_indices = [int(i) for i in df.index.tolist()]
        self._render_table(df)
        self._render_custom_list(df)

    def _render_table(self, df: pd.DataFrame) -> None:
        self.master_tree.delete(*self.master_tree.get_children())
        self.master_tree["columns"] = ()
        if df.empty:
            return
        cols = [str(c) for c in df.columns[:14]]
        self.master_tree["columns"] = cols
        for c in cols:
            self.master_tree.heading(c, text=c)
            self.master_tree.column(c, width=140, anchor="w")
        for idx, row in df.head(900).iterrows():
            vals = ["" if pd.isna(row[c]) else str(row[c]) for c in cols]
            self.master_tree.insert("", "end", iid=str(int(idx)), values=vals)

    def _list_primary_secondary_meta(self, row: pd.Series, entity: str) -> tuple[str, str, str]:
        if entity == "species":
            return (
                str(row.get("common_name", "") or row.get("scientific_name", "-")),
                str(row.get("scientific_name", "")),
                " · ".join([str(row.get("class_common", "")), str(row.get("order_common", "")), str(row.get("family_common", ""))]).strip(" ·"),
            )
        if entity == "plants":
            return (
                str(row.get("common_name", "") or row.get("scientific_name", "-")),
                str(row.get("scientific_name", "")),
                str(row.get("plant_type", "")),
            )
        if entity == "habitat_elements":
            return (
                str(row.get("habitat_element", "-")),
                str(row.get("habitat_element_type", "")),
                str(row.get("location", "")),
            )
        if entity == "species_attribute_definitions":
            return (
                str(row.get("display_name", "-")),
                str(row.get("slug", "")),
                " · ".join([str(row.get("level1_category_display_name", "")), str(row.get("level2_category_display_name", ""))]).strip(" ·"),
            )
        return str(row.iloc[0]) if len(row) else "-", "", ""

    def _clean_text(self, value: object) -> str:
        txt = "" if pd.isna(value) else str(value)
        txt = txt.replace("\\n", "\n").strip()
        return txt

    def _render_custom_list(self, df: pd.DataFrame) -> None:
        for c in self.list_body.winfo_children():
            c.destroy()
        self.list_cards.clear()
        if df.empty or not self.current_entity:
            return

        selected_idx = self.current_row
        for idx, row in df.head(900).iterrows():
            i = int(idx)
            title, subtitle, meta = self._list_primary_secondary_meta(row, self.current_entity)

            is_selected = selected_idx == i
            bg = self.card_colors["selected"] if is_selected else self.card_colors["default"]
            border = self.card_colors["selected_border"] if is_selected else self.card_colors["default_border"]
            card = tk.Frame(
                self.list_body,
                bg=bg,
                bd=1,
                relief="solid",
                highlightthickness=1,
                highlightbackground=border,
                highlightcolor=border,
            )
            card.pack(fill="x", pady=4)
            card.configure(height=92)
            card.pack_propagate(False)
            setattr(card, "_row_index", i)
            self.list_cards.append(card)

            inner = tk.Frame(card, bg=bg)
            inner.pack(fill="x", padx=8, pady=8)

            thumb_wrap, thumb = self._build_thumb_label(inner, LIST_THUMB_SIZE)
            thumb_wrap.pack(side="left", padx=(0, 10))
            # Listenansicht bleibt responsiv: keine blockierenden Remote-Loads pro Karte.
            self._apply_thumbnail(thumb, self.current_entity, row, allow_remote=False, size=LIST_THUMB_SIZE)

            text_col = tk.Frame(inner, bg=bg)
            text_col.pack(side="left", fill="both", expand=True)

            title_lbl = tk.Label(
                text_col,
                text=self._clean_text(title),
                bg=bg,
                fg="#1f1f1f",
                font=("Helvetica", 12, "bold"),
                anchor="w",
                justify="left",
                wraplength=360,
            )
            title_lbl.pack(fill="x")
            sub_lbl = tk.Label(
                text_col,
                text=self._clean_text(subtitle),
                bg=bg,
                fg="#4a4a4a",
                font=("Helvetica", 11, "italic"),
                anchor="w",
                justify="left",
                wraplength=360,
            )
            sub_lbl.pack(fill="x")
            if meta.strip():
                meta_lbl = tk.Label(
                    text_col,
                    text=self._clean_text(meta),
                    bg=bg,
                    fg="#6a6a6a",
                    font=("Helvetica", 10),
                    anchor="w",
                    justify="left",
                    wraplength=360,
                )
                meta_lbl.pack(fill="x")
            else:
                meta_lbl = None

            widgets = [card, inner, thumb, text_col, title_lbl, sub_lbl]
            if meta_lbl is not None:
                widgets.append(meta_lbl)

            for w in widgets:
                w.bind("<Button-1>", lambda _e, rid=i: self._select_row(self.current_entity or "", rid, push_history=True))
                w.bind("<Enter>", lambda _e, rid=i: self._card_hover(rid, True))
                w.bind("<Leave>", lambda _e, rid=i: self._card_hover(rid, False))
                w.bind("<MouseWheel>", self._on_list_mousewheel)
                w.bind("<Button-4>", lambda _e: self.list_canvas.yview_scroll(-1, "units"))
                w.bind("<Button-5>", lambda _e: self.list_canvas.yview_scroll(1, "units"))

    def _card_hover(self, row_idx: int, entering: bool) -> None:
        if self.current_row == row_idx:
            return
        for card in self.list_cards:
            tag = getattr(card, "_row_index", None)
            if tag == row_idx:
                self._set_card_style(
                    card,
                    self.card_colors["hover"] if entering else self.card_colors["default"],
                    self.card_colors["default_border"],
                )

    def _set_card_style(self, card: tk.Frame, color: str, border: str) -> None:
        card.configure(bg=color)
        try:
            card.configure(highlightbackground=border, highlightcolor=border)
        except Exception:
            pass
        for c in card.winfo_children():
            self._set_widget_tree_bg(c, color)

    def _set_widget_tree_bg(self, w: tk.Widget, color: str) -> None:
        try:
            if isinstance(w, (tk.Frame, tk.Label)):
                w.configure(bg=color)
        except Exception:
            pass
        for child in w.winfo_children():
            self._set_widget_tree_bg(child, color)

    def _on_row_select(self, _event=None) -> None:
        if self._suspend_row_select or not self.current_entity:
            return
        sel = self.master_tree.selection()
        if not sel:
            return
        row_idx = int(sel[0])
        if self.current_row == row_idx:
            return
        self._select_row(self.current_entity, row_idx, push_history=True)

    def _sync_master_selection(self) -> None:
        selected_idx = self.current_row
        self._suspend_row_select = True
        try:
            if selected_idx is not None and str(selected_idx) in self.master_tree.get_children():
                self.master_tree.selection_set(str(selected_idx))
                self.master_tree.focus(str(selected_idx))
                self.master_tree.see(str(selected_idx))
            else:
                self.master_tree.selection_remove(self.master_tree.selection())
        finally:
            self._suspend_row_select = False

        for card in self.list_cards:
            rid = getattr(card, "_row_index", None)
            is_selected = rid == selected_idx
            bg = self.card_colors["selected"] if is_selected else self.card_colors["default"]
            border = self.card_colors["selected_border"] if is_selected else self.card_colors["default_border"]
            self._set_card_style(card, bg, border)

    def _select_row(self, entity: str, row_idx: int, push_history: bool) -> None:
        if not entity:
            return
        self.current_entity = entity
        self.current_row = row_idx
        self.detail_open = True

        if push_history and not self._suspend_history:
            self._push_history(NavEntry(entity=entity, row_index=row_idx, label=self._row_label(entity, row_idx)))

        if entity in self.entity_names:
            pos = self.entity_names.index(entity)
            self.entity_list.selection_clear(0, "end")
            self.entity_list.selection_set(pos)

        # Kein kompletter Re-Render beim Row-Select (sonst teuer): nur Selektion synchronisieren.
        self._sync_master_selection()

        self._render_detail_tabs()
        self._render_breadcrumb()
        self._apply_view_state()

    def _render_detail_tabs(self) -> None:
        for tab in self.detail_tabs.tabs():
            self.detail_tabs.forget(tab)

        details = ttk.Frame(self.detail_tabs)
        self.detail_tabs.add(details, text="Details")

        if self.current_entity is None or self.current_row is None:
            ttk.Label(details, text="Wählen Sie einen Datensatz aus.").pack(anchor="w", padx=10, pady=10)
            return

        self._render_detail_form(details)

        if self.current_entity == "species":
            names = ["Lebenszyklus", "Pflanzen", "Habitatelemente", "Eigenschaftsbrowser"]
        elif self.current_entity == "habitat_elements":
            names = ["Beziehungen zu Zielarten"]
        elif self.current_entity == "plants":
            names = ["Zielarten"]
        else:
            names = ["Zielarten"]

        relation_sets = self._relation_tabs_for_current()
        for idx, (tab_name, rows, columns) in enumerate(relation_sets):
            caption = names[idx] if idx < len(names) else tab_name
            tab = ttk.Frame(self.detail_tabs)
            self.detail_tabs.add(tab, text=caption)
            if self.current_entity == "species" and caption == "Lebenszyklus":
                self._render_species_lifecycle_media(tab)
            tree = self._build_relation_tree(tab, columns)
            for row in rows:
                vals = [row.get(c[0], "") for c in columns]
                tree.insert("", "end", values=vals + [row.get("_entity", ""), str(row.get("_row", ""))])

    def _render_detail_form(self, parent: ttk.Frame) -> None:
        entity = self.graph.entities[self.current_entity]
        if entity.rows.empty or self.current_row not in entity.rows.index:
            ttk.Label(parent, text="Datensatz nicht verfügbar.").pack(anchor="w", padx=10, pady=10)
            return
        row = entity.rows.loc[self.current_row]

        header = ttk.Frame(parent)
        header.pack(fill="x", padx=10, pady=(10, 2))

        thumb_wrap, thumb = self._build_thumb_label(header, DETAIL_THUMB_SIZE)
        thumb_wrap.pack(side="left", padx=(0, 12))
        self._apply_thumbnail(thumb, self.current_entity, row, allow_remote=True, size=DETAIL_THUMB_SIZE)
        self._attach_tooltip(
            thumb,
            lambda: self._image_debug_text(self.current_entity or "", row),
        )

        textbox = ttk.Frame(header)
        textbox.pack(side="left", fill="x", expand=True)
        ttk.Label(textbox, text=self._row_label(self.current_entity, self.current_row), font=("Helvetica", 15, "bold")).pack(anchor="w")
        ttk.Label(textbox, text=ENTITY_LABELS.get(self.current_entity, self.current_entity), foreground="#666").pack(anchor="w", pady=(2, 0))

        body = ttk.Frame(parent)
        body.pack(fill="both", expand=True, padx=10, pady=(6, 10))

        if self.current_entity == "species":
            self._field_block(body, "Systematik", [
                ("Wissenschaftlicher Name", row.get("scientific_name", "")),
                ("Name (Deutsch)", row.get("common_name", "")),
                ("Alternativer Name", row.get("alternative_common_name", "")),
                ("Klasse", row.get("class_common", "")),
                ("Ordnung", row.get("order_common", "")),
                ("Familie", row.get("family_common", "")),
                ("Gattung", row.get("genus_common", "")),
            ])
            p_url, l_url = self._species_image_urls(row)
            self._field_block(body, "Bilder (URLs)", [
                ("Portrait-Bild URL", p_url or ""),
                ("Lebenszyklus-Bild URL", l_url or ""),
            ])
        elif self.current_entity == "plants":
            self._field_block(body, "Pflanzenprofil", [
                ("Wissenschaftlicher Name", row.get("scientific_name", "")),
                ("Name (Deutsch)", row.get("common_name", "")),
                ("Typ", row.get("plant_type", "")),
                ("Blühzeit", row.get("flowering_time", "")),
                ("Heimisch", row.get("is_native", "")),
                ("Ökologische Bedeutung", row.get("local_fauna_importance", "")),
            ])
        elif self.current_entity == "habitat_elements":
            self._field_block(body, "Spezifikation", [
                ("Element", row.get("habitat_element", "")),
                ("Elementtyp", row.get("habitat_element_type", "")),
                ("Größe", row.get("size", "")),
                ("Standort", row.get("location", "")),
                ("In Kombination mit", row.get("combined_with", "")),
            ])
            self._field_block(body, "Maßnahmen", [
                ("Beschreibung/Anlage", row.get("measure_description", "")),
                ("Pflege", row.get("maintenance", "")),
            ])
        else:
            self._field_block(body, "Attributdefinition", [
                ("Anzeigename", row.get("display_name", "")),
                ("Slug", row.get("slug", "")),
                ("Kategorie 1", row.get("level1_category_display_name", "")),
                ("Kategorie 2", row.get("level2_category_display_name", "")),
                ("Beschreibung", row.get("description", "")),
                ("Erläuterung", row.get("explanation", "")),
            ])

    def _field_block(self, parent: ttk.Frame, title: str, pairs: list[tuple[str, object]]) -> None:
        lf = ttk.LabelFrame(parent, text=title)
        lf.pack(fill="x", pady=5)
        grid = ttk.Frame(lf)
        grid.pack(fill="x", padx=8, pady=6)
        for i, (k, v) in enumerate(pairs):
            ttk.Label(grid, text=f"{k}:", foreground="#666").grid(row=i, column=0, sticky="nw", padx=(0, 8), pady=2)
            ent = ttk.Entry(grid)
            ent.grid(row=i, column=1, sticky="ew", pady=2)
            txt = "" if pd.isna(v) else str(v)
            ent.insert(0, txt)
            ent.configure(state="readonly")
        grid.grid_columnconfigure(1, weight=1)

    def _build_relation_tree(self, parent: ttk.Frame, columns: list[tuple[str, str, int]]) -> ttk.Treeview:
        wrap = ttk.Frame(parent)
        wrap.pack(fill="both", expand=True, padx=8, pady=8)
        ids = [c[0] for c in columns] + ["entity", "row"]
        tree = ttk.Treeview(wrap, columns=ids, show="headings")
        for cid, title, width in columns:
            tree.heading(cid, text=title)
            tree.column(cid, width=width, anchor="w")
        tree.column("entity", width=0, stretch=False)
        tree.column("row", width=0, stretch=False)
        tree.grid(row=0, column=0, sticky="nsew")
        sy = ttk.Scrollbar(wrap, orient="vertical", command=tree.yview)
        sy.grid(row=0, column=1, sticky="ns")
        sx = ttk.Scrollbar(wrap, orient="horizontal", command=tree.xview)
        sx.grid(row=1, column=0, sticky="ew")
        wrap.grid_rowconfigure(0, weight=1)
        wrap.grid_columnconfigure(0, weight=1)
        tree.configure(yscrollcommand=sy.set, xscrollcommand=sx.set)
        tree.bind("<Double-1>", self._jump_from_relation_tree)
        return tree

    def _relation_tabs_for_current(self) -> list[tuple[str, list[dict], list[tuple[str, str, int]]]]:
        out: list[tuple[str, list[dict], list[tuple[str, str, int]]]] = []
        if self.current_entity is None or self.current_row is None:
            return out
        entities = self.graph.entities
        row = entities[self.current_entity].rows.loc[self.current_row]

        if self.current_entity == "species":
            sci = str(row.get("scientific_name", "")).strip()

            # Lebenszyklus: aus Species Attributes gefiltert
            sattrs = entities.get("species_attributes")
            defs = entities.get("species_attribute_definitions")
            life_rows: list[dict] = []
            attr_rows: list[dict] = []
            if sci and sattrs is not None and defs is not None and not sattrs.rows.empty:
                rel = sattrs.rows[self._col(sattrs.rows, "species").str.strip() == sci]
                defs_df = defs.rows.copy()
                defs_df["_slug"] = self._col(defs_df, "slug").str.strip()
                for _, rr in rel.iterrows():
                    slug = str(rr.get("attribute_slug", "")).strip()
                    dmatch = defs_df[defs_df["_slug"] == slug]
                    l1 = str(dmatch.iloc[0].get("level1_category_display_name", "")) if not dmatch.empty else ""
                    l2 = str(dmatch.iloc[0].get("level2_category_display_name", "")) if not dmatch.empty else ""
                    dname = str(dmatch.iloc[0].get("display_name", "")) if not dmatch.empty else slug
                    val = str(rr.get("attribute_value", ""))
                    src = str(rr.get("sources", ""))
                    didx = int(dmatch.index[0]) if not dmatch.empty else -1
                    rec = {
                        "section": l2,
                        "attribute": dname,
                        "value": val,
                        "sources": src,
                        "_entity": "species_attribute_definitions",
                        "_row": didx,
                    }
                    if "lebens" in l1.lower() or "lebens" in l2.lower() or "life" in l1.lower() or "life" in l2.lower():
                        life_rows.append(rec)
                    attr_rows.append({
                        "level1": l1,
                        "level2": l2,
                        "display_name": dname,
                        "attribute_value": val,
                        "sources": src,
                        "_entity": "species_attribute_definitions",
                        "_row": didx,
                    })
            out.append(("Lebenszyklus", life_rows, [("section", "Abschnitt", 220), ("attribute", "Attribut", 230), ("value", "Wert", 380), ("sources", "Quellen", 180)]))

            pr = entities.get("plant_relations")
            plants = entities.get("plants")
            plant_rows: list[dict] = []
            if sci and pr is not None and plants is not None and not pr.rows.empty:
                rel = pr.rows[self._col(pr.rows, "species").str.strip() == sci]
                for _, rr in rel.iterrows():
                    p_name = str(rr.get("plant", "")).strip()
                    match = plants.rows[self._col(plants.rows, "scientific_name").str.strip() == p_name]
                    pidx = int(match.index[0]) if not match.empty else -1
                    plant_rows.append({
                        "scientific_name": p_name,
                        "common_name": str(match.iloc[0].get("common_name", "")) if not match.empty else "",
                        "purpose": str(rr.get("purpose", "")),
                        "annotations": str(rr.get("annotations", "")),
                        "sources": str(rr.get("sources", "")),
                        "_entity": "plants",
                        "_row": pidx,
                    })
            out.append(("Pflanzen", plant_rows, [("scientific_name", "Wiss. Name", 210), ("common_name", "Deutscher Name", 180), ("purpose", "Zweck", 170), ("annotations", "Anmerkungen", 220), ("sources", "Quellen", 180)]))

            hr = entities.get("habitat_element_species_relations")
            habitats = entities.get("habitat_elements")
            hab_rows: list[dict] = []
            if sci and hr is not None and habitats is not None and not hr.rows.empty:
                rel = hr.rows[self._col(hr.rows, "species").str.strip() == sci]
                for _, rr in rel.iterrows():
                    hid = str(rr.get("habitat_element", "")).strip()
                    match = habitats.rows[self._col(habitats.rows, "id").str.strip() == hid]
                    hidx = int(match.index[0]) if not match.empty else -1
                    hab_rows.append({
                        "habitat_element": str(match.iloc[0].get("habitat_element", "")) if not match.empty else hid,
                        "purpose": str(rr.get("purpose", "")),
                        "purpose_element": str(rr.get("purpose_element", "")),
                        "lifecycle_stage": str(rr.get("lifecycle_stage", "")),
                        "_entity": "habitat_elements",
                        "_row": hidx,
                    })
            out.append(("Habitatelemente", hab_rows, [("habitat_element", "Habitatelement", 220), ("purpose", "Funktion", 170), ("purpose_element", "Funktionselement", 180), ("lifecycle_stage", "Lebensphase(n)", 160)]))

            out.append(("Eigenschaftsbrowser", attr_rows, [("level1", "Kategorie 1", 170), ("level2", "Kategorie 2", 170), ("display_name", "Attribut", 220), ("attribute_value", "Wert", 360), ("sources", "Quellen", 180)]))

        elif self.current_entity == "plants":
            pname = str(row.get("scientific_name", "")).strip()
            pr = entities.get("plant_relations")
            species = entities.get("species")
            rows: list[dict] = []
            if pname and pr is not None and species is not None and not pr.rows.empty:
                rel = pr.rows[self._col(pr.rows, "plant").str.strip() == pname]
                for _, rr in rel.iterrows():
                    sname = str(rr.get("species", "")).strip()
                    smatch = species.rows[self._col(species.rows, "scientific_name").str.strip() == sname]
                    sidx = int(smatch.index[0]) if not smatch.empty else -1
                    rows.append({
                        "common_name": str(smatch.iloc[0].get("common_name", "")) if not smatch.empty else "",
                        "scientific_name": sname,
                        "purpose": str(rr.get("purpose", "")),
                        "_entity": "species",
                        "_row": sidx,
                    })
            out.append(("Zielarten", rows, [("common_name", "Deutscher Name", 180), ("scientific_name", "Wiss. Name", 220), ("purpose", "Zweck", 220)]))

        elif self.current_entity == "habitat_elements":
            hid = str(row.get("id", "")).strip()
            hr = entities.get("habitat_element_species_relations")
            species = entities.get("species")
            rows: list[dict] = []
            if hid and hr is not None and species is not None and not hr.rows.empty:
                rel = hr.rows[self._col(hr.rows, "habitat_element").str.strip() == hid]
                for _, rr in rel.iterrows():
                    sname = str(rr.get("species", "")).strip()
                    smatch = species.rows[self._col(species.rows, "scientific_name").str.strip() == sname]
                    sidx = int(smatch.index[0]) if not smatch.empty else -1
                    rows.append({
                        "common_name": str(smatch.iloc[0].get("common_name", "")) if not smatch.empty else "",
                        "scientific_name": sname,
                        "purpose": str(rr.get("purpose", "")),
                        "purpose_element": str(rr.get("purpose_element", "")),
                        "lifecycle_stage": str(rr.get("lifecycle_stage", "")),
                        "_entity": "species",
                        "_row": sidx,
                    })
            out.append(("Beziehungen zu Zielarten", rows, [("common_name", "Deutscher Name", 180), ("scientific_name", "Wiss. Name", 220), ("purpose", "Funktion", 160), ("purpose_element", "Funktionselement", 180), ("lifecycle_stage", "Lebensphase(n)", 160)]))

        elif self.current_entity == "species_attribute_definitions":
            slug = str(row.get("slug", "")).strip()
            sattrs = entities.get("species_attributes")
            species = entities.get("species")
            rows: list[dict] = []
            if slug and sattrs is not None and species is not None and not sattrs.rows.empty:
                rel = sattrs.rows[self._col(sattrs.rows, "attribute_slug").str.strip() == slug]
                for _, rr in rel.iterrows():
                    sname = str(rr.get("species", "")).strip()
                    smatch = species.rows[self._col(species.rows, "scientific_name").str.strip() == sname]
                    sidx = int(smatch.index[0]) if not smatch.empty else -1
                    rows.append({
                        "common_name": str(smatch.iloc[0].get("common_name", "")) if not smatch.empty else "",
                        "scientific_name": sname,
                        "attribute_value": str(rr.get("attribute_value", "")),
                        "sources": str(rr.get("sources", "")),
                        "_entity": "species",
                        "_row": sidx,
                    })
            out.append(("Zielarten", rows, [("common_name", "Deutscher Name", 180), ("scientific_name", "Wiss. Name", 220), ("attribute_value", "Wert", 320), ("sources", "Quellen", 220)]))

        return out

    def _render_species_lifecycle_media(self, tab: ttk.Frame) -> None:
        if self.current_entity != "species" or self.current_row is None:
            return
        species = self.graph.entities.get("species")
        if species is None or species.rows.empty or self.current_row not in species.rows.index:
            return
        row = species.rows.loc[self.current_row]
        portrait_url, lifecycle_url = self._species_image_urls(row)

        box = ttk.LabelFrame(tab, text="Lebenszyklus-Bild")
        box.pack(fill="x", padx=8, pady=(8, 0))
        top = ttk.Frame(box)
        top.pack(fill="x", padx=8, pady=8)

        img_wrap, img_label = self._build_thumb_label(top, LIFECYCLE_THUMB_SIZE)
        img_wrap.pack(side="left", padx=(0, 10))

        text_col = ttk.Frame(top)
        text_col.pack(side="left", fill="x", expand=True)
        ttk.Label(text_col, text="Lifecycle-URL").pack(anchor="w")
        url_value = lifecycle_url or portrait_url or ""
        url_entry = ttk.Entry(text_col)
        url_entry.pack(fill="x", expand=True, pady=(2, 0))
        url_entry.insert(0, url_value)
        url_entry.configure(state="readonly")
        ttk.Button(text_col, text="URL im Browser öffnen", command=lambda: self._open_url(url_value)).pack(anchor="w", pady=(6, 0))

        if url_value:
            img = self._load_thumbnail(url_value, LIFECYCLE_THUMB_SIZE, allow_remote=True)
            if img is not None:
                img_label.configure(image=img, text="")
                img_label.image = img
        self._attach_tooltip(
            img_label,
            lambda: self._image_debug_text(self.current_entity or "", row, preferred_url=url_value),
        )

    def _jump_from_relation_tree(self, _event=None) -> None:
        widget = self.focus_get()
        if not isinstance(widget, ttk.Treeview):
            return
        sel = widget.selection()
        if not sel:
            return
        vals = widget.item(sel[0]).get("values") or []
        if len(vals) < 2:
            return
        entity = vals[-2]
        row_raw = vals[-1]
        try:
            row_idx = int(row_raw)
        except Exception:
            return
        if entity in self.entity_names and row_idx >= 0:
            self._select_row(entity, row_idx, push_history=True)

    def _render_quality_issues(self) -> None:
        if self.current_entity is None:
            self.quality_summary_var.set("Keine Hinweise")
            return
        entity_issues = [i for i in self.graph.quality_issues if i.entity == self.current_entity]
        errors = sum(1 for i in entity_issues if i.severity.lower() == "error")
        warnings = sum(1 for i in entity_issues if i.severity.lower() == "warning")
        if not entity_issues:
            self.quality_summary_var.set("Keine Hinweise")
        else:
            self.quality_summary_var.set(f"{len(entity_issues)} Hinweise ({errors} Fehler, {warnings} Warnungen)")

    def _open_quality_viewer(self) -> None:
        win = tk.Toplevel(self)
        win.title("Qualitätshinweise")
        win.geometry("1400x720")

        root = ttk.Frame(win, padding=10)
        root.pack(fill="both", expand=True)
        root.grid_rowconfigure(1, weight=1)
        root.grid_columnconfigure(0, weight=1)

        top = ttk.Frame(root)
        top.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        ttk.Label(top, text="Qualitätshinweise", font=("Helvetica", 12, "bold")).pack(side="left")
        scope_var = tk.StringVar(value="current")

        ttk.Radiobutton(top, text="Aktuelle Entität", variable=scope_var, value="current").pack(side="left", padx=(16, 0))
        ttk.Radiobutton(top, text="Alle Entitäten", variable=scope_var, value="all").pack(side="left", padx=(8, 0))

        wrap = ttk.Frame(root)
        wrap.grid(row=1, column=0, sticky="nsew")
        wrap.grid_rowconfigure(0, weight=1)
        wrap.grid_columnconfigure(0, weight=1)

        tree = ttk.Treeview(
            wrap,
            columns=("sev", "entity", "code", "field", "row", "message"),
            show="headings",
        )
        tree.heading("sev", text="Severity")
        tree.heading("entity", text="Stufe/Entität")
        tree.heading("code", text="Code")
        tree.heading("field", text="Feld")
        tree.heading("row", text="Zeile")
        tree.heading("message", text="Hinweis")
        tree.column("sev", width=90, anchor="center")
        tree.column("entity", width=220, anchor="w")
        tree.column("code", width=180, anchor="w")
        tree.column("field", width=180, anchor="w")
        tree.column("row", width=90, anchor="center")
        tree.column("message", width=900, anchor="w")
        tree.tag_configure("error", foreground="#b00020")
        tree.tag_configure("warning", foreground="#b26a00")
        tree.grid(row=0, column=0, sticky="nsew")

        sy = ttk.Scrollbar(wrap, orient="vertical", command=tree.yview)
        sy.grid(row=0, column=1, sticky="ns")
        sx = ttk.Scrollbar(wrap, orient="horizontal", command=tree.xview)
        sx.grid(row=1, column=0, sticky="ew")
        tree.configure(yscrollcommand=sy.set, xscrollcommand=sx.set)

        def fill() -> None:
            tree.delete(*tree.get_children())
            issues = self.graph.quality_issues
            if scope_var.get() == "current" and self.current_entity:
                issues = [i for i in issues if i.entity == self.current_entity]
            for idx, issue in enumerate(issues):
                tree.insert(
                    "",
                    "end",
                    iid=f"qi{idx}",
                    values=(
                        issue.severity.upper(),
                        issue.entity,
                        issue.code,
                        issue.field or "",
                        "" if issue.row_index is None else str(issue.row_index),
                        issue.message,
                    ),
                    tags=(issue.severity.lower(),),
                )

        scope_var.trace_add("write", lambda *_: fill())
        fill()

    def _push_history(self, entry: NavEntry) -> None:
        if self.nav_pos >= 0 and self.nav_pos < len(self.nav_history):
            cur = self.nav_history[self.nav_pos]
            if cur.entity == entry.entity and cur.row_index == entry.row_index:
                return
        if self.nav_pos < len(self.nav_history) - 1:
            self.nav_history = self.nav_history[: self.nav_pos + 1]
        self.nav_history.append(entry)
        self.nav_pos = len(self.nav_history) - 1

    def _nav_back(self) -> None:
        if self.nav_pos <= 0:
            return
        self.nav_pos -= 1
        entry = self.nav_history[self.nav_pos]
        self._suspend_history = True
        try:
            self._select_row(entry.entity, entry.row_index, push_history=False)
        finally:
            self._suspend_history = False

    def _nav_forward(self) -> None:
        if self.nav_pos >= len(self.nav_history) - 1:
            return
        self.nav_pos += 1
        entry = self.nav_history[self.nav_pos]
        self._suspend_history = True
        try:
            self._select_row(entry.entity, entry.row_index, push_history=False)
        finally:
            self._suspend_history = False

    def _render_breadcrumb(self) -> None:
        if self.current_entity is None:
            self.breadcrumb_var.set("-")
            return
        if self.current_row is None:
            self.breadcrumb_var.set(ENTITY_LABELS.get(self.current_entity, self.current_entity))
            return
        self.breadcrumb_var.set(f"{ENTITY_LABELS.get(self.current_entity, self.current_entity)} > {self._row_label(self.current_entity, self.current_row)}")

    def _row_label(self, entity_name: str, row_idx: int) -> str:
        entity = self.graph.entities.get(entity_name)
        if entity is None or entity.rows.empty or row_idx not in entity.rows.index:
            return "-"
        row = entity.rows.loc[row_idx]
        fields = [f for f in entity.display_fields if f in entity.rows.columns]
        vals = []
        for f in fields[:3]:
            v = row.get(f)
            if not pd.isna(v) and str(v).strip():
                vals.append(str(v))
        return " | ".join(vals) if vals else f"row {row_idx}"

    def _col(self, df: pd.DataFrame, col: str) -> pd.Series:
        if col not in df.columns:
            return pd.Series(["" for _ in range(len(df))], index=df.index)
        return df[col].astype(str)

    def _image_url_for_row(self, entity_name: str, row: pd.Series) -> str | None:
        entities = self.graph.entities
        if entity_name == "species":
            portrait_url, lifecycle_url = self._species_image_urls(row)
            return portrait_url or lifecycle_url
        if entity_name == "habitat_elements":
            hid = str(row.get("id", "")).strip()
            imgs = entities.get("habitat_element_images")
            if imgs is not None and not imgs.rows.empty and hid:
                match = imgs.rows[self._col(imgs.rows, "habitat_element").str.strip() == hid]
                if not match.empty:
                    url = str(match.iloc[0].get("image_url", "")).strip()
                    return url or None
        return None

    def _species_image_urls(self, row: pd.Series) -> tuple[str | None, str | None]:
        entities = self.graph.entities
        sci = str(row.get("scientific_name", "")).strip()
        imgs = entities.get("species_images")
        portrait_url: str | None = None
        lifecycle_url: str | None = None
        if imgs is None or imgs.rows.empty or not sci:
            return portrait_url, lifecycle_url
        match = imgs.rows[self._col(imgs.rows, "species").str.strip() == sci]
        if match.empty:
            return portrait_url, lifecycle_url

        if "image_type" in match.columns:
            types = self._col(match, "image_type").str.strip().str.lower()
            p = match[types == "portrait"]
            l = match[types == "lifecycle"]
            if not p.empty:
                portrait_url = str(p.iloc[0].get("image_url", "")).strip() or None
            if not l.empty:
                lifecycle_url = str(l.iloc[0].get("image_url", "")).strip() or None
        if portrait_url is None:
            portrait_url = str(match.iloc[0].get("image_url", "")).strip() or None
        return portrait_url, lifecycle_url

    def _apply_thumbnail(
        self,
        label: tk.Label,
        entity_name: str,
        row: pd.Series,
        allow_remote: bool = True,
        size: tuple[int, int] = (64, 64),
    ) -> None:
        url = self._image_url_for_row(entity_name, row)
        if not url:
            return
        img = self._load_thumbnail(url, size, allow_remote=False)
        if img is not None:
            label.configure(image=img, text="")
            label.image = img
            return
        if allow_remote:
            self._schedule_thumbnail_load(url, size, label)

    def _load_thumbnail(self, url: str, size: tuple[int, int], allow_remote: bool = True) -> object | None:
        key = f"{url}|{size[0]}x{size[1]}"
        if key in self.image_cache:
            return self.image_cache[key]
        if key in self.image_fail_cache:
            return None
        if not PIL_AVAILABLE:
            self.image_error_cache[url] = "Pillow (PIL) nicht verfügbar"
            return None
        try:
            data = self._get_image_bytes(url, allow_remote=allow_remote)
            if not data:
                return None
            img = Image.open(BytesIO(data)).convert("RGB")
            img = ImageOps.fit(img, size, method=Image.Resampling.LANCZOS)
            tk_img = ImageTk.PhotoImage(img)
            self.image_cache[key] = tk_img
            self.image_error_cache.pop(url, None)
            return tk_img
        except Exception as exc:
            self.image_error_cache[url] = str(exc)
            self.image_fail_cache.add(key)
            return None

    def _download_image_bytes(self, url: str) -> bytes:
        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
        referers = [origin, "https://animal-aided-design.de", "https://www.animal-aided-design.de", ""]
        last_err: Exception | None = None
        used_insecure_fallback = False

        if CERTIFI_AVAILABLE:
            ctx_primary = ssl.create_default_context(cafile=certifi.where())
        else:
            ctx_primary = ssl.create_default_context()
        ctx_insecure = ssl._create_unverified_context()

        for ref in referers:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                "Connection": "keep-alive",
            }
            if ref:
                headers["Referer"] = ref
            req = Request(url, headers=headers)
            try:
                with urlopen(req, timeout=10.0, context=ctx_primary) as resp:
                    return resp.read()
            except URLError as exc:
                last_err = exc
                reason = getattr(exc, "reason", None)
                is_ssl_verify_err = isinstance(reason, ssl.SSLCertVerificationError) or (
                    reason is not None and "CERTIFICATE_VERIFY_FAILED" in str(reason)
                )
                if is_ssl_verify_err:
                    try:
                        with urlopen(req, timeout=10.0, context=ctx_insecure) as resp:
                            used_insecure_fallback = True
                            data = resp.read()
                            self.image_error_cache[url] = (
                                "TLS-Zertifikatsprüfung fehlgeschlagen; Bild über unsicheren Fallback geladen. "
                                "Empfehlung: certifi/Truststore im Build korrigieren."
                            )
                            return data
                    except Exception as exc2:  # noqa: BLE001
                        last_err = exc2
                continue
            except HTTPError as exc:
                last_err = exc
                continue
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                continue

        if last_err is None:
            raise RuntimeError("Unbekannter Downloadfehler")
        if isinstance(last_err, HTTPError):
            raise RuntimeError(f"HTTP {last_err.code} beim Laden")
        if used_insecure_fallback:
            raise RuntimeError("Download fehlgeschlagen (auch nach unsicherem TLS-Fallback)")
        raise RuntimeError(f"Downloadfehler: {last_err}")

    def _cache_path_for_url(self, url: str) -> Path:
        parsed = urlparse(url)
        ext = Path(parsed.path).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            ext = ".img"
        digest = hashlib.sha1(url.encode("utf-8")).hexdigest()
        return self.image_cache_dir / f"{digest}{ext}"

    def _get_image_bytes(self, url: str, allow_remote: bool = True) -> bytes | None:
        cache_path = self._cache_path_for_url(url)
        if cache_path.exists():
            try:
                return cache_path.read_bytes()
            except Exception:
                pass
        if not allow_remote:
            return None
        data = self._download_image_bytes(url)
        try:
            cache_path.write_bytes(data)
        except Exception:
            pass
        return data

    def _schedule_thumbnail_load(self, url: str, size: tuple[int, int], label: tk.Label) -> None:
        key = f"{url}|{size[0]}x{size[1]}"
        if key in self.image_cache or key in self._image_jobs_inflight:
            return
        self._image_jobs_inflight.add(key)

        def worker() -> None:
            img_obj = None
            err: str | None = None
            try:
                data = self._get_image_bytes(url, allow_remote=True)
                if data and PIL_AVAILABLE:
                    pil_img = Image.open(BytesIO(data)).convert("RGB")
                    pil_img = ImageOps.fit(pil_img, size, method=Image.Resampling.LANCZOS)
                    img_obj = pil_img
            except Exception as exc:  # noqa: BLE001
                err = str(exc)

            def apply_on_ui() -> None:
                self._image_jobs_inflight.discard(key)
                if err:
                    self.image_error_cache[url] = err
                    self.image_fail_cache.add(key)
                    return
                if img_obj is None:
                    return
                try:
                    tk_img = ImageTk.PhotoImage(img_obj)
                    self.image_cache[key] = tk_img
                    self.image_error_cache.pop(url, None)
                    if label.winfo_exists():
                        label.configure(image=tk_img, text="")
                        label.image = tk_img
                    # Refresh list quickly so other cards pick up cached thumbs.
                    self._render_custom_list(self._filtered_df())
                except Exception:
                    pass

            self.after(0, apply_on_ui)

        threading.Thread(target=worker, daemon=True).start()

    def _start_image_preload(self) -> None:
        if not PIL_AVAILABLE:
            return
        urls: set[str] = set()
        species = self.graph.entities.get("species")
        if species is not None and not species.rows.empty:
            for _, row in species.rows.iterrows():
                p, l = self._species_image_urls(row)
                if p:
                    urls.add(p)
                if l:
                    urls.add(l)
        habitats = self.graph.entities.get("habitat_elements")
        if habitats is not None and not habitats.rows.empty:
            for _, row in habitats.rows.iterrows():
                u = self._image_url_for_row("habitat_elements", row)
                if u:
                    urls.add(u)

        def prewarm_worker(batch: list[str]) -> None:
            for u in batch:
                try:
                    self._get_image_bytes(u, allow_remote=True)
                except Exception:
                    pass
            self.after(0, lambda: self._render_custom_list(self._filtered_df()))

        threading.Thread(target=prewarm_worker, args=(list(urls)[:400],), daemon=True).start()

    def _image_debug_text(self, entity_name: str, row: pd.Series, preferred_url: str | None = None) -> str:
        url = preferred_url or self._image_url_for_row(entity_name, row) or ""
        if not url:
            return "Kein Bild-URL gefunden"
        err = self.image_error_cache.get(url)
        if err:
            return f"{url}\nFehler: {err}"
        return url

    def _open_url(self, url: str) -> None:
        if not url:
            return
        try:
            import webbrowser

            webbrowser.open(url)
        except Exception:
            pass

    def _attach_tooltip(self, widget: tk.Widget, text_fn) -> None:
        tip = SimpleTooltip(widget, text_fn)
        self._tooltips.append(tip)

    def _on_list_mousewheel(self, event) -> str:
        delta = getattr(event, "delta", 0)
        if delta == 0:
            return "break"
        steps = -int(delta / 120)
        if steps == 0:
            steps = -1 if delta > 0 else 1
        self.list_canvas.yview_scroll(steps, "units")
        return "break"

    def _build_thumb_label(self, parent: tk.Misc, size: tuple[int, int]) -> tuple[tk.Frame, tk.Label]:
        frame = tk.Frame(parent, width=size[0], height=size[1], bg="#dfe3e8", highlightthickness=1, highlightbackground="#d7dde4")
        frame.pack_propagate(False)
        placeholder = self._placeholder_image(size)
        label = tk.Label(frame, image=placeholder, bg="#dfe3e8", borderwidth=0, highlightthickness=0)
        label.image = placeholder
        label.pack(fill="both", expand=True)
        return frame, label

    def _placeholder_image(self, size: tuple[int, int]) -> object:
        key = f"{size[0]}x{size[1]}"
        if key in self.placeholder_cache:
            return self.placeholder_cache[key]
        if PIL_AVAILABLE:
            img = Image.new("RGB", size, "#dfe3e8")
            ph = ImageTk.PhotoImage(img)
        else:
            ph = tk.PhotoImage(width=size[0], height=size[1])
        self.placeholder_cache[key] = ph
        return ph


class SimpleTooltip:
    def __init__(self, widget: tk.Widget, text_fn) -> None:
        self.widget = widget
        self.text_fn = text_fn
        self.tip: tk.Toplevel | None = None
        widget.bind("<Enter>", self._show, add="+")
        widget.bind("<Leave>", self._hide, add="+")

    def _show(self, _event=None) -> None:
        text = self.text_fn() if callable(self.text_fn) else str(self.text_fn)
        if not text:
            return
        if self.tip is not None:
            return
        self.tip = tk.Toplevel(self.widget)
        self.tip.wm_overrideredirect(True)
        x = self.widget.winfo_rootx() + 12
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 4
        self.tip.wm_geometry(f"+{x}+{y}")
        label = tk.Label(
            self.tip,
            text=text,
            justify="left",
            background="#1f1f1f",
            foreground="#ffffff",
            relief="solid",
            borderwidth=1,
            padx=8,
            pady=4,
            wraplength=680,
        )
        label.pack()

    def _hide(self, _event=None) -> None:
        if self.tip is not None:
            self.tip.destroy()
            self.tip = None


def open_output_data_viewer(parent: tk.Misc, output_root: Path) -> OutputDataViewer:
    return OutputDataViewer(parent=parent, output_root=output_root)
