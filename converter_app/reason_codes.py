from __future__ import annotations

REASON_CATALOG_DE = {
    "MISSING_FILE": "Datei fehlt. Bitte prüfen, ob die Quelldatei im erwarteten Ordner liegt.",
    "MISSING_SHEET": "Erwartetes Arbeitsblatt fehlt in der Excel-Datei.",
    "MISSING_REQUIRED_COLUMN": "Erforderliche Spalten fehlen in der Eingabedatei.",
    "INVALID_SPECIES_NAME": "Artname konnte nicht eindeutig ermittelt werden.",
    "UNREADABLE_FILE": "Datei konnte nicht gelesen werden (evtl. beschädigt oder gesperrt).",
    "EMPTY_OUTPUT": "Ausgabe ist leer. Die Eingabedaten enthalten keine verwertbaren Zeilen.",
    "DEPENDENCY_FAILED": "Vorstufe fehlgeschlagen; diese Stufe kann nicht ausgeführt werden.",
    "ROW_DROPPED": "Zeile wurde wegen ungültiger oder unvollständiger Daten ausgelassen.",
    "DUPLICATE_INPUT": "Mehrere passende Eingabedateien gefunden; es wurde eine Datei ausgewählt.",
    "UNKNOWN_ERROR": "Unbekannter Fehler bei der Verarbeitung.",
}

def reason_message(code: str) -> str:
    return REASON_CATALOG_DE.get(code, REASON_CATALOG_DE["UNKNOWN_ERROR"])
