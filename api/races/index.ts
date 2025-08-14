// GET /api/races - Get all races
// POST /api/races - Create a new race

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllRaces } from '../../lib/db/utils';

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

  try {
    if (req.method === 'GET') {
      // Get year from query parameters
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      // Get all races
      const races = await getAllRaces(year);
      
      // Transform to match frontend types
      const transformedRaces = races.map(race => ({
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
      }));

      return res.status(200).json({
        success: true,
        data: transformedRaces,
        count: transformedRaces.length,
        year: year || 'all'
      });
      
    } else if (req.method === 'POST') {
      // TODO: Implement create race functionality
      return res.status(501).json({
        success: false,
        error: 'POST /api/races not yet implemented'
      });
      
    } else {
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
