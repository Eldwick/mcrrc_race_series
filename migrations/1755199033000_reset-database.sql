-- Reset database to clean state
-- This will drop everything to ensure a clean migration

-- Drop all existing tables, types, functions, etc. if they exist
-- Use CASCADE and IF EXISTS to avoid errors

-- Drop triggers first (if they exist)
DROP TRIGGER IF EXISTS update_series_standings_updated_at ON series_standings;
DROP TRIGGER IF EXISTS update_race_results_updated_at ON race_results;
DROP TRIGGER IF EXISTS update_races_updated_at ON races;
DROP TRIGGER IF EXISTS update_series_registrations_updated_at ON series_registrations;
DROP TRIGGER IF EXISTS update_runners_updated_at ON runners;
DROP TRIGGER IF EXISTS update_series_updated_at ON series;

-- Drop function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all indexes (if they exist)
DROP INDEX IF EXISTS idx_qualifying_races_standing;
DROP INDEX IF EXISTS idx_series_standings_registration_points;
DROP INDEX IF EXISTS idx_race_results_place;
DROP INDEX IF EXISTS idx_race_results_race_registration;
DROP INDEX IF EXISTS idx_races_series_date;
DROP INDEX IF EXISTS idx_series_registrations_age_group;
DROP INDEX IF EXISTS idx_series_registrations_runner;
DROP INDEX IF EXISTS idx_series_registrations_series_bib;
DROP INDEX IF EXISTS idx_runners_gender;

-- Drop all tables with CASCADE (if they exist)
DROP TABLE IF EXISTS qualifying_races CASCADE;
DROP TABLE IF EXISTS series_standings CASCADE;
DROP TABLE IF EXISTS race_results CASCADE;
DROP TABLE IF EXISTS races CASCADE;
DROP TABLE IF EXISTS series_registrations CASCADE;
DROP TABLE IF EXISTS runners CASCADE;
DROP TABLE IF EXISTS series CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS age_group_type;
DROP TYPE IF EXISTS gender_type;

-- Reset is complete - next migration can create everything fresh
