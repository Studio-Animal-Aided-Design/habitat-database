import path from "node:path";
import { bool, clean, completeness, findCsvFiles, hash, key, readCsv, semanticKey, type CsvRow } from "./lib.js";

const headers = {
  species: ["id", "scientific_name", "alternative_scientific_name", "common_name", "alternative_common_name", "class_common", "class_scientific", "order_common", "order_scientific", "family_common", "family_scientific", "genus_common", "genus_scientific"],
  definitions: ["id", "primary_sort", "secondary_sort", "level1_category", "level2_category", "level1_category_display_name", "level2_category_display_name", "field_name", "display_name", "description", "explanation", "has_sources", "slug"],
  speciesImages: ["id", "species", "image_url", "attribution", "image_alt", "image_type"],
  plants: ["scientific_name", "common_name", "id", "plant_type", "flowering_time", "is_native", "local_fauna_importance"],
  habitats: ["id", "habitat_element", "habitat_element_type", "size", "location", "measure_description", "maintenance", "combined_with"],
  habitatImages: ["id", "habitat_element", "image_url", "image_alt", "attribution", "image_type"],
  habitatRelations: ["id", "habitat_element", "species", "lifecycle_stage", "purpose", "purpose_element"],
  attributes: ["id", "attribute_value", "sources", "species", "attribute_slug"],
  plantRelations: ["id", "species", "plant", "purpose", "annotations", "sources"],
} as const;

export interface Diagnostic { severity: "warning" | "error"; code: string; message: string; sources: string[] }
export interface SourceFile { path: string; checksum: string; rowCount: number }
export interface SourceRef { file: string; row: number; legacyId: string | null }

export interface Snapshot {
  manifestChecksum: string;
  files: SourceFile[];
  diagnostics: Diagnostic[];
  species: any[];
  definitions: any[];
  plants: any[];
  habitats: any[];
  attributes: any[];
  speciesImages: any[];
  habitatImages: any[];
  plantRelations: any[];
  habitatRelations: any[];
}

const ref = (row: CsvRow): SourceRef => ({ file: row.__file, row: Number(row.__row), legacyId: clean(row.id) });

export async function buildSnapshot(repoRoot: string): Promise<Snapshot> {
  const dataRoot = path.join(repoRoot, "data");
  const allFiles = await findCsvFiles(dataRoot);
  const diagnostics: Diagnostic[] = [];
  const files: SourceFile[] = [];

  async function load(suffix: string, expected: readonly string[]): Promise<CsvRow[]> {
    const file = allFiles.find((candidate) => candidate.endsWith(suffix));
    if (!file) throw new Error(`Required CSV is missing: ${suffix}`);
    const loaded = await readCsv(file, repoRoot, [...expected]);
    files.push({ path: path.relative(repoRoot, file), checksum: loaded.checksum, rowCount: loaded.rows.length });
    return loaded.rows;
  }
  async function loadMany(fragment: string, expected: readonly string[]): Promise<CsvRow[]> {
    const selected = allFiles.filter((candidate) => candidate.includes(fragment));
    if (!selected.length) throw new Error(`No CSV files found for: ${fragment}`);
    const rows: CsvRow[] = [];
    for (const file of selected) {
      const loaded = await readCsv(file, repoRoot, [...expected]);
      files.push({ path: path.relative(repoRoot, file), checksum: loaded.checksum, rowCount: loaded.rows.length });
      rows.push(...loaded.rows);
    }
    return rows;
  }

  const speciesRows = await load("classification/import/out/species.csv", headers.species);
  const definitionRows = await load("attribute-definitions/import/out/species-attribute-definitions.csv", headers.definitions);
  const speciesImageRows = await load("images/import/out/species-images.csv", headers.speciesImages);
  const plantRows = await load("plants/import/out/plants/all_plants.csv", headers.plants);
  const habitatRows = await load("habitat-elements/import/out/habitat_elements.csv", headers.habitats);
  const habitatImageRows = await load("habitat-elements/import/out/habitat_element_images.csv", headers.habitatImages);
  const habitatRelationRows = await load("habitat-elements/import/out/habitat_element_species_relation.csv", headers.habitatRelations);
  const attributeRows = await loadMany(`${path.sep}portraits${path.sep}import${path.sep}out${path.sep}attributes${path.sep}`, headers.attributes);
  const plantRelationRows = await loadMany(`${path.sep}plants${path.sep}import${path.sep}out${path.sep}relations${path.sep}`, headers.plantRelations);

  const species = speciesRows.map((row) => ({ ...Object.fromEntries(headers.species.map((field) => [field, clean(row[field])])), naturalKey: key(row.scientific_name), source: ref(row) }));
  const definitions = definitionRows.map((row) => ({
    slug: clean(row.slug), primarySort: Number(row.primary_sort), secondarySort: Number(row.secondary_sort),
    level1Category: clean(row.level1_category), level2Category: clean(row.level2_category), level1DisplayName: clean(row.level1_category_display_name),
    level2DisplayName: clean(row.level2_category_display_name), fieldName: clean(row.field_name), displayName: clean(row.display_name),
    description: clean(row.description), explanation: clean(row.explanation), hasSources: bool(row.has_sources) ?? false, source: ref(row),
  }));

  const speciesKeys = new Set(species.map((item) => item.naturalKey));
  const definitionSlugs = new Set(definitions.map((item) => item.slug));
  const habitatSlugs = new Set(habitatRows.map((row) => clean(row.id)));
  if (speciesKeys.size !== species.length) diagnostics.push({ severity: "error", code: "duplicate_species", message: "Duplicate species scientific names", sources: [] });
  if (definitionSlugs.size !== definitions.length) diagnostics.push({ severity: "error", code: "duplicate_definition", message: "Duplicate attribute definition slugs", sources: [] });

  const plantGroups = new Map<string, CsvRow[]>();
  for (const row of plantRows) {
    const naturalKey = key(row.scientific_name);
    if (!naturalKey) diagnostics.push({ severity: "error", code: "missing_plant_name", message: "Plant has no scientific name", sources: [`${row.__file}:${row.__row}`] });
    plantGroups.set(naturalKey, [...(plantGroups.get(naturalKey) ?? []), row]);
  }
  const plants = [...plantGroups.entries()].map(([naturalKey, rows]) => {
    const ranked = [...rows].sort((a, b) => completeness(b) - completeness(a) || Number(a.__row) - Number(b.__row));
    const canonical = { ...ranked[0] };
    for (const alternate of ranked.slice(1)) {
      for (const field of headers.plants) {
        if (!clean(canonical[field]) && clean(alternate[field])) canonical[field] = alternate[field];
        else if (clean(canonical[field]) && clean(alternate[field]) && key(canonical[field]) !== key(alternate[field])) {
          diagnostics.push({ severity: "warning", code: "plant_duplicate_conflict", message: `${clean(canonical.scientific_name)}: conflicting ${field}; selected '${clean(canonical[field])}'`, sources: rows.map((r) => `${r.__file}:${r.__row}`) });
        }
      }
    }
    if (rows.length > 1) diagnostics.push({ severity: "warning", code: "plant_duplicate", message: `Collapsed ${rows.length} rows for ${clean(canonical.scientific_name)}`, sources: rows.map((r) => `${r.__file}:${r.__row}`) });
    return { scientificName: clean(canonical.scientific_name), naturalKey, commonName: clean(canonical.common_name), plantType: clean(canonical.plant_type), floweringTime: clean(canonical.flowering_time), nativeStatus: clean(canonical.is_native), localFaunaImportance: clean(canonical.local_fauna_importance), sources: rows.map(ref) };
  });
  const plantKeys = new Set(plants.map((item) => item.naturalKey));

  const habitats = habitatRows.map((row) => ({ legacySlug: clean(row.id), name: clean(row.habitat_element), elementType: clean(row.habitat_element_type), size: clean(row.size), location: clean(row.location), measureDescription: clean(row.measure_description), maintenance: clean(row.maintenance), combinedWithText: clean(row.combined_with), source: ref(row) }));

  function requireReference(ok: boolean, code: string, message: string, row: CsvRow): void {
    if (!ok) diagnostics.push({ severity: "error", code, message, sources: [`${row.__file}:${row.__row}`] });
  }
  const attributes = attributeRows.map((row) => {
    requireReference(speciesKeys.has(key(row.species)), "orphan_attribute_species", `Unknown species: ${row.species}`, row);
    requireReference(definitionSlugs.has(clean(row.attribute_slug)), "orphan_attribute_definition", `Unknown definition: ${row.attribute_slug}`, row);
    if (!clean(row.attribute_value)) diagnostics.push({ severity: "warning", code: "blank_attribute_value", message: `${row.species} / ${row.attribute_slug} has a blank value`, sources: [`${row.__file}:${row.__row}`] });
    return { speciesKey: key(row.species), definitionSlug: clean(row.attribute_slug), value: clean(row.attribute_value), sources: clean(row.sources), source: ref(row) };
  });

  const speciesImages = speciesImageRows.map((row) => {
    requireReference(speciesKeys.has(key(row.species)), "orphan_species_image", `Unknown species: ${row.species}`, row);
    if (!clean(row.attribution) || !clean(row.image_alt)) diagnostics.push({ severity: "warning", code: "incomplete_media_metadata", message: `Incomplete species image metadata for ${row.species}`, sources: [`${row.__file}:${row.__row}`] });
    return { ownerKey: key(row.species), url: clean(row.image_url), attribution: clean(row.attribution), alt: clean(row.image_alt), imageType: clean(row.image_type) ?? "image", sourceKey: semanticKey("species", row.species, row.image_type), source: ref(row) };
  });
  const habitatImages = habitatImageRows.map((row) => {
    requireReference(habitatSlugs.has(clean(row.habitat_element)), "orphan_habitat_image", `Unknown habitat: ${row.habitat_element}`, row);
    if (!clean(row.image_url)) diagnostics.push({ severity: "warning", code: "blank_media_url", message: `Blank habitat image URL for ${row.habitat_element}`, sources: [`${row.__file}:${row.__row}`] });
    return { ownerKey: clean(row.habitat_element), url: clean(row.image_url), attribution: clean(row.attribution), alt: clean(row.image_alt), imageType: clean(row.image_type) ?? "image", sourceKey: semanticKey("habitat", row.habitat_element, row.image_type), source: ref(row) };
  });

  const plantRelations = plantRelationRows.map((row) => {
    requireReference(speciesKeys.has(key(row.species)), "orphan_plant_relation_species", `Unknown species: ${row.species}`, row);
    requireReference(plantKeys.has(key(row.plant)), "orphan_plant_relation_plant", `Unknown plant: ${row.plant}`, row);
    return { speciesKey: key(row.species), plantKey: key(row.plant), purpose: clean(row.purpose), annotations: clean(row.annotations), sources: clean(row.sources), semanticKey: semanticKey(row.species, row.plant, row.purpose, row.annotations, row.sources), source: ref(row) };
  });
  const habitatRelationCandidates = habitatRelationRows.map((row) => {
    requireReference(speciesKeys.has(key(row.species)), "orphan_habitat_relation_species", `Unknown species: ${row.species}`, row);
    requireReference(habitatSlugs.has(clean(row.habitat_element)), "orphan_habitat_relation_habitat", `Unknown habitat: ${row.habitat_element}`, row);
    return { speciesKey: key(row.species), habitatKey: clean(row.habitat_element), lifecycleStage: clean(row.lifecycle_stage), purpose: clean(row.purpose), purposeElement: clean(row.purpose_element), annotations: null, semanticKey: semanticKey(row.species, row.habitat_element, row.lifecycle_stage, row.purpose, row.purpose_element), sources: [ref(row)] };
  });
  const habitatRelationGroups = new Map<string, typeof habitatRelationCandidates>();
  for (const row of habitatRelationCandidates) habitatRelationGroups.set(row.semanticKey, [...(habitatRelationGroups.get(row.semanticKey) ?? []), row]);
  const habitatRelations = [...habitatRelationGroups.values()].map((rows) => {
    if (rows.length > 1) diagnostics.push({ severity: "warning", code: "duplicate_habitat_relation", message: `Collapsed ${rows.length} identical habitat relations`, sources: rows.flatMap((r) => r.sources.map((s) => `${s.file}:${s.row}`)) });
    return { ...rows[0], sources: rows.flatMap((row) => row.sources) };
  });

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { manifestChecksum: hash(files.map((file) => `${file.path}:${file.checksum}`).join("\n")), files, diagnostics, species, definitions, plants, habitats, attributes, speciesImages, habitatImages, plantRelations, habitatRelations };
}
