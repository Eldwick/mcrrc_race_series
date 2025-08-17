/**
 * Mapping between course names and their corresponding GPX files
 */

export const COURSE_GPX_MAPPING: Record<string, string> = {
  'Eastern County 8k': 'eastern_county_8k.gpx',
  'Eastern County': 'eastern_county_8k.gpx',
  // Add more mappings as you add GPX files
  // 'Piece of Cake 10k': 'piece_of_cake_10k.gpx',
  // 'Riley\'s Rumble Half Marathon': 'rileys_rumble_half.gpx',
};

/**
 * Get GPX filename for a course
 */
export function getGpxFilename(courseName: string): string | null {
  return COURSE_GPX_MAPPING[courseName] || null;
}

/**
 * Check if a course has GPX data available
 */
export function hasGpxData(courseName: string): boolean {
  return courseName in COURSE_GPX_MAPPING;
}
