import "server-only";

import { Pool, type QueryResultRow } from "pg";
import type {
  CatalogApi,
  CatalogOverview,
  CatalogQuery,
  ContentStatus,
  HabitatDetail,
  HabitatSummary,
  ImageAsset,
  PlantDetail,
  PlantSummary,
  SpeciesDetail,
  SpeciesSummary
} from "./types";

type Database = Pick<Pool, "query">;

type SpeciesRow = QueryResultRow & {
  id: string;
  scientific_name: string;
  alternative_scientific_name: string | null;
  common_name: string;
  alternative_common_name: string | null;
  class_common: string | null;
  class_scientific: string | null;
  order_common: string | null;
  order_scientific: string | null;
  family_common: string | null;
  family_scientific: string | null;
  genus_scientific: string | null;
  publication_status: ContentStatus;
};

type PlantRow = QueryResultRow & {
  id: string;
  scientific_name: string;
  common_name: string | null;
  plant_type: string | null;
  flowering_time: string | null;
  native_status: string | null;
  local_fauna_importance: string | null;
  publication_status: ContentStatus;
};

type HabitatRow = QueryResultRow & {
  id: string;
  legacy_slug: string;
  name: string;
  element_type: string | null;
  size: string | null;
  location: string | null;
  measure_description: string | null;
  maintenance: string | null;
  combined_with_text: string | null;
  publication_status: ContentStatus;
};

const emptyImage = (name: string, type: ImageAsset["type"]): ImageAsset => ({
  url: "/landing/hero-circle.webp",
  alt: name,
  attribution: "Studio Animal-Aided Design",
  type
});

export function catalogSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function includesQuery(values: Array<string | null | undefined>, q?: string): boolean {
  if (!q?.trim()) return true;
  const normalized = q.trim().toLocaleLowerCase("de");
  return values.some((value) => value?.toLocaleLowerCase("de").includes(normalized));
}

function imageFromRow(row: QueryResultRow | undefined, name: string, type: ImageAsset["type"]): ImageAsset {
  if (!row?.external_url) return emptyImage(name, type);
  return {
    url: row.external_url,
    alt: row.alt_text || `${name} – ${type === "portrait" ? "Portrait" : "Lebenszyklus"}`,
    attribution: row.attribution || "Quelle nicht angegeben",
    type
  };
}

export class PostgresCatalogApi implements CatalogApi {
  constructor(private readonly database: Database) {}

  private async speciesRows(): Promise<SpeciesRow[]> {
    return (await this.database.query<SpeciesRow>("SELECT * FROM species ORDER BY common_name, scientific_name")).rows;
  }

  private async plantRows(): Promise<PlantRow[]> {
    return (await this.database.query<PlantRow>("SELECT * FROM plants ORDER BY scientific_name")).rows;
  }

  private async habitatRows(): Promise<HabitatRow[]> {
    return (await this.database.query<HabitatRow>("SELECT * FROM habitat_elements ORDER BY name")).rows;
  }

  private async speciesSummary(row: SpeciesRow): Promise<SpeciesSummary> {
    const [media, teaser] = await Promise.all([
      this.database.query("SELECT m.* FROM media_assets m JOIN species_media sm ON sm.media_id=m.id WHERE sm.species_id=$1 AND m.image_type='portrait' ORDER BY sm.sort_order, m.created_at LIMIT 1", [row.id]),
      this.database.query("SELECT v.value FROM species_attribute_values v JOIN species_attribute_definitions d ON d.id=v.definition_id WHERE v.species_id=$1 AND nullif(trim(v.value),'') IS NOT NULL ORDER BY CASE WHEN d.slug LIKE '%kurzbeschreibung%' THEN 0 ELSE 1 END,d.primary_sort,d.secondary_sort LIMIT 1", [row.id])
    ]);
    return {
      slug: catalogSlug(row.common_name || row.scientific_name),
      commonName: row.common_name,
      scientificName: row.scientific_name,
      className: row.class_common || row.class_scientific || "Tierart",
      familyName: row.family_common || row.family_scientific || "",
      teaser: teaser.rows[0]?.value || `Planungswissen und Lebensraumanforderungen für ${row.common_name}.`,
      image: imageFromRow(media.rows[0], row.common_name, "portrait"),
      status: row.publication_status
    };
  }

  async getOverview(): Promise<CatalogOverview> {
    const [species, plants, habitats] = await Promise.all([this.listSpecies(), this.listPlants(), this.listHabitats()]);
    return {
      speciesCount: species.filter((item) => item.status === "published").length,
      plantCount: plants.filter((item) => item.status === "published").length,
      habitatCount: habitats.filter((item) => item.status === "published").length,
      featuredSpecies: species.filter((item) => item.status === "published").slice(0, 3)
    };
  }

  async listSpecies(query: CatalogQuery = {}): Promise<SpeciesSummary[]> {
    const summaries = await Promise.all((await this.speciesRows()).map((row) => this.speciesSummary(row)));
    return summaries.filter((item) =>
      (!query.type || item.className === query.type) &&
      includesQuery([item.commonName, item.scientificName, item.className, item.familyName], query.q)
    );
  }

  async getSpeciesBySlug(slug: string): Promise<SpeciesDetail | null> {
    const row = (await this.speciesRows()).find((item) => catalogSlug(item.common_name || item.scientific_name) === slug);
    if (!row) return null;
    const [summary, lifecycle, attributes, plants, habitats] = await Promise.all([
      this.speciesSummary(row),
      this.database.query("SELECT m.* FROM media_assets m JOIN species_media sm ON sm.media_id=m.id WHERE sm.species_id=$1 AND m.image_type='lifecycle' ORDER BY sm.sort_order, m.created_at LIMIT 1", [row.id]),
      this.database.query("SELECT d.level1_display_name AS category,d.display_name AS label,v.value,v.sources FROM species_attribute_values v JOIN species_attribute_definitions d ON d.id=v.definition_id WHERE v.species_id=$1 AND nullif(trim(v.value),'') IS NOT NULL ORDER BY d.primary_sort,d.secondary_sort", [row.id]),
      this.database.query("SELECT p.scientific_name,p.common_name,r.purpose FROM species_plant_relations r JOIN plants p ON p.id=r.plant_id WHERE r.species_id=$1 AND p.publication_status='published' ORDER BY p.scientific_name", [row.id]),
      this.database.query("SELECT h.legacy_slug,h.name,r.purpose,r.purpose_element,r.lifecycle_stage FROM species_habitat_relations r JOIN habitat_elements h ON h.id=r.habitat_element_id WHERE r.species_id=$1 AND h.publication_status='published' ORDER BY h.name", [row.id])
    ]);
    return {
      ...summary,
      alternativeName: row.alternative_common_name || undefined,
      taxonomy: {
        classCommon: row.class_common || "",
        classScientific: row.class_scientific || "",
        orderCommon: row.order_common || "",
        orderScientific: row.order_scientific || "",
        familyCommon: row.family_common || "",
        familyScientific: row.family_scientific || "",
        genusScientific: row.genus_scientific || ""
      },
      attributes: attributes.rows.map((item) => ({ category: item.category, label: item.label, value: item.value, sources: item.sources || undefined })),
      lifecycleImage: imageFromRow(lifecycle.rows[0], row.common_name, "lifecycle"),
      plants: plants.rows.map((item) => ({ slug: catalogSlug(item.scientific_name), scientificName: item.scientific_name, commonName: item.common_name || item.scientific_name, purpose: item.purpose || "" })),
      habitats: habitats.rows.map((item) => ({ slug: catalogSlug(item.legacy_slug), name: item.name, purpose: item.purpose || "", purposeElement: item.purpose_element || "", lifecycleStage: item.lifecycle_stage || "" }))
    };
  }

  private plantSummary(row: PlantRow): PlantSummary {
    const ecologicalValue = row.local_fauna_importance || "Ökologische Bedeutung wird fachlich ergänzt.";
    return {
      slug: catalogSlug(row.scientific_name),
      scientificName: row.scientific_name,
      commonName: row.common_name || row.scientific_name,
      type: row.plant_type || "Pflanze",
      floweringPeriod: row.flowering_time || undefined,
      native: row.native_status?.toLocaleLowerCase("de") === "ja",
      nativeStatus: row.native_status || undefined,
      ecologicalValue,
      teaser: ecologicalValue,
      status: row.publication_status
    };
  }

  async listPlants(query: CatalogQuery = {}): Promise<PlantSummary[]> {
    return (await this.plantRows()).map((row) => this.plantSummary(row)).filter((item) =>
      (!query.type || item.type === query.type) &&
      includesQuery([item.commonName, item.scientificName, item.type, item.ecologicalValue, item.nativeStatus], query.q)
    );
  }

  async getPlantBySlug(slug: string): Promise<PlantDetail | null> {
    const row = (await this.plantRows()).find((item) => catalogSlug(item.scientific_name) === slug);
    if (!row) return null;
    const related = await this.database.query("SELECT s.common_name,s.scientific_name,r.purpose FROM species_plant_relations r JOIN species s ON s.id=r.species_id WHERE r.plant_id=$1 AND s.publication_status='published' ORDER BY s.common_name", [row.id]);
    return {
      ...this.plantSummary(row),
      siteConditions: [],
      planningNotes: row.local_fauna_importance || "Planungshinweise werden fachlich ergänzt.",
      sources: [],
      relatedSpecies: related.rows.map((item) => ({ slug: catalogSlug(item.common_name || item.scientific_name), commonName: item.common_name, scientificName: item.scientific_name, purpose: item.purpose || "" }))
    };
  }

  private async habitatSummary(row: HabitatRow): Promise<HabitatSummary> {
    const media = await this.database.query("SELECT m.* FROM media_assets m JOIN habitat_element_media hm ON hm.media_id=m.id WHERE hm.habitat_element_id=$1 ORDER BY hm.sort_order,m.created_at LIMIT 1", [row.id]);
    return {
      slug: catalogSlug(row.legacy_slug),
      name: row.name,
      type: row.element_type || "Habitatelement",
      size: row.size || undefined,
      location: row.location || undefined,
      teaser: row.measure_description || row.maintenance || `Planungswissen für ${row.name}.`,
      image: media.rows[0]?.external_url ? imageFromRow(media.rows[0], row.name, "portrait") : undefined,
      status: row.publication_status
    };
  }

  async listHabitats(query: CatalogQuery = {}): Promise<HabitatSummary[]> {
    const summaries = await Promise.all((await this.habitatRows()).map((row) => this.habitatSummary(row)));
    return summaries.filter((item) =>
      (!query.type || item.type === query.type) &&
      includesQuery([item.name, item.type, item.location, item.teaser], query.q)
    );
  }

  async getHabitatBySlug(slug: string): Promise<HabitatDetail | null> {
    const rows = await this.habitatRows();
    const row = rows.find((item) => catalogSlug(item.legacy_slug) === slug);
    if (!row) return null;
    const [summary, related] = await Promise.all([
      this.habitatSummary(row),
      this.database.query("SELECT s.common_name,s.scientific_name,r.purpose,r.lifecycle_stage FROM species_habitat_relations r JOIN species s ON s.id=r.species_id WHERE r.habitat_element_id=$1 AND s.publication_status='published' ORDER BY s.common_name", [row.id])
    ]);
    const combinedNames = (row.combined_with_text || "").split(/[;,]/).map((value) => value.trim()).filter(Boolean);
    const combinedWith = combinedNames.map((name) => {
      const match = rows.find((candidate) => catalogSlug(candidate.name) === catalogSlug(name));
      return { slug: match ? catalogSlug(match.legacy_slug) : catalogSlug(name), name };
    });
    return {
      ...summary,
      measureDescription: row.measure_description || "",
      maintenance: row.maintenance || "",
      combinedWith,
      relatedSpecies: related.rows.map((item) => ({ slug: catalogSlug(item.common_name || item.scientific_name), commonName: item.common_name, scientificName: item.scientific_name, purpose: item.purpose || "", lifecycleStage: item.lifecycle_stage || "" }))
    };
  }
}

export function createPostgresCatalogApi(connectionString = process.env.DATABASE_URL): PostgresCatalogApi {
  if (!connectionString) throw new Error("DATABASE_URL is required for the PostgreSQL catalog adapter.");
  return new PostgresCatalogApi(new Pool({ connectionString, max: 5 }));
}
