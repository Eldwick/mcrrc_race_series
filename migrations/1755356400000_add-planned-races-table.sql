-- Migration: Add planned races table and race linking
-- This enables proper championship series race planning and linking

-- Planned Races: Official championship series race definitions
-- This allows us to define all races in advance and link scraped races to them
CREATE TABLE planned_races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  planned_date DATE,
  year INTEGER NOT NULL,
  estimated_distance DECIMAL(5,2),
  location VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'scraped', 'cancelled')),
  series_order INTEGER, -- Order in the official championship series (1-12)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add linking column to connect scraped races to planned races
ALTER TABLE races 
ADD COLUMN planned_race_id UUID REFERENCES planned_races(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_planned_races_series_year ON planned_races(series_id, year);
CREATE INDEX idx_planned_races_status ON planned_races(status);
CREATE INDEX idx_races_planned_race_id ON races(planned_race_id);

-- Add comments to clarify the race linking system
COMMENT ON COLUMN races.planned_race_id IS 'Links this scraped race to its official championship series race definition';
COMMENT ON COLUMN planned_races.status IS 'Lifecycle status: planned (not yet scraped), scraped (results available), cancelled (race not happening)';
COMMENT ON COLUMN planned_races.series_order IS 'Order of this race in the official championship series (1-12 for MCRRC)';

-- Create trigger for planned_races updated_at
CREATE TRIGGER update_planned_races_updated_at BEFORE UPDATE ON planned_races
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
