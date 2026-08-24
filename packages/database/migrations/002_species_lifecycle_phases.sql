CREATE TABLE species_lifecycle_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id uuid NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  phase_key text NOT NULL,
  label_de text NOT NULL,
  ring_order integer NOT NULL CHECK (ring_order > 0),
  segment_order integer NOT NULL CHECK (segment_order > 0),
  color_hex text NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  start_tick integer NOT NULL CHECK (start_tick BETWEEN 0 AND 179),
  end_tick integer NOT NULL CHECK (end_tick BETWEEN 0 AND 180),
  wraps_year boolean NOT NULL DEFAULT false,
  tick_count integer NOT NULL DEFAULT 180 CHECK (tick_count = 180),
  source_image_url text NOT NULL,
  source_sha256 text NOT NULL,
  extraction_status text NOT NULL CHECK (extraction_status IN ('auto_extracted','reviewed')),
  source_managed boolean NOT NULL DEFAULT false,
  source_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_id, phase_key, segment_order)
);

CREATE INDEX species_lifecycle_phases_species_idx ON species_lifecycle_phases(species_id, ring_order, segment_order);
CREATE TRIGGER species_lifecycle_phases_set_updated_at BEFORE UPDATE ON species_lifecycle_phases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
