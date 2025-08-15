-- Migration to fix MCRRC Championship Series standings
-- Separate overall and age group standings instead of combining them

-- Add separate points columns for overall and age group standings
ALTER TABLE series_standings 
ADD COLUMN IF NOT EXISTS overall_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS age_group_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_gender_rank INTEGER, 
ADD COLUMN IF NOT EXISTS age_group_gender_rank INTEGER,
ADD COLUMN IF NOT EXISTS total_time INTERVAL,
ADD COLUMN IF NOT EXISTS total_distance DECIMAL;

-- Add tiebreaker columns for MCRRC Championship Series
COMMENT ON COLUMN series_standings.overall_points IS 'Points earned from overall M/F placement (max 10 per race)';
COMMENT ON COLUMN series_standings.age_group_points IS 'Points earned from age group M/F placement (max 10 per race)';
COMMENT ON COLUMN series_standings.overall_gender_rank IS 'Rank within gender in Overall category (based on overall_points)';
COMMENT ON COLUMN series_standings.age_group_gender_rank IS 'Rank within age group + gender in Age Group category (based on age_group_points)';
COMMENT ON COLUMN series_standings.total_time IS 'T4 Tiebreaker: Sum of times from all completed races';
COMMENT ON COLUMN series_standings.total_distance IS 'T3 Tiebreaker: Sum of distances from all completed races';
