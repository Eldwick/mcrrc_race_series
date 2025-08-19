// GET /api/runners/[id]/statistics - Get runner lifetime statistics across all years and race series

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRunnerById, getRunnerResults, getSeriesStandings } from '../../../../lib/db/utils';

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

    // Get runner basic info
    const runner = await getRunnerById(runnerId);
    
    if (!runner) {
      return res.status(404).json({
        success: false,
        error: 'Runner not found'
      });
    }

    // Get all runner results across all years
    const allResults = await getRunnerResults(runnerId);
    
    // Calculate lifetime statistics from results
    const validResults = allResults.filter(result => !result.is_dnf && !result.is_dq);
    
    const lifetimeStats = {
      totalRaces: validResults.length,
      uniqueCourses: new Set(validResults.map(r => r.race_course_id).filter(Boolean)).size,
      overallTop3Finishes: validResults.filter(r => r.place <= 3).length,
      genderTop3Finishes: validResults.filter(r => r.place_gender <= 3).length,
      ageGroupTop3Finishes: validResults.filter(r => r.place_age_group <= 3).length,
      firstRaceDate: validResults.length > 0 ? validResults.sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime())[0].race_date : null,
      latestRaceDate: validResults.length > 0 ? validResults.sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0].race_date : null,
      yearsParticipated: new Set(validResults.map(r => new Date(r.race_date).getFullYear())).size
    };

    // Get current year standing
    const currentYear = new Date().getFullYear();
    const currentYearStandings = await getSeriesStandings(currentYear);
    const currentYearStanding = currentYearStandings.find(s => s.runner_id === runnerId) || null;

    // Get available years
    const availableYears = Array.from(new Set(allResults.map(r => new Date(r.race_date).getFullYear()))).sort((a, b) => b - a);

    const response = {
      runner: {
        id: runner.id,
        firstName: runner.first_name,
        lastName: runner.last_name,
        gender: runner.gender,
        ageGroup: runner.age_group || '',
        age: runner.age,
        club: runner.club || ''
      },
      lifetimeStats,
      currentYearStanding,
      availableYears
    };

    return res.status(200).json({
      success: true,
      data: response
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
