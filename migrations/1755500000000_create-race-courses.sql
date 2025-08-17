-- Migration: Create Race Courses concept
-- This creates the "Race Course" entity that links races across multiple years

-- Create race_courses table
CREATE TABLE race_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,                    -- e.g., "MCRRC Winter Series 5K"
  short_name VARCHAR(100),                       -- e.g., "Winter 5K" 
  location VARCHAR(255),                         -- e.g., "Wheaton Regional Park"
  typical_distance DECIMAL(5,2),                -- Expected distance in miles
  course_type VARCHAR(50) DEFAULT 'road',       -- 'road', 'trail', 'track', 'cross-country'
  description TEXT,                              -- Course description, terrain notes, etc.
  established_year INTEGER,                      -- First year this course was used
  is_active BOOLEAN DEFAULT true,               -- Whether course is still in use
  notes TEXT,                                   -- Additional notes about the course
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure course names are unique
  UNIQUE(name)
);

-- Add race_course_id to races table
ALTER TABLE races ADD COLUMN race_course_id UUID REFERENCES race_courses(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_races_course_id ON races(race_course_id);
CREATE INDEX idx_race_courses_name ON race_courses(name);
CREATE INDEX idx_race_courses_location ON race_courses(location);
CREATE INDEX idx_race_courses_active ON race_courses(is_active);

-- Add trigger to update race_courses updated_at
CREATE TRIGGER update_race_courses_updated_at BEFORE UPDATE ON race_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert actual MCRRC Championship Series race courses based on historical data
INSERT INTO race_courses (name, short_name, location, typical_distance, course_type, established_year, description) VALUES
  (
    'Kemp Mill (C)hills 10k', 
    'Kemp Mill Chill', 
    'Kemp Mill, MD', 
    6.2, 
    'road', 
    2018, 
    'Early season 10K race to shake off the winter chill, held annually in Kemp Mill'
  ),
  (
    'Piece of Cake 10k', 
    'Piece of Cake', 
    'Wheaton, MD', 
    6.2, 
    'road', 
    2000, 
    'Long-running MCRRC tradition - the name says it should be easy, but is it really? Annual 10K race in Wheaton'
  ),
  (
    'Capital for a Day 5k', 
    'Capital Day', 
    'Rockville, MD', 
    3.1, 
    'road', 
    2009, 
    'Celebrate Brookeville''s historic moment as the US Capital for a day with this scenic 5K race'
  ),
  (
    'Memorial Day 4 Miler', 
    'Memorial 4M', 
    'TBD', 
    4.0, 
    'road', 
    2011, 
    'Honor fallen heroes with this challenging 4-mile Memorial Day race (some years featured as Kevin Stoddard Memorial Superhero 5K)'
  ),
  (
    'Midsummer Night''s Mile', 
    'Midsummer Mile', 
    'Silver Spring, MD', 
    1.0, 
    'road', 
    2000, 
    'Fast and furious one-mile race celebrating the longest day of the year - a true test of speed'
  ),
  (
    'Riley''s Rumble Half Marathon', 
    'Riley''s Rumble', 
    'Boyds, MD', 
    13.1, 
    'road', 
    2000, 
    'MCRRC''s premier half marathon through the scenic countryside of Boyds - a challenging and beautiful course'
  ),
  (
    'Going Green Track Meet 2 miler', 
    'Going Green', 
    'Gaithersburg, MD', 
    2.0, 
    'track', 
    2009, 
    'Track meet featuring various distances including the championship series 2-mile run - celebrate Earth Day with fast times'
  ),
  (
    'Matthew Henson Trail 5k', 
    'Henson Trail', 
    'Silver Spring, MD', 
    3.1, 
    'trail', 
    2013, 
    'Trail 5K honoring the legendary Arctic explorer Matthew Henson, featuring challenging terrain in Silver Spring'
  ),
  (
    'Eastern County 8k', 
    'Eastern County', 
    'Eastern Montgomery County, MD', 
    5.0, 
    'road', 
    2013, 
    'Classic 8K race through the eastern reaches of Montgomery County - rolling hills and country roads'
  ),
  (
    'Country Road 5k', 
    'Country Road', 
    'Rural Montgomery County, MD', 
    3.1, 
    'road', 
    2000, 
    'Scenic race through rural Montgomery County - distance has evolved from 8K to 5 miles to 5K over the years'
  ),
  (
    'Turkey Burnoff 10m', 
    'Turkey Burnoff', 
    'TBD', 
    10.0, 
    'road', 
    2000, 
    'Work off that Thanksgiving feast with this challenging 10-mile race - also offered 5-mile option in some years'
  ),
  (
    'Jingle Bell Jog 8k', 
    'Jingle Bell', 
    'TBD', 
    5.0, 
    'road', 
    2000, 
    'Festive 8K race to cap off the year - don your holiday gear and jingle all the way to the finish'
  );

-- Create a view for course statistics
CREATE OR REPLACE VIEW course_statistics AS
SELECT 
  rc.id,
  rc.name,
  rc.short_name,
  rc.location,
  rc.typical_distance,
  rc.course_type,
  rc.established_year,
  COUNT(DISTINCT r.year) as years_held,
  COUNT(DISTINCT r.id) as total_races,
  MIN(r.year) as first_year,
  MAX(r.year) as last_year,
  COUNT(DISTINCT rr.id) as total_participants,
  AVG(r.distance_miles) as avg_distance
FROM race_courses rc
LEFT JOIN races r ON rc.id = r.race_course_id
LEFT JOIN race_results rr ON r.id = rr.race_id
WHERE rc.is_active = true
GROUP BY rc.id, rc.name, rc.short_name, rc.location, rc.typical_distance, rc.course_type, rc.established_year
ORDER BY rc.name;

-- Create a view for course records (fastest times ever)
CREATE OR REPLACE VIEW course_records AS
WITH course_best_times AS (
  SELECT 
    rc.id as course_id,
    rc.name as course_name,
    r.year,
    r.name as race_name,
    r.date as race_date,
    MIN(rr.gun_time) as best_time,
    runners.first_name,
    runners.last_name,
    runners.gender,
    sr.age_group
  FROM race_courses rc
  JOIN races r ON rc.id = r.race_course_id
  JOIN race_results rr ON r.id = rr.race_id
  JOIN series_registrations sr ON rr.series_registration_id = sr.id
  JOIN runners ON sr.runner_id = runners.id
  WHERE rr.is_dnf = false AND rr.is_dq = false
  GROUP BY rc.id, rc.name, r.year, r.name, r.date, runners.first_name, runners.last_name, runners.gender, sr.age_group
),
ranked_times AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY best_time) as overall_rank,
    ROW_NUMBER() OVER (PARTITION BY course_id, gender ORDER BY best_time) as gender_rank
  FROM course_best_times
)
SELECT 
  course_id,
  course_name,
  year,
  race_name,
  race_date,
  best_time,
  first_name,
  last_name,
  gender,
  age_group,
  overall_rank,
  gender_rank,
  CASE 
    WHEN overall_rank = 1 THEN 'Course Record'
    WHEN gender_rank = 1 THEN CONCAT(gender, ' Course Record')
    ELSE NULL 
  END as record_type
FROM ranked_times
WHERE overall_rank <= 10 OR gender_rank <= 5  -- Top 10 overall, top 5 by gender
ORDER BY course_id, overall_rank;

COMMENT ON TABLE race_courses IS 'Race courses that link races across multiple years, enabling course records and multi-year analysis';
COMMENT ON VIEW course_statistics IS 'Statistical summary of each race course including years held and participation';
COMMENT ON VIEW course_records IS 'Course records and top performances for each race course';
