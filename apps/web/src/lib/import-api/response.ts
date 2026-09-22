import { NextResponse } from "next/server";
import type { Diagnostic } from "@aad/database";
import { ImportApiError } from "./errors";

const messagesDe: Record<string, string> = {
  missing_file: "Eine erforderliche CSV-Datei fehlt.",
  missing_file_group: "Eine erforderliche Gruppe von CSV-Dateien fehlt.",
  invalid_csv: "Die CSV-Datei kann nicht gelesen werden.",
  unexpected_headers: "Die Spalten der CSV-Datei entsprechen nicht dem erwarteten Schema.",
  duplicate_species: "Wissenschaftliche Artnamen sind mehrfach vorhanden.",
  duplicate_definition: "Attributdefinitionen verwenden denselben Slug mehrfach.",
  missing_plant_name: "Bei einer Pflanze fehlt der wissenschaftliche Name.",
  plant_duplicate: "Mehrere Pflanzenzeilen wurden zu einem Datensatz zusammengeführt.",
  plant_duplicate_conflict: "Mehrere Pflanzenzeilen enthalten widersprüchliche Werte.",
  blank_attribute_value: "Ein Artattribut hat keinen Wert.",
  incomplete_media_metadata: "Bei einem Artenbild fehlen Alt-Text oder Bildnachweis.",
  blank_media_url: "Bei einem Habitatelement-Bild fehlt die URL.",
  duplicate_habitat_relation: "Identische Art-Habitatelement-Beziehungen wurden zusammengeführt.",
  invalid_lifecycle_interval: "Ein Lebenszyklus-Zeitintervall ist ungültig.",
  invalid_lifecycle_order: "Die Reihenfolge eines Lebenszyklus-Segments ist ungültig.",
  invalid_lifecycle_metadata: "Die Metadaten eines Lebenszyklus-Segments sind ungültig.",
  duplicate_lifecycle_segment: "Eine Lebenszyklus-Segment-ID ist mehrfach vorhanden.",
};

function messageDe(diagnostic: Diagnostic): string {
  if (messagesDe[diagnostic.code]) return messagesDe[diagnostic.code];
  if (diagnostic.code.startsWith("orphan_")) {
    return `Eine Referenz konnte nicht aufgelöst werden. ${diagnostic.message}`;
  }
  return `Validierungshinweis: ${diagnostic.message}`;
}

function datasetForFile(file: string | null): string | null {
  if (!file) return null;
  if (file.includes("classification/")) return "species";
  if (file.includes("attribute-definitions/")) return "species_attribute_definitions";
  if (file.includes("portraits/")) return "species_attribute_values";
  if (file.includes("species-portraits/images/")) return "species_images";
  if (file.includes("lifecycle/")) return "species_lifecycle_phases";
  if (file.includes("plants/import/out/plants/")) return "plants";
  if (file.includes("plants/import/out/relations/")) return "species_plant_relations";
  if (file.endsWith("habitat_elements.csv")) return "habitat_elements";
  if (file.endsWith("habitat_element_images.csv")) return "habitat_element_images";
  if (file.endsWith("habitat_element_species_relation.csv")) return "species_habitat_relations";
  return null;
}

function localizedDiagnostic(diagnostic: Diagnostic) {
  const [firstSource] = diagnostic.sources;
  const match = firstSource?.match(/^(.*?):(\d+)$/);
  const file = match?.[1] ?? firstSource ?? null;
  return {
    code: diagnostic.code,
    message: diagnostic.message,
    messageDe: messageDe(diagnostic),
    severity: diagnostic.severity,
    blocking: diagnostic.severity === "error",
    dataset: datasetForFile(file),
    file,
    row: match ? Number(match[2]) : null,
    field: null,
    value: null,
    sources: diagnostic.sources,
  };
}

export function noStoreJson(body: unknown, init: ResponseInit = {}): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export function importErrorResponse(error: unknown): NextResponse {
  if (error instanceof ImportApiError) {
    return noStoreJson({
      ok: false,
      error: { code: error.code, message: error.message },
      diagnostics: error.diagnostics.map(localizedDiagnostic),
    }, { status: error.status });
  }
  console.error("Unhandled import API error", error);
  return noStoreJson({
    ok: false,
    error: { code: "internal_error", message: "Der Import konnte wegen eines internen Fehlers nicht verarbeitet werden." },
    diagnostics: [],
  }, { status: 500 });
}

export const serializeDiagnostics = (diagnostics: Diagnostic[]) => diagnostics.map(localizedDiagnostic);
