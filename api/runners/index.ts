// GET /api/runners - Get all runners
// POST /api/runners - Create a new runner

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllRunners } from '../../lib/db/utils';

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
      // Get all runners
      const runners = await getAllRunners();
      
      // Transform to match frontend types
      const transformedRunners = runners.map(runner => ({
        id: runner.id,
        bibNumber: runner.bib_number,
        firstName: runner.first_name,
        lastName: runner.last_name,
        gender: runner.gender,
        age: runner.age,
        ageGroup: runner.age_group,
        club: runner.club,
        isActive: runner.is_active,
        createdAt: runner.created_at,
        updatedAt: runner.updated_at,
      }));

      return res.status(200).json({
        success: true,
        data: transformedRunners,
        count: transformedRunners.length
      });
      
    } else if (req.method === 'POST') {
      // TODO: Implement create runner functionality
      return res.status(501).json({
        success: false,
        error: 'POST /api/runners not yet implemented'
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
