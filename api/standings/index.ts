// GET /api/standings - Get series standings
// POST /api/standings/recalculate - Recalculate standings

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSeriesStandings } from '../../lib/db/utils.js';

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
      // Get year and seriesId from query parameters
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const seriesId = req.query.seriesId as string | undefined;
      
      // Get series standings
      const standings = await getSeriesStandings(year, seriesId);
      
      // Transform to match frontend types
      const transformedStandings = standings.map((standing: any, index: number) => ({
        id: standing.id,
        seriesId: standing.series_id,
        runnerId: standing.runner_id,
        year: standing.year,
        totalPoints: standing.total_points,
        racesParticipated: standing.races_participated,
        overallRank: standing.overall_rank || (index + 1),
        genderRank: standing.gender_rank,
        ageGroupRank: standing.age_group_rank,
        qualifyingRaces: [], // TODO: Load qualifying races separately
        updatedAt: standing.last_calculated_at || standing.updated_at,
        // Include runner information
        runner: {
          id: standing.runner_id,
          bibNumber: standing.bib_number,
          firstName: standing.first_name,
          lastName: standing.last_name,
          gender: standing.gender,
          ageGroup: standing.age_group,
        }
      }));

      return res.status(200).json({
        success: true,
        data: transformedStandings,
        count: transformedStandings.length,
        year,
        seriesId: seriesId || null
      });
      
    } else if (req.method === 'POST') {
      // TODO: Implement recalculate standings functionality
      return res.status(501).json({
        success: false,
        error: 'POST /api/standings not yet implemented'
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
