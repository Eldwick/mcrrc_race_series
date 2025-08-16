// GET /api/races/[id]/results - Get race results for a specific race

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRaceResults } from '../../../../lib/db/utils';
import { formatTimeFromInterval } from '../../../../lib/db/utils';

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
    const raceId = req.query.id as string;
    
    if (!raceId) {
      return res.status(400).json({
        success: false,
        error: 'Race ID is required'
      });
    }

    // Get the race results
    const raceResults = await getRaceResults(raceId);

    // Transform to match frontend types
    const transformedResults = raceResults.map(result => ({
      id: result.id,
      raceId: result.race_id,
      runnerId: result.runner_id, // Use actual runner ID
      bibNumber: result.bib_number,
      place: result.place,
      placeGender: result.place_gender || 0,
      placeAgeGroup: result.place_age_group || 0,
      gunTime: formatTimeFromInterval(result.gun_time),
      chipTime: result.chip_time ? formatTimeFromInterval(result.chip_time) : null,
      pacePerMile: formatTimeFromInterval(result.pace_per_mile),
      isDNF: result.is_dnf || false,
      isDQ: result.is_dq || false,
      overrideReason: result.override_reason || null,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      // Runner details - these should be available from the query
      runner: {
        id: result.runner_id, // Use actual runner ID
        firstName: result.first_name,
        lastName: result.last_name,
        gender: result.gender,
        age: result.age,
        ageGroup: result.age_group,
        bibNumber: result.bib_number
      }
    }));

    return res.status(200).json({
      success: true,
      data: transformedResults,
      count: transformedResults.length
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
