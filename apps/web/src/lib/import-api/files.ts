import { ImportApiError } from "./errors";

export const requiredImportFiles = [
  "data/species-portraits/classification/import/out/species.csv",
  "data/species-portraits/attribute-definitions/import/out/species-attribute-definitions.csv",
  "data/species-portraits/images/import/out/species-images.csv",
  "data/species-portraits/lifecycle/import/out/species-lifecycle-phases.csv",
  "data/plants/import/out/plants/all_plants.csv",
  "data/habitat-elements/import/out/habitat_elements.csv",
  "data/habitat-elements/import/out/habitat_element_images.csv",
  "data/habitat-elements/import/out/habitat_element_species_relation.csv",
] as const;

const requiredGroups = [
  /^data\/species-portraits\/portraits\/import\/out\/attributes\/[^/]+_attributes\.csv$/,
  /^data\/plants\/import\/out\/relations\/[^/]+_species_plant_relationship\.csv$/,
] as const;

export function isAllowedImportPath(value: string): boolean {
  return requiredImportFiles.includes(value as (typeof requiredImportFiles)[number])
    || requiredGroups.some((pattern) => pattern.test(value));
}

export type UploadedImportFile = { logicalPath: string; file: File };

export function parseImportForm(formData: FormData, maxFiles: number, maxBytes: number): {
  mode: "merge" | "sync";
  files: UploadedImportFile[];
} {
  const modeValue = formData.get("mode");
  const mode = modeValue === null ? "merge" : modeValue;
  if (mode !== "merge" && mode !== "sync") {
    throw new ImportApiError(400, "invalid_mode", "Der Importmodus muss 'merge' oder 'sync' sein.");
  }

  const files: UploadedImportFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  for (const [field, value] of formData.entries()) {
    if (field === "mode") continue;
    if (!field.startsWith("file:") || !(value instanceof File)) {
      throw new ImportApiError(400, "unexpected_form_field", `Unerwartetes Formularfeld: ${field}`);
    }
    const logicalPath = field.slice("file:".length);
    if (!isAllowedImportPath(logicalPath)) {
      throw new ImportApiError(400, "invalid_file_path", `Der Dateipfad ist für den Import nicht erlaubt: ${logicalPath}`);
    }
    if (seen.has(logicalPath)) {
      throw new ImportApiError(400, "duplicate_file", `Die Datei wurde mehrfach übertragen: ${logicalPath}`);
    }
    seen.add(logicalPath);
    files.push({ logicalPath, file: value });
    totalBytes += value.size;
  }

  if (files.length > maxFiles) throw new ImportApiError(413, "too_many_files", `Der Upload darf höchstens ${maxFiles} Dateien enthalten.`);
  if (totalBytes > maxBytes) throw new ImportApiError(413, "upload_too_large", `Der Upload darf höchstens ${maxBytes} Byte groß sein.`);
  const missing = requiredImportFiles.filter((file) => !seen.has(file));
  if (missing.length) throw new ImportApiError(422, "missing_files", `Erforderliche CSV-Dateien fehlen: ${missing.join(", ")}`);
  for (const pattern of requiredGroups) {
    if (![...seen].some((file) => pattern.test(file))) {
      throw new ImportApiError(422, "missing_file_group", "Mindestens eine Attribut- und eine Pflanzenbeziehungsdatei sind erforderlich.");
    }
  }
  return { mode, files };
}
