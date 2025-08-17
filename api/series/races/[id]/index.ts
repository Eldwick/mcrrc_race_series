// API endpoint for managing individual championship series races
// DELETE /api/series/races/[id] - Remove a planned race (cannot delete scraped races)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../../../lib/db/connection.js';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`
    });
  }

  const sql = getSql();
  const raceId = req.query.id as string;

  if (!raceId) {
    return res.status(400).json({
      success: false,
      error: 'Race ID is required'
    });
  }

  try {
    // Check if this is a scraped race (cannot delete)
    const scrapedRace = await sql`
      SELECT id FROM races WHERE id = ${raceId}
    `;

    if ((scrapedRace as any[]).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete scraped races. Only planned races can be removed.'
      });
    }

    // Delete the planned race
    const result = await sql`
      DELETE FROM planned_races 
      WHERE id = ${raceId}
      RETURNING *
    `;

    if ((result as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Planned race not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: result[0],
      message: 'Planned race removed successfully'
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
