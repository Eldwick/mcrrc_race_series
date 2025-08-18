/**
 * Mapping between course names and their corresponding GPX files
 */

export const COURSE_GPX_MAPPING: Record<string, string> = {
  'Eastern County 8k': 'eastern_county_8k.gpx',
  'Eastern County': 'eastern_county_8k.gpx',
  // Turkey Burnoff
  'Turkey Burnoff 10m': 'turkey_burnoff_10m.gpx',
  'Turkey Burnoff 10miler': 'turkey_burnoff_10m.gpx',
  'Jingle Bell Jog 8k': 'jingle_bell_jog.gpx',
  'Capital for a Day 5k': 'capital_for_a_day.gpx',
  'Piece of Cake 10k': 'piece_of_cake.gpx',
  // Add more mappings as you add GPX files
  // 'Piece of Cake 10k': 'piece_of_cake_10k.gpx',
  // 'Riley\'s Rumble Half Marathon': 'rileys_rumble_half.gpx',
};

/**
 * Get GPX filename for a course
 */
export function getGpxFilename(courseName: string): string | null {
  // Exact match first
  if (COURSE_GPX_MAPPING[courseName]) return COURSE_GPX_MAPPING[courseName];

  // Fallback: case-insensitive match
  const lower = courseName.toLowerCase();
  for (const [key, file] of Object.entries(COURSE_GPX_MAPPING)) {
    if (key.toLowerCase() === lower) return file;
  }
  return null;
}

/**
 * Check if a course has GPX data available
 */
export function hasGpxData(courseName: string): boolean {
  if (courseName in COURSE_GPX_MAPPING) return true;
  const lower = courseName.toLowerCase();
  return Object.keys(COURSE_GPX_MAPPING).some(k => k.toLowerCase() === lower);
}
