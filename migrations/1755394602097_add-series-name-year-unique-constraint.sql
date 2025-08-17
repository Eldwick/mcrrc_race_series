
-- Add unique constraint to prevent future duplicates
ALTER TABLE series 
ADD CONSTRAINT series_name_year_unique 
UNIQUE (name, year);
