CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name text NOT NULL,
  scientific_name_key text NOT NULL UNIQUE,
  alternative_scientific_name text,
  common_name text NOT NULL,
  alternative_common_name text,
  class_common text,
  class_scientific text,
  order_common text,
  order_scientific text,
  family_common text,
  family_scientific text,
  genus_common text,
  genus_scientific text,
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'archived')),
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name text NOT NULL,
  scientific_name_key text NOT NULL UNIQUE,
  common_name text,
  plant_type text,
  flowering_time text,
  native_status text,
  local_fauna_importance text,
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'archived')),
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE habitat_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_slug text NOT NULL UNIQUE,
  name text NOT NULL,
  element_type text,
  size text,
  location text,
  measure_description text,
  maintenance text,
  combined_with_text text,
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft', 'published', 'archived')),
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE species_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  primary_sort integer NOT NULL,
  secondary_sort integer NOT NULL,
  level1_category text NOT NULL,
  level2_category text,
  level1_display_name text NOT NULL,
  level2_display_name text,
  field_name text NOT NULL,
  display_name text NOT NULL,
  description text,
  explanation text,
  has_sources boolean NOT NULL DEFAULT false,
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE species_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id uuid NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  definition_id uuid NOT NULL REFERENCES species_attribute_definitions(id) ON DELETE RESTRICT,
  value text,
  sources text,
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_id, definition_id)
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_url text,
  storage_key text,
  alt_text text,
  attribution text,
  rights text,
  image_type text NOT NULL,
  source_key text NOT NULL UNIQUE,
  source_fingerprint text NOT NULL,
  source_managed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE species_media (
  species_id uuid NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (species_id, media_id)
);

CREATE TABLE habitat_element_media (
  habitat_element_id uuid NOT NULL REFERENCES habitat_elements(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (habitat_element_id, media_id)
);

CREATE TABLE plant_media (
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (plant_id, media_id)
);

CREATE TABLE species_plant_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id uuid NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
  purpose text,
  annotations text,
  sources text,
  semantic_key text NOT NULL UNIQUE,
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE species_habitat_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id uuid NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  habitat_element_id uuid NOT NULL REFERENCES habitat_elements(id) ON DELETE RESTRICT,
  lifecycle_stage text,
  purpose text,
  purpose_element text,
  annotations text,
  semantic_key text NOT NULL UNIQUE,
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE entity_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('species', 'plant', 'habitat_element')),
  entity_id uuid NOT NULL,
  alias text NOT NULL,
  alias_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, alias_key)
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  username_key text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_checksum text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('merge', 'sync')),
  status text NOT NULL CHECK (status IN ('applied', 'failed')),
  source_root text NOT NULL,
  report jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX import_runs_manifest_checksum_idx ON import_runs(manifest_checksum);

CREATE TABLE import_files (
  import_run_id uuid NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  path text NOT NULL,
  checksum text NOT NULL,
  row_count integer NOT NULL,
  PRIMARY KEY (import_run_id, path)
);

CREATE TABLE import_record_mappings (
  dataset text NOT NULL,
  source_file text NOT NULL,
  source_row integer NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  legacy_id text,
  natural_key text NOT NULL,
  fingerprint text NOT NULL,
  last_seen_run_id uuid NOT NULL REFERENCES import_runs(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (dataset, source_file, source_row)
);

CREATE INDEX import_record_mappings_entity_idx ON import_record_mappings(entity_type, entity_id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX species_common_name_search_idx ON species USING gin (common_name gin_trgm_ops);
CREATE INDEX species_scientific_name_search_idx ON species USING gin (scientific_name gin_trgm_ops);
CREATE INDEX plants_common_name_search_idx ON plants USING gin (common_name gin_trgm_ops);
CREATE INDEX plants_scientific_name_search_idx ON plants USING gin (scientific_name gin_trgm_ops);
CREATE INDEX habitat_elements_name_search_idx ON habitat_elements USING gin (name gin_trgm_ops);
CREATE INDEX species_attribute_values_species_idx ON species_attribute_values(species_id);
CREATE INDEX species_plant_relations_species_idx ON species_plant_relations(species_id);
CREATE INDEX species_plant_relations_plant_idx ON species_plant_relations(plant_id);
CREATE INDEX species_habitat_relations_species_idx ON species_habitat_relations(species_id);
CREATE INDEX species_habitat_relations_habitat_idx ON species_habitat_relations(habitat_element_id);

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['species','plants','habitat_elements','species_attribute_definitions','species_attribute_values','media_assets','species_plant_relations','species_habitat_relations','accounts']
  LOOP
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', table_name, table_name);
  END LOOP;
END;
$$;
