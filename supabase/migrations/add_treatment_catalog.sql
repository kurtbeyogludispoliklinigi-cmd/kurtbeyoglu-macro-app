-- Treatment Catalog Table for Price Management
-- Stores standard prices for treatments to enable autocomplete and discount calculations

CREATE TABLE IF NOT EXISTS treatment_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  standard_price DECIMAL(10,2) NOT NULL,
  category TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup during treatment entry
CREATE INDEX IF NOT EXISTS idx_treatment_name ON treatment_catalog(name);

-- Index for category filtering (future feature)
CREATE INDEX IF NOT EXISTS idx_treatment_category ON treatment_catalog(category);

-- Permissive RLS policy (consistent with existing app architecture)
ALTER TABLE treatment_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissive Access"
  ON treatment_catalog
  FOR ALL
  USING (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE treatment_catalog;

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_treatment_catalog_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_updated
CREATE TRIGGER treatment_catalog_update_timestamp
  BEFORE UPDATE ON treatment_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_treatment_catalog_timestamp();

COMMENT ON TABLE treatment_catalog IS 'Catalog of treatment types with standard pricing for autocomplete and discount calculation';
COMMENT ON COLUMN treatment_catalog.name IS 'Treatment name (e.g., Kanal Tedavisi)';
COMMENT ON COLUMN treatment_catalog.standard_price IS 'Standard price in TL for this treatment';
COMMENT ON COLUMN treatment_catalog.category IS 'Optional category for organizing treatments';
COMMENT ON COLUMN treatment_catalog.created_by IS 'Doctor who first created this catalog entry';
