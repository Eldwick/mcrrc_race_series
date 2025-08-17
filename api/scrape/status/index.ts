// GET /api/scrape/status - Get scraping status and manage scraping operations
// This endpoint provides information about recent scraping activities

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../../../lib/db/connection.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Check database connection
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL environment variable not set'
      });
    }

    const sql = getSql();

    // Get scraping statistics
    const stats = await getScrapingStats(sql);

    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting scraping status:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get scraping status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get comprehensive scraping statistics
 */
async function getScrapingStats(sql: any) {
  // Get series information
  const series = await sql`
    SELECT 
      id,
      name,
      year,
      description,
      created_at,
      (SELECT COUNT(*) FROM races WHERE series_id = series.id) as race_count,
      (SELECT COUNT(*) FROM series_registrations WHERE series_id = series.id) as runner_count
    FROM series
    ORDER BY year DESC, created_at DESC
  `;

  // Get recent scraping activity (races with results_scraped_at)
  const recentScrapes = await sql`
    SELECT 
      r.id,
      r.name as race_name,
      r.date,
      r.location,
      r.mcrrc_url,
      r.results_scraped_at,
      s.name as series_name,
      s.year,
      (SELECT COUNT(*) FROM race_results WHERE race_id = r.id) as result_count
    FROM races r
    JOIN series s ON r.series_id = s.id
    WHERE r.results_scraped_at IS NOT NULL
    ORDER BY r.results_scraped_at DESC
    LIMIT 10
  `;

  // Get overall statistics
  const overallStats = await sql`
    SELECT 
      (SELECT COUNT(*) FROM series) as total_series,
      (SELECT COUNT(*) FROM runners) as total_runners,
      (SELECT COUNT(*) FROM races) as total_races,
      (SELECT COUNT(*) FROM race_results) as total_results,
      (SELECT COUNT(*) FROM races WHERE results_scraped_at IS NOT NULL) as scraped_races,
      (SELECT MAX(results_scraped_at) FROM races) as last_scrape_time
  `;

  // Get data quality metrics
  const dataQuality = await sql`
    SELECT 
      COUNT(*) as total_results,
      COUNT(*) FILTER (WHERE is_dnf = true) as dnf_count,
      COUNT(*) FILTER (WHERE is_dq = true) as dq_count,
      COUNT(*) FILTER (WHERE gun_time IS NULL OR gun_time = '00:00:00') as missing_time_count,
      COUNT(*) FILTER (WHERE chip_time IS NOT NULL) as chip_time_count
    FROM race_results
  `;

  // Get series breakdown
  const seriesBreakdown = await sql`
    SELECT 
      s.id,
      s.name,
      s.year,
      COUNT(DISTINCT r.id) as races,
      COUNT(DISTINCT sr.runner_id) as unique_runners,
      COUNT(rr.id) as total_results,
      MAX(r.results_scraped_at) as last_scraped
    FROM series s
    LEFT JOIN races r ON s.id = r.series_id
    LEFT JOIN series_registrations sr ON s.id = sr.series_id
    LEFT JOIN race_results rr ON r.id = rr.race_id
    GROUP BY s.id, s.name, s.year
    ORDER BY s.year DESC
  `;

  return {
    overview: overallStats[0] || {},
    dataQuality: dataQuality[0] || {},
    series,
    seriesBreakdown,
    recentScrapes,
    recommendations: generateRecommendations(overallStats[0], dataQuality[0])
  };
}

/**
 * Generate recommendations based on current data state
 */
function generateRecommendations(stats: any, quality: any): string[] {
  const recommendations: string[] = [];
  
  if (!stats) return recommendations;

  if (stats.total_series === 0) {
    recommendations.push("No series found. Create a series first before scraping races.");
  }

  if (stats.scraped_races === 0) {
    recommendations.push("No races have been scraped yet. Use /api/scrape to start collecting race data.");
  }

  if (stats.scraped_races > 0 && stats.scraped_races < stats.total_races) {
    const unscraped = stats.total_races - stats.scraped_races;
    recommendations.push(`${unscraped} races exist without scraped results. Consider running scraper on these races.`);
  }

  if (quality?.missing_time_count > 0) {
    recommendations.push(`${quality.missing_time_count} race results are missing time data. Review data quality.`);
  }

  if (quality?.total_results > 0 && quality?.chip_time_count === 0) {
    recommendations.push("No chip times found. Consider if chip time data is available and should be captured.");
  }

  if (stats.last_scrape_time) {
    const lastScrape = new Date(stats.last_scrape_time);
    const daysSinceLastScrape = Math.floor((Date.now() - lastScrape.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastScrape > 7) {
      recommendations.push(`Last scrape was ${daysSinceLastScrape} days ago. Consider running regular scrapes to keep data current.`);
    }
  }

  return recommendations;
}
