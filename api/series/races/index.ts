// API endpoint for managing championship series races
// GET /api/series/races - List all races in a series
// POST /api/series/races - Add a new race to the series

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../../lib/db/connection';

// Enable CORS for API routes
function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getSql();

  try {
    if (req.method === 'GET') {
      // Get all races in a series (both scraped and planned)
      const { year = 2025, seriesId = 'f75a7257-ad21-495c-a127-69240dd0193d' } = req.query;

      // Get scraped races
      const scrapedRaces = await sql`
        SELECT 
          r.id,
          r.name,
          r.date,
          r.distance_miles as distance,
          r.location,
          r.mcrrc_url,
          r.results_scraped_at,
          'scraped' as status
        FROM races r
        WHERE r.series_id = ${seriesId} AND r.year = ${year}
        ORDER BY r.date
      `;

      // Get planned races (not yet scraped)
      const plannedRaces = await sql`
        SELECT 
          pr.id,
          pr.name,
          pr.planned_date as date,
          pr.estimated_distance as distance,
          pr.location,
          null as mcrrc_url,
          null as results_scraped_at,
          'planned' as status
        FROM planned_races pr
        WHERE pr.series_id = ${seriesId} AND pr.year = ${year}
        ORDER BY pr.planned_date
      `;

      // Combine and sort by date
      const allRaces = [...(scrapedRaces as any[]), ...(plannedRaces as any[])];
      allRaces.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return res.status(200).json({
        success: true,
        data: allRaces,
        totalRaces: allRaces.length,
        scrapedRaces: (scrapedRaces as any[]).length,
        plannedRaces: (plannedRaces as any[]).length
      });

    } else if (req.method === 'POST') {
      // Add a new planned race
      const { name, date, estimatedDistance, location, year = 2025, seriesId = 'f75a7257-ad21-495c-a127-69240dd0193d' } = req.body;

      if (!name || !date) {
        return res.status(400).json({
          success: false,
          error: 'Race name and date are required'
        });
      }

      // Create the planned_races table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS planned_races (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          planned_date DATE NOT NULL,
          year INTEGER NOT NULL,
          estimated_distance DECIMAL(5,2),
          location VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const result = await sql`
        INSERT INTO planned_races (series_id, name, planned_date, year, estimated_distance, location)
        VALUES (${seriesId}, ${name}, ${date}, ${year}, ${estimatedDistance || null}, ${location || null})
        RETURNING *
      `;

      return res.status(201).json({
        success: true,
        data: result[0],
        message: 'Planned race added successfully'
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
