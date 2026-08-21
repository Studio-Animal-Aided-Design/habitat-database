import path from "node:path";
import type pg from "pg";
import { hash } from "./lib.js";
import { writeReport, type DatasetDiff, type ImportReport } from "./report.js";
import { buildSnapshot, type Snapshot, type SourceRef } from "./snapshot.js";

export type SyncMode = "merge" | "sync";
const importedPublicationStatus = "published" as const;

const fingerprint = (value: unknown): string => hash(JSON.stringify(value));
const diff = (desired: Map<string, string>, current: Map<string, string>, mode: SyncMode): DatasetDiff => {
  let inserted = 0, updated = 0, unchanged = 0;
  for (const [key, value] of desired) {
    if (!current.has(key)) inserted++;
    else if (current.get(key) === value) unchanged++;
    else updated++;
  }
  const missing = [...current.keys()].filter((key) => !desired.has(key)).length;
  return { incoming: desired.size, inserted, updated, unchanged, removedOrArchived: mode === "sync" ? missing : 0 };
};

async function currentMap(client: pg.PoolClient, table: string, keyColumn: string, requirePublished = false): Promise<Map<string, string>> {
  const statusColumn = requirePublished ? ", publication_status" : "";
  const result = await client.query<{ key: string; source_fingerprint: string; publication_status?: string }>(`SELECT ${keyColumn} AS key, source_fingerprint${statusColumn} FROM ${table} WHERE source_managed`);
  return new Map(result.rows.map((row) => [
    row.key,
    requirePublished && row.publication_status !== importedPublicationStatus
      ? `publication-status:${row.publication_status}:${row.source_fingerprint}`
      : row.source_fingerprint
  ]));
}

function desiredMaps(snapshot: Snapshot): Record<string, Map<string, string>> {
  const map = (items: any[], getKey: (item: any) => string) => new Map(items.map((item) => [getKey(item), fingerprint(item)]));
  return {
    species: map(snapshot.species, (item) => item.naturalKey),
    plants: map(snapshot.plants, (item) => item.naturalKey),
    habitat_elements: map(snapshot.habitats, (item) => item.legacySlug),
    species_attribute_definitions: map(snapshot.definitions, (item) => item.slug),
    species_attribute_values: map(snapshot.attributes, (item) => `${item.speciesKey}:${item.definitionSlug}`),
    media_assets: map([...snapshot.speciesImages, ...snapshot.habitatImages], (item) => item.sourceKey),
    species_plant_relations: map(snapshot.plantRelations, (item) => item.semanticKey),
    species_habitat_relations: map(snapshot.habitatRelations, (item) => item.semanticKey),
  };
}

export async function planSync(client: pg.PoolClient, repoRoot: string, mode: SyncMode): Promise<{ snapshot: Snapshot; report: ImportReport }> {
  const snapshot = await buildSnapshot(repoRoot);
  const errors = snapshot.diagnostics.filter((item) => item.severity === "error");
  if (errors.length) throw new Error(`CSV validation failed:\n${errors.map((item) => `- ${item.message} (${item.sources.join(", ")})`).join("\n")}`);
  const desired = desiredMaps(snapshot);
  const keys: Record<string, string> = {
    species: "scientific_name_key", plants: "scientific_name_key", habitat_elements: "legacy_slug",
    species_attribute_definitions: "slug", species_attribute_values: "species_id::text || ':' || definition_id::text",
    media_assets: "source_key", species_plant_relations: "semantic_key", species_habitat_relations: "semantic_key",
  };
  const datasets: Record<string, DatasetDiff> = {};
  for (const [name, desiredRows] of Object.entries(desired)) {
    if (name === "species_attribute_values") {
      const rows = await client.query<{ key: string; source_fingerprint: string }>(`SELECT s.scientific_name_key || ':' || d.slug AS key, v.source_fingerprint FROM species_attribute_values v JOIN species s ON s.id=v.species_id JOIN species_attribute_definitions d ON d.id=v.definition_id WHERE v.source_managed`);
      datasets[name] = diff(desiredRows, new Map(rows.rows.map((row) => [row.key, row.source_fingerprint])), mode);
    } else datasets[name] = diff(
      desiredRows,
      await currentMap(client, name, keys[name], ["species", "plants", "habitat_elements"].includes(name)),
      mode
    );
  }
  return { snapshot, report: { generatedAt: new Date().toISOString(), manifestChecksum: snapshot.manifestChecksum, mode, applied: false, sourceFiles: snapshot.files, datasets, diagnostics: snapshot.diagnostics } };
}

const fieldsFingerprint = (item: any): string => fingerprint(item);
const placeholders = (count: number, offset = 1): string => Array.from({ length: count }, (_, i) => `$${i + offset}`).join(",");

export async function applySync(client: pg.PoolClient, snapshot: Snapshot, report: ImportReport): Promise<ImportReport> {
  await client.query("BEGIN");
  try {
    for (const item of snapshot.species) {
      const values = [item.scientific_name, item.naturalKey, item.alternative_scientific_name, item.common_name, item.alternative_common_name, item.class_common, item.class_scientific, item.order_common, item.order_scientific, item.family_common, item.family_scientific, item.genus_common, item.genus_scientific, fieldsFingerprint(item)];
      await client.query(`INSERT INTO species(scientific_name,scientific_name_key,alternative_scientific_name,common_name,alternative_common_name,class_common,class_scientific,order_common,order_scientific,family_common,family_scientific,genus_common,genus_scientific,publication_status,source_managed,source_fingerprint) VALUES (${placeholders(13)},'published',true,$14) ON CONFLICT(scientific_name_key) DO UPDATE SET scientific_name=EXCLUDED.scientific_name,alternative_scientific_name=EXCLUDED.alternative_scientific_name,common_name=EXCLUDED.common_name,alternative_common_name=EXCLUDED.alternative_common_name,class_common=EXCLUDED.class_common,class_scientific=EXCLUDED.class_scientific,order_common=EXCLUDED.order_common,order_scientific=EXCLUDED.order_scientific,family_common=EXCLUDED.family_common,family_scientific=EXCLUDED.family_scientific,genus_common=EXCLUDED.genus_common,genus_scientific=EXCLUDED.genus_scientific,source_managed=true,source_fingerprint=EXCLUDED.source_fingerprint,publication_status='published',updated_at=now() WHERE species.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint OR species.publication_status IS DISTINCT FROM 'published'`, values);
    }
    for (const item of snapshot.plants) {
      const values = [item.scientificName, item.naturalKey, item.commonName, item.plantType, item.floweringTime, item.nativeStatus, item.localFaunaImportance, fieldsFingerprint(item)];
      await client.query(`INSERT INTO plants(scientific_name,scientific_name_key,common_name,plant_type,flowering_time,native_status,local_fauna_importance,publication_status,source_managed,source_fingerprint) VALUES (${placeholders(7)},'published',true,$8) ON CONFLICT(scientific_name_key) DO UPDATE SET scientific_name=EXCLUDED.scientific_name,common_name=EXCLUDED.common_name,plant_type=EXCLUDED.plant_type,flowering_time=EXCLUDED.flowering_time,native_status=EXCLUDED.native_status,local_fauna_importance=EXCLUDED.local_fauna_importance,source_managed=true,source_fingerprint=EXCLUDED.source_fingerprint,publication_status='published',updated_at=now() WHERE plants.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint OR plants.publication_status IS DISTINCT FROM 'published'`, values);
    }
    for (const item of snapshot.habitats) {
      const values = [item.legacySlug, item.name, item.elementType, item.size, item.location, item.measureDescription, item.maintenance, item.combinedWithText, fieldsFingerprint(item)];
      await client.query(`INSERT INTO habitat_elements(legacy_slug,name,element_type,size,location,measure_description,maintenance,combined_with_text,publication_status,source_managed,source_fingerprint) VALUES (${placeholders(8)},'published',true,$9) ON CONFLICT(legacy_slug) DO UPDATE SET name=EXCLUDED.name,element_type=EXCLUDED.element_type,size=EXCLUDED.size,location=EXCLUDED.location,measure_description=EXCLUDED.measure_description,maintenance=EXCLUDED.maintenance,combined_with_text=EXCLUDED.combined_with_text,source_managed=true,source_fingerprint=EXCLUDED.source_fingerprint,publication_status='published',updated_at=now() WHERE habitat_elements.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint OR habitat_elements.publication_status IS DISTINCT FROM 'published'`, values);
    }
    for (const item of snapshot.definitions) {
      const values = [item.slug,item.primarySort,item.secondarySort,item.level1Category,item.level2Category,item.level1DisplayName,item.level2DisplayName,item.fieldName,item.displayName,item.description,item.explanation,item.hasSources,fieldsFingerprint(item)];
      await client.query(`INSERT INTO species_attribute_definitions(slug,primary_sort,secondary_sort,level1_category,level2_category,level1_display_name,level2_display_name,field_name,display_name,description,explanation,has_sources,source_managed,source_fingerprint) VALUES (${placeholders(12)},true,$13) ON CONFLICT(slug) DO UPDATE SET primary_sort=EXCLUDED.primary_sort,secondary_sort=EXCLUDED.secondary_sort,level1_category=EXCLUDED.level1_category,level2_category=EXCLUDED.level2_category,level1_display_name=EXCLUDED.level1_display_name,level2_display_name=EXCLUDED.level2_display_name,field_name=EXCLUDED.field_name,display_name=EXCLUDED.display_name,description=EXCLUDED.description,explanation=EXCLUDED.explanation,has_sources=EXCLUDED.has_sources,source_managed=true,source_fingerprint=EXCLUDED.source_fingerprint,updated_at=now() WHERE species_attribute_definitions.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint`, values);
    }

    const speciesIds = new Map((await client.query<{ id: string; scientific_name_key: string }>("SELECT id,scientific_name_key FROM species")).rows.map((row) => [row.scientific_name_key,row.id]));
    const plantIds = new Map((await client.query<{ id: string; scientific_name_key: string }>("SELECT id,scientific_name_key FROM plants")).rows.map((row) => [row.scientific_name_key,row.id]));
    const habitatIds = new Map((await client.query<{ id: string; legacy_slug: string }>("SELECT id,legacy_slug FROM habitat_elements")).rows.map((row) => [row.legacy_slug,row.id]));
    const definitionIds = new Map((await client.query<{ id: string; slug: string }>("SELECT id,slug FROM species_attribute_definitions")).rows.map((row) => [row.slug,row.id]));

    for (const item of snapshot.attributes) {
      const values = [speciesIds.get(item.speciesKey),definitionIds.get(item.definitionSlug),item.value,item.sources,fieldsFingerprint(item)];
      await client.query(`INSERT INTO species_attribute_values(species_id,definition_id,value,sources,source_managed,source_fingerprint) VALUES ($1,$2,$3,$4,true,$5) ON CONFLICT(species_id,definition_id) DO UPDATE SET value=EXCLUDED.value,sources=EXCLUDED.sources,source_managed=true,source_fingerprint=EXCLUDED.source_fingerprint,updated_at=now() WHERE species_attribute_values.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint`, values);
    }
    for (const item of snapshot.plantRelations) {
      const values = [speciesIds.get(item.speciesKey),plantIds.get(item.plantKey),item.purpose,item.annotations,item.sources,item.semanticKey,fieldsFingerprint(item)];
      await client.query(`INSERT INTO species_plant_relations(species_id,plant_id,purpose,annotations,sources,semantic_key,source_managed,source_fingerprint) VALUES (${placeholders(6)},true,$7) ON CONFLICT(semantic_key) DO UPDATE SET purpose=EXCLUDED.purpose,annotations=EXCLUDED.annotations,sources=EXCLUDED.sources,source_managed=true,source_fingerprint=EXCLUDED.source_fingerprint,updated_at=now() WHERE species_plant_relations.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint`, values);
    }
    for (const item of snapshot.habitatRelations) {
      const values = [speciesIds.get(item.speciesKey),habitatIds.get(item.habitatKey),item.lifecycleStage,item.purpose,item.purposeElement,item.annotations,item.semanticKey,fieldsFingerprint(item)];
      await client.query(`INSERT INTO species_habitat_relations(species_id,habitat_element_id,lifecycle_stage,purpose,purpose_element,annotations,semantic_key,source_managed,source_fingerprint) VALUES (${placeholders(7)},true,$8) ON CONFLICT(semantic_key) DO UPDATE SET lifecycle_stage=EXCLUDED.lifecycle_stage,purpose=EXCLUDED.purpose,purpose_element=EXCLUDED.purpose_element,annotations=EXCLUDED.annotations,source_managed=true,source_fingerprint=EXCLUDED.source_fingerprint,updated_at=now() WHERE species_habitat_relations.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint`, values);
    }
    const mediaIds = new Map<string,string>();
    for (const [ownerType, items] of [["species",snapshot.speciesImages],["habitat",snapshot.habitatImages]] as const) {
      for (const item of items) {
        const itemFingerprint = fieldsFingerprint(item);
        const media = await client.query<{ id: string }>(`INSERT INTO media_assets(external_url,alt_text,attribution,image_type,source_key,source_fingerprint,source_managed) VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT(source_key) DO UPDATE SET external_url=EXCLUDED.external_url,alt_text=EXCLUDED.alt_text,attribution=EXCLUDED.attribution,image_type=EXCLUDED.image_type,source_fingerprint=EXCLUDED.source_fingerprint,source_managed=true,updated_at=now() WHERE media_assets.source_fingerprint IS DISTINCT FROM EXCLUDED.source_fingerprint RETURNING id`, [item.url,item.alt,item.attribution,item.imageType,item.sourceKey,itemFingerprint]);
        const mediaId = media.rows[0]?.id ?? (await client.query<{id:string}>("SELECT id FROM media_assets WHERE source_key=$1",[item.sourceKey])).rows[0].id;
        mediaIds.set(item.sourceKey,mediaId);
        if (ownerType === "species") await client.query("INSERT INTO species_media(species_id,media_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [speciesIds.get(item.ownerKey),mediaId]);
        else await client.query("INSERT INTO habitat_element_media(habitat_element_id,media_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [habitatIds.get(item.ownerKey),mediaId]);
      }
    }

    if (report.mode === "sync") {
      const desired = desiredMaps(snapshot);
      const removeMissing = async (table: string, column: string, values: string[]) => {
        if (values.length) await client.query(`DELETE FROM ${table} WHERE source_managed AND NOT (${column} = ANY($1::text[]))`, [values]);
        else await client.query(`DELETE FROM ${table} WHERE source_managed`);
      };
      await removeMissing("species_plant_relations","semantic_key",[...desired.species_plant_relations.keys()]);
      await removeMissing("species_habitat_relations","semantic_key",[...desired.species_habitat_relations.keys()]);
      await client.query(`DELETE FROM species_attribute_values v USING species s, species_attribute_definitions d WHERE v.species_id=s.id AND v.definition_id=d.id AND v.source_managed AND NOT ((s.scientific_name_key || ':' || d.slug) = ANY($1::text[]))`, [[...desired.species_attribute_values.keys()]]);
      await removeMissing("media_assets","source_key",[...desired.media_assets.keys()]);
      await removeMissing("species_attribute_definitions","slug",[...desired.species_attribute_definitions.keys()]);
      for (const [table,column,values] of [["species","scientific_name_key",[...desired.species.keys()]],["plants","scientific_name_key",[...desired.plants.keys()]],["habitat_elements","legacy_slug",[...desired.habitat_elements.keys()]]] as const) await client.query(`UPDATE ${table} SET publication_status='archived',updated_at=now() WHERE source_managed AND NOT (${column} = ANY($1::text[]))`, [values]);
    }

    const appliedReport = { ...report, applied: true, generatedAt: new Date().toISOString() };
    const run = await client.query<{ id: string }>("INSERT INTO import_runs(manifest_checksum,mode,status,source_root,report) VALUES ($1,$2,'applied',$3,$4::jsonb) RETURNING id", [snapshot.manifestChecksum,report.mode,"data/**/import/out",JSON.stringify(appliedReport)]);
    for (const file of snapshot.files) await client.query("INSERT INTO import_files(import_run_id,path,checksum,row_count) VALUES ($1,$2,$3,$4)", [run.rows[0].id,file.path,file.checksum,file.rowCount]);

    const mappings: Array<{ dataset: string; refs: SourceRef[]; entityType: string; entityId: string; naturalKey: string; fingerprint: string }> = [];
    for (const item of snapshot.species) mappings.push({ dataset:"species",refs:[item.source],entityType:"species",entityId:speciesIds.get(item.naturalKey)!,naturalKey:item.naturalKey,fingerprint:fieldsFingerprint(item) });
    for (const item of snapshot.plants) mappings.push({ dataset:"plants",refs:item.sources,entityType:"plant",entityId:plantIds.get(item.naturalKey)!,naturalKey:item.naturalKey,fingerprint:fieldsFingerprint(item) });
    for (const item of snapshot.habitats) mappings.push({ dataset:"habitat_elements",refs:[item.source],entityType:"habitat_element",entityId:habitatIds.get(item.legacySlug)!,naturalKey:item.legacySlug,fingerprint:fieldsFingerprint(item) });
    for (const item of snapshot.definitions) mappings.push({ dataset:"species_attribute_definitions",refs:[item.source],entityType:"species_attribute_definition",entityId:definitionIds.get(item.slug)!,naturalKey:item.slug,fingerprint:fieldsFingerprint(item) });
    const attributeIds = new Map((await client.query<{ id:string; natural_key:string }>(`SELECT v.id,s.scientific_name_key || ':' || d.slug AS natural_key FROM species_attribute_values v JOIN species s ON s.id=v.species_id JOIN species_attribute_definitions d ON d.id=v.definition_id`)).rows.map((row) => [row.natural_key,row.id]));
    for (const item of snapshot.attributes) {
      const naturalKey = `${item.speciesKey}:${item.definitionSlug}`;
      mappings.push({ dataset:"species_attribute_values",refs:[item.source],entityType:"species_attribute_value",entityId:attributeIds.get(naturalKey)!,naturalKey,fingerprint:fieldsFingerprint(item) });
    }
    for (const item of snapshot.speciesImages) mappings.push({ dataset:"species_images",refs:[item.source],entityType:"media_asset",entityId:mediaIds.get(item.sourceKey)!,naturalKey:item.sourceKey,fingerprint:fieldsFingerprint(item) });
    for (const item of snapshot.habitatImages) mappings.push({ dataset:"habitat_element_images",refs:[item.source],entityType:"media_asset",entityId:mediaIds.get(item.sourceKey)!,naturalKey:item.sourceKey,fingerprint:fieldsFingerprint(item) });
    const plantRelationIds = new Map((await client.query<{id:string;semantic_key:string}>("SELECT id,semantic_key FROM species_plant_relations")).rows.map((row) => [row.semantic_key,row.id]));
    for (const item of snapshot.plantRelations) mappings.push({ dataset:"species_plant_relations",refs:[item.source],entityType:"species_plant_relation",entityId:plantRelationIds.get(item.semanticKey)!,naturalKey:item.semanticKey,fingerprint:fieldsFingerprint(item) });
    const habitatRelationIds = new Map((await client.query<{id:string;semantic_key:string}>("SELECT id,semantic_key FROM species_habitat_relations")).rows.map((row) => [row.semantic_key,row.id]));
    for (const item of snapshot.habitatRelations) mappings.push({ dataset:"species_habitat_relations",refs:item.sources,entityType:"species_habitat_relation",entityId:habitatRelationIds.get(item.semanticKey)!,naturalKey:item.semanticKey,fingerprint:fieldsFingerprint(item) });
    if (report.mode === "sync") await client.query("UPDATE import_record_mappings SET active=false WHERE dataset=ANY($1::text[])", [[...new Set(mappings.map((item) => item.dataset))]]);
    for (const mapping of mappings) for (const source of mapping.refs) await client.query(`INSERT INTO import_record_mappings(dataset,source_file,source_row,entity_type,entity_id,legacy_id,natural_key,fingerprint,last_seen_run_id,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) ON CONFLICT(dataset,source_file,source_row) DO UPDATE SET entity_type=EXCLUDED.entity_type,entity_id=EXCLUDED.entity_id,legacy_id=EXCLUDED.legacy_id,natural_key=EXCLUDED.natural_key,fingerprint=EXCLUDED.fingerprint,last_seen_run_id=EXCLUDED.last_seen_run_id,active=true`, [mapping.dataset,source.file,source.row,mapping.entityType,mapping.entityId,source.legacyId,mapping.naturalKey,mapping.fingerprint,run.rows[0].id]);
    await client.query("COMMIT");
    return appliedReport;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function persistReport(report: ImportReport, repoRoot: string): Promise<{ json: string; html: string }> {
  return writeReport(report, path.join(repoRoot,"packages/database/reports"));
}
