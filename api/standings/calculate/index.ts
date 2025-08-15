// POST /api/standings/calculate - Calculate MCRRC Championship Series standings
// Based on official rules: https://mcrrc.org/club-race-series/championship-series-cs/

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateMCRRCStandings } from '../../../lib/db/utils';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to calculate standings.'
    });
  }

  try {
    const { seriesId, year } = req.body;

    // Validate required parameters
    if (!seriesId) {
      return res.status(400).json({
        success: false,
        error: 'seriesId is required'
      });
    }

    const targetYear = year || new Date().getFullYear();

    console.log(`Calculating MCRRC standings for series ${seriesId}, year ${targetYear}...`);
    
    // Calculate MCRRC Championship Series standings
    await calculateMCRRCStandings(seriesId, targetYear);

    console.log(`Successfully calculated MCRRC standings for series ${seriesId}, year ${targetYear}`);

    return res.status(200).json({
      success: true,
      message: `MCRRC Championship Series standings calculated successfully for ${targetYear}`,
      data: {
        seriesId,
        year: targetYear,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error calculating MCRRC standings:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate MCRRC standings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
