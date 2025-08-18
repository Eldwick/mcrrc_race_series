// GET /api/runners - Get all runners
// POST /api/runners - Create a new runner

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllRunners, getRunnersPaginated } from '../../lib/db/utils';

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
      // Pagination and search params
      const rawQ = (req.query.q as string | undefined) || '';
      const q = decodeURIComponent(rawQ.replace(/\+/g, ' ')).trim(); // Properly decode + as spaces
      const page = parseInt((req.query.page as string) || '1', 10) || 1;
      const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '50', 10) || 50));
      const sortParam = (req.query.sort as string) || 'name_asc';
      const sort = sortParam === 'name_desc' ? 'name_desc' : 'name_asc';



      const { rows, total } = await getRunnersPaginated({ search: q, page, limit, sort });

      // Transform to match frontend types
      const transformedRunners = rows.map(runner => ({
        id: runner.id,
        bibNumber: runner.bib_number || '', // From series_registrations
        firstName: runner.first_name,
        lastName: runner.last_name,
        gender: runner.gender,
        age: runner.age, // From series_registrations
        ageGroup: runner.age_group || '', // From series_registrations
        club: runner.club,
        isActive: runner.is_active,
        createdAt: runner.created_at,
        updatedAt: runner.updated_at,
        // Additional series info
        currentSeries: '',
        currentYear: new Date().getFullYear(),
        // Race participation count
        raceCount: parseInt(runner.race_count) || 0,
      }));

      return res.status(200).json({
        success: true,
        data: transformedRunners,
        count: transformedRunners.length,
        total,
        page,
        limit
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
