// GET /api/runners/[id]/results - Get race results for a specific runner

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRunnerResults } from '../../../../lib/db/utils';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  try {
    const runnerId = req.query.id as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    
    if (!runnerId) {
      return res.status(400).json({
        success: false,
        error: 'Runner ID is required'
      });
    }

    // Get the runner's race results
    const results = await getRunnerResults(runnerId, year);
    
    // Transform to match frontend types
    const transformedResults = results.map((result: any) => ({
      id: result.id,
      raceId: result.race_id,
      runnerId: runnerId,
      place: result.place,
      placeGender: result.place_gender,
      placeAgeGroup: result.place_age_group,
      bibNumber: result.bib_number,
      gunTime: result.gun_time,
      chipTime: result.chip_time,
      pacePerMile: result.pace_per_mile,
      isDNF: result.is_dnf,
      isDQ: result.is_dq,
      overrideReason: result.override_reason,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      // Race information
      race: {
        id: result.race_id,
        name: result.race_name,
        date: result.race_date,
        distanceMiles: result.distance_miles,
        courseId: result.race_course_id,
      },
      // Runner information from series registration
      age: result.age,
      ageGroup: result.age_group,
    }));

    return res.status(200).json({
      success: true,
      data: transformedResults,
      count: transformedResults.length,
      runnerId,
      year: year || 'all years'
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
