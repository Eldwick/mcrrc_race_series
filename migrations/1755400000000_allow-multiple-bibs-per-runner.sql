-- Migration: Allow runners to have multiple bib numbers per series
-- This handles the case where a runner changes bib numbers during a season

-- Remove the constraint that prevents runners from having multiple bib numbers per series
ALTER TABLE series_registrations DROP CONSTRAINT IF EXISTS series_registrations_series_id_runner_id_key;

-- Add a comment to document the change
COMMENT ON TABLE series_registrations IS 'Links runners to bib numbers per series/year. A runner may have multiple registrations if they change bib numbers during the season.';

-- Update the constraint comment to reflect the change
COMMENT ON CONSTRAINT series_registrations_series_id_bib_number_key ON series_registrations IS 'Each bib can only be used once per series, but runners can have multiple bibs';

-- Add index to help with queries that aggregate results for the same runner across multiple registrations
CREATE INDEX IF NOT EXISTS idx_series_registrations_runner_series ON series_registrations(runner_id, series_id);
