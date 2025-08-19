// GET /api/runners/[id]/courses - Get runner course statistics (how many times run each course, fastest times, etc.)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRunnerResults } from '../../../../lib/db/utils';

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

    // Get all runner results
    const allResults = await getRunnerResults(runnerId);
    
    // Filter valid results and group by course
    const validResults = allResults.filter(result => !result.is_dnf && !result.is_dq);
    
    // Group by race_course_id (the proper way)
    const courseGroups = new Map();
    validResults.forEach(result => {
      const courseKey = result.race_course_id || result.race_name || 'unknown-course';
      if (!courseGroups.has(courseKey)) {
        courseGroups.set(courseKey, []);
      }
      courseGroups.get(courseKey).push(result);
    });
    
    // Helper function to convert time to seconds (handles both string and object formats)
    const convertTimeToSeconds = (time: any): number => {
      if (!time) return Infinity;
      
      // Handle object format: {minutes: 10, seconds: 34, hours?: 1}
      if (typeof time === 'object' && time.minutes !== undefined) {
        const hours = time.hours || 0;
        const minutes = time.minutes || 0;
        const seconds = time.seconds || 0;
        return hours * 3600 + minutes * 60 + seconds;
      }
      
      // Handle string format: "10:34" or "1:10:34"
      if (typeof time === 'string') {
        const parts = time.split(':');
        if (parts.length === 2) {
          return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 3) {
          return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        }
      }
      
      return Infinity;
    };
    
    // Calculate course statistics
    const courseStats = Array.from(courseGroups.entries()).map(([courseKey, results]: [string, any[]]) => {
      const firstResult = results[0];
      const sortedByTime = [...results].sort((a, b) => {
        // Convert times to seconds for comparison
        const aSeconds = convertTimeToSeconds(a.gun_time);
        const bSeconds = convertTimeToSeconds(b.gun_time);
        return aSeconds - bSeconds;
      });
      
      const fastestResult = sortedByTime[0];
      
      // Use course ID if available, otherwise fall back to race name
      const courseId = firstResult.race_course_id || null;
      const courseName = firstResult.race_name || 'Unknown Course';
      
      return {
        course: {
          id: courseId,
          name: courseName,
          location: '', // Not available in this data structure
          typicalDistance: firstResult.distance_miles || null
        },
        statistics: (() => {
          // Find best performances and their years
          const bestOverallPlace = Math.min(...results.map(r => r.place));
          const bestOverallResult = results.find(r => r.place === bestOverallPlace);
          
          const bestGenderPlace = Math.min(...results.map(r => r.place_gender));
          const bestGenderResult = results.find(r => r.place_gender === bestGenderPlace);
          
          const bestAgeGroupPlace = Math.min(...results.map(r => r.place_age_group));
          const bestAgeGroupResult = results.find(r => r.place_age_group === bestAgeGroupPlace);
          
          return {
            timesRun: results.length,
            fastestTime: fastestResult.gun_time,
            slowestTime: sortedByTime[sortedByTime.length - 1].gun_time,
            averageTimeSeconds: Math.round(results.reduce((sum, r) => sum + convertTimeToSeconds(r.gun_time), 0) / results.length),
            bestOverallPlace,
            bestOverallPlaceYear: bestOverallResult ? new Date(bestOverallResult.race_date).getFullYear() : null,
            bestGenderPlace,
            bestGenderPlaceYear: bestGenderResult ? new Date(bestGenderResult.race_date).getFullYear() : null,
            bestAgeGroupPlace,
            bestAgeGroupPlaceYear: bestAgeGroupResult ? new Date(bestAgeGroupResult.race_date).getFullYear() : null,
            firstYear: Math.min(...results.map(r => new Date(r.race_date).getFullYear())),
            lastYear: Math.max(...results.map(r => new Date(r.race_date).getFullYear()))
          };
        })(),
        fastestRaceResult: {
          raceId: fastestResult.race_id,
          raceName: fastestResult.race_name,
          year: new Date(fastestResult.race_date).getFullYear(),
          overallPlace: fastestResult.place,
          ageGroupPlace: fastestResult.place_age_group
        }
      };
    }).sort((a, b) => b.statistics.timesRun - a.statistics.timesRun);

    return res.status(200).json({
      success: true,
      data: courseStats,
      count: courseStats.length
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
