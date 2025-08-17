// GET /api/races/years - Get all available years with race data

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../../lib/db/connection.js';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    const sql = getSql();
    
    // Get distinct years from races table, ordered by year descending
    const years = await sql`
      SELECT DISTINCT year 
      FROM races 
      WHERE year IS NOT NULL 
      ORDER BY year DESC
    ` as any[];

    // Extract year values from the result
    const availableYears = years.map(row => row.year);

    return res.status(200).json({
      success: true,
      data: availableYears,
      count: availableYears.length
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
