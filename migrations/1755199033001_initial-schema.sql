-- MCRRC Race Series Database Schema
-- PostgreSQL database for managing race results and standings

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better data integrity
CREATE TYPE gender_type AS ENUM ('M', 'F');
CREATE TYPE age_group_type AS ENUM (
  '0-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', 
  '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-99'
);

-- Series table: Contains information about different race series and years
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Runners table: Contains information about registered runners (person-level info)
CREATE TABLE runners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  gender gender_type NOT NULL,
  birth_year INTEGER NOT NULL, -- Using birth year instead of current age
  club VARCHAR(100) DEFAULT 'MCRRC',
  email VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Series Registrations: Links runners to bib numbers per series/year
CREATE TABLE series_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  runner_id UUID NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  bib_number VARCHAR(10) NOT NULL,
  age INTEGER NOT NULL, -- Age for this specific series/year
  age_group age_group_type NOT NULL, -- Age group for this specific series/year
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Each runner can only have one bib per series
  UNIQUE(series_id, runner_id),
  -- Each bib can only be used once per series
  UNIQUE(series_id, bib_number)
);

-- Races table: Contains information about individual races
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  year INTEGER NOT NULL,
  distance_miles DECIMAL(5,2) NOT NULL,
  location VARCHAR(255),
  course_type VARCHAR(50), -- 'road', 'trail', 'track', etc.
  mcrrc_url VARCHAR(500),
  results_scraped_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Race Results table: Contains individual race results for each runner
CREATE TABLE race_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  series_registration_id UUID NOT NULL REFERENCES series_registrations(id) ON DELETE CASCADE,
  place INTEGER NOT NULL, -- overall place
  place_gender INTEGER NOT NULL, -- gender place
  place_age_group INTEGER NOT NULL, -- age group place
  gun_time INTERVAL NOT NULL, -- time as interval (e.g., '00:25:30')
  chip_time INTERVAL, -- optional chip time
  pace_per_mile INTERVAL, -- calculated pace per mile
  is_dnf BOOLEAN DEFAULT false, -- did not finish
  is_dq BOOLEAN DEFAULT false, -- disqualified
  override_reason TEXT, -- reason for any manual overrides
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure each series registration can only have one result per race
  UNIQUE(race_id, series_registration_id)
);

-- Series Standings table: Contains calculated championship series standings
CREATE TABLE series_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_registration_id UUID NOT NULL REFERENCES series_registrations(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  races_participated INTEGER NOT NULL DEFAULT 0,
  overall_rank INTEGER,
  gender_rank INTEGER,
  age_group_rank INTEGER,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure each series registration can only have one standing
  UNIQUE(series_registration_id)
);

-- Qualifying Races table: Tracks which races count toward series standings for each runner
CREATE TABLE qualifying_races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  standing_id UUID NOT NULL REFERENCES series_standings(id) ON DELETE CASCADE,
  race_result_id UUID NOT NULL REFERENCES race_results(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL,
  is_counting BOOLEAN DEFAULT true, -- whether this race counts toward final standing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_series_registrations_series_bib ON series_registrations(series_id, bib_number);
CREATE INDEX idx_series_registrations_runner ON series_registrations(runner_id);
CREATE INDEX idx_series_registrations_age_group ON series_registrations(age_group);
CREATE INDEX idx_races_series_date ON races(series_id, date);
CREATE INDEX idx_race_results_race_registration ON race_results(race_id, series_registration_id);
CREATE INDEX idx_race_results_place ON race_results(place);
CREATE INDEX idx_series_standings_registration_points ON series_standings(series_registration_id, total_points DESC);
CREATE INDEX idx_qualifying_races_standing ON qualifying_races(standing_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runners_updated_at BEFORE UPDATE ON runners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_registrations_updated_at BEFORE UPDATE ON series_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_race_results_updated_at BEFORE UPDATE ON race_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_standings_updated_at BEFORE UPDATE ON series_standings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default series for 2025
INSERT INTO series (name, year, description, is_active) VALUES
  ('MCRRC Championship Series', 2025, 'Montgomery County Road Runners Club Championship Series for 2025', true);
