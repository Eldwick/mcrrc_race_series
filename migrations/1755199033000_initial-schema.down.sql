-- Drop everything in reverse order to avoid foreign key constraint issues

-- Drop triggers first
DROP TRIGGER IF EXISTS update_series_standings_updated_at ON series_standings;
DROP TRIGGER IF EXISTS update_race_results_updated_at ON race_results;
DROP TRIGGER IF EXISTS update_races_updated_at ON races;
DROP TRIGGER IF EXISTS update_series_registrations_updated_at ON series_registrations;
DROP TRIGGER IF EXISTS update_runners_updated_at ON runners;
DROP TRIGGER IF EXISTS update_series_updated_at ON series;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_qualifying_races_standing;
DROP INDEX IF EXISTS idx_series_standings_registration_points;
DROP INDEX IF EXISTS idx_race_results_place;
DROP INDEX IF EXISTS idx_race_results_race_registration;
DROP INDEX IF EXISTS idx_races_series_date;
DROP INDEX IF EXISTS idx_series_registrations_age_group;
DROP INDEX IF EXISTS idx_series_registrations_runner;
DROP INDEX IF EXISTS idx_series_registrations_series_bib;
DROP INDEX IF EXISTS idx_runners_gender;

-- Drop tables in reverse order (children first, then parents)
DROP TABLE IF EXISTS qualifying_races;
DROP TABLE IF EXISTS series_standings;
DROP TABLE IF EXISTS race_results;
DROP TABLE IF EXISTS races;
DROP TABLE IF EXISTS series_registrations;
DROP TABLE IF EXISTS runners;
DROP TABLE IF EXISTS series;

-- Drop custom types
DROP TYPE IF EXISTS age_group_type;
DROP TYPE IF EXISTS gender_type;

-- Don't drop the UUID extension as other applications might be using it
-- DROP EXTENSION IF EXISTS "uuid-ossp";
