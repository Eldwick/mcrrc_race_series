-- Make distance_miles nullable to handle cases where race distance cannot be parsed
ALTER TABLE races ALTER COLUMN distance_miles DROP NOT NULL;
