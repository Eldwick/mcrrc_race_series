// API endpoint for managing championship series races
// GET /api/series/races - List all races in a series
// POST /api/series/races - Add a new race to the series

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../../lib/db/connection.js';

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
      // Get all races in a series using planned_races as authoritative source
      const { year = 2025, seriesName = 'MCRRC Championship Series' } = req.query;

      // Find series by name and year
      const series = await sql`
        SELECT id 
        FROM series 
        WHERE name = ${seriesName} AND year = ${year}
      `;

      if (series.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Series "${seriesName}" for year ${year} not found`
        });
      }

      const seriesId = series[0].id;

      // Get all planned races with their scraped status
      const allRaces = await sql`
        SELECT 
          pr.id,
          pr.name,
          pr.planned_date as date,
          pr.estimated_distance as distance,
          pr.location,
          pr.series_order,
          r.id as scraped_race_id,
          r.mcrrc_url,
          r.results_scraped_at,
          r.distance_miles as actual_distance,
          CASE 
            WHEN r.id IS NOT NULL THEN 'scraped'
            ELSE 'planned'
          END as status
        FROM planned_races pr
        LEFT JOIN races r ON pr.id = r.planned_race_id 
        WHERE pr.series_id = ${seriesId} AND pr.year = ${year}
        ORDER BY pr.series_order, pr.planned_date
      `;

      // Count scraped vs planned
      const scrapedCount = (allRaces as any[]).filter(race => race.status === 'scraped').length;
      const totalCount = (allRaces as any[]).length;

      return res.status(200).json({
        success: true,
        data: allRaces,
        totalRaces: totalCount,
        scrapedRaces: scrapedCount,
        plannedRaces: totalCount - scrapedCount
      });

    } else if (req.method === 'POST') {
      // Add a new planned race
      const { name, date, estimatedDistance, location, year = 2025, seriesName = 'MCRRC Championship Series' } = req.body;

      // Find series by name and year
      const series = await sql`
        SELECT id 
        FROM series 
        WHERE name = ${seriesName} AND year = ${year}
      `;

      if (series.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Series "${seriesName}" for year ${year} not found`
        });
      }

      const seriesId = series[0].id;

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
