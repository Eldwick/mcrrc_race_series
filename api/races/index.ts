// GET /api/races - Get all races
// POST /api/races - Create a new race

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllRaces, getRaceSummary, formatTimeFromInterval } from '../../lib/db/utils';

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
      
      // Get race summaries for each race (with top results)
      const transformedRaces = await Promise.all(races.map(async (race) => {
        // Only get summary for scraped races that have results
        let summary = { totalParticipants: 0, completed: 0, dnfDq: 0, topResults: [] };
        let topResults: any[] = [];
        
        if (race.race_status === 'scraped') {
          try {
            const raceSummary = await getRaceSummary(race.id);
            summary = raceSummary;
            
            // Transform top results
            topResults = summary.topResults.map((result: any) => ({
              place: result.place,
              firstName: result.first_name,
              lastName: result.last_name,
              gender: result.gender,
              ageGroup: result.age_group,
              bibNumber: result.bib_number,
              gunTime: formatTimeFromInterval(result.gun_time),
              genderRank: result.gender_rank
            }));
          } catch (error) {
            // If getRaceSummary fails for a scraped race, log but continue
            console.warn(`Failed to get summary for scraped race ${race.name}:`, error);
          }
        }

        return {
          id: race.id,
          seriesId: race.series_id,
          name: race.name,
          date: race.date,
          year: race.year,
          distanceMiles: race.distance_miles,
          location: race.location,
          courseType: race.course_type,
          mcrrcUrl: race.mcrrc_url,
          raceStatus: race.race_status,
          resultsScrapedAt: race.results_scraped_at,
          notes: race.notes,
          plannedRaceId: race.planned_race_id,
          createdAt: race.created_at,
          updatedAt: race.updated_at,
          // Race summary data
          summary: {
            totalParticipants: summary.totalParticipants,
            completed: summary.completed,
            dnfDq: summary.dnfDq,
            topResults: topResults
          }
        };
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
