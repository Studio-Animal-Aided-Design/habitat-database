export type ContentStatus = "draft" | "published" | "archived";

export type ImageAsset = {
  url: string;
  alt: string;
  attribution: string;
  type: "portrait" | "lifecycle";
};

export type SpeciesSummary = {
  slug: string;
  commonName: string;
  scientificName: string;
  className: string;
  familyName: string;
  teaser: string;
  image: ImageAsset;
  status: ContentStatus;
};

export type RelatedPlant = {
  slug: string;
  scientificName: string;
  commonName: string;
  purpose: string;
};

export type RelatedHabitat = {
  slug: string;
  name: string;
  purpose: string;
  purposeElement: string;
  lifecycleStage: string;
};

export type SpeciesAttribute = {
  category: string;
  label: string;
  value: string;
  sources?: string;
};

export type SpeciesDetail = SpeciesSummary & {
  alternativeName?: string;
  taxonomy: {
    classCommon: string;
    classScientific: string;
    orderCommon: string;
    orderScientific: string;
    familyCommon: string;
    familyScientific: string;
    genusScientific: string;
  };
  attributes: SpeciesAttribute[];
  lifecycleImage: ImageAsset;
  plants: RelatedPlant[];
  habitats: RelatedHabitat[];
};

export type CatalogOverview = {
  speciesCount: number;
  plantCount: number;
  habitatCount: number;
  featuredSpecies: SpeciesSummary[];
  featuredPlants: PlantSummary[];
  featuredHabitats: HabitatSummary[];
};

export type CatalogTypes = {
  speciesTypes: string[];
  plantTypes: string[];
  habitatTypes: string[];
};

export type PlantSummary = {
  slug: string;
  scientificName: string;
  commonName: string;
  type: string;
  floweringPeriod?: string;
  native?: boolean;
  nativeStatus?: string;
  ecologicalValue: string;
  teaser: string;
  status: ContentStatus;
};

export type PlantDetail = PlantSummary & {
  alternativeName?: string;
  siteConditions: string[];
  planningNotes: string;
  sources: string[];
  relatedSpecies: Array<{
    slug: string;
    commonName: string;
    scientificName: string;
    purpose: string;
  }>;
};

export type HabitatSummary = {
  slug: string;
  name: string;
  type: string;
  size?: string;
  location?: string;
  teaser: string;
  image?: ImageAsset;
  status: ContentStatus;
};

export type HabitatDetail = HabitatSummary & {
  measureDescription: string;
  maintenance: string;
  combinedWith: Array<{ slug: string; name: string }>;
  relatedSpecies: Array<{
    slug: string;
    commonName: string;
    scientificName: string;
    purpose: string;
    lifecycleStage: string;
  }>;
};

export type CatalogQuery = {
  q?: string;
  type?: string;
};

export interface CatalogApi {
  getOverview(): Promise<CatalogOverview>;
  getCatalogTypes(): Promise<CatalogTypes>;
  listSpecies(query?: CatalogQuery): Promise<SpeciesSummary[]>;
  getSpeciesBySlug(slug: string): Promise<SpeciesDetail | null>;
  listPlants(query?: CatalogQuery): Promise<PlantSummary[]>;
  getPlantBySlug(slug: string): Promise<PlantDetail | null>;
  listHabitats(query?: CatalogQuery): Promise<HabitatSummary[]>;
  getHabitatBySlug(slug: string): Promise<HabitatDetail | null>;
}
