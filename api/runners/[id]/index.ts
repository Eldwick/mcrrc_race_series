// GET /api/runners/[id] - Get a specific runner by ID

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRunnerById } from '../../../lib/db/utils.js';

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
    
    if (!runnerId) {
      return res.status(400).json({
        success: false,
        error: 'Runner ID is required'
      });
    }

    // Get the runner by ID
    const runner = await getRunnerById(runnerId);
    
    if (!runner) {
      return res.status(404).json({
        success: false,
        error: 'Runner not found'
      });
    }

    // Transform to match frontend types
    const transformedRunner = {
      id: runner.id,
      bibNumber: runner.bib_number || '',
      firstName: runner.first_name,
      lastName: runner.last_name,
      gender: runner.gender,
      age: runner.age,
      ageGroup: runner.age_group || '',
      club: runner.club,
      isActive: runner.is_active,
      createdAt: runner.created_at,
      updatedAt: runner.updated_at,
      currentSeries: runner.series_name || '',
      currentYear: runner.year || new Date().getFullYear(),
      // Race participation count
      raceCount: parseInt(runner.race_count) || 0,
    };

    return res.status(200).json({
      success: true,
      data: transformedRunner
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
