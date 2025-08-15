// GET /api/races/[id] - Get a specific race by ID

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRaceById } from '../../../lib/db/utils';

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

    // Get the race by ID
    const race = await getRaceById(raceId);
    
    if (!race) {
      return res.status(404).json({
        success: false,
        error: 'Race not found'
      });
    }

    // Transform to match frontend types
    const transformedRace = {
      id: race.id,
      seriesId: race.series_id,
      name: race.name,
      date: race.date,
      year: race.year,
      distanceMiles: race.distance_miles,
      location: race.location,
      courseType: race.course_type,
      mcrrcUrl: race.mcrrc_url,
      createdAt: race.created_at,
      updatedAt: race.updated_at,
    };

    return res.status(200).json({
      success: true,
      data: transformedRace
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
