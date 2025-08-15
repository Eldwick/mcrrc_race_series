// POST /api/scrape - Scrape race results from MCRRC.org
// This endpoint triggers scraping of race results and stores them in the database

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mcrrcScraper } from '../../lib/scraping/mcrrc-scraper';
import { getSql } from '../../lib/db/connection';

// Simple authentication for scraping endpoint
const SCRAPING_SECRET = process.env.SCRAPING_SECRET || 'dev-scraping-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Simple authentication
    const { secret, url, year, seriesId, action } = req.body;
    if (secret !== SCRAPING_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - invalid secret'
      });
    }

    // Check database connection
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL environment variable not set'
      });
    }

    const startTime = Date.now();
    let result;

    switch (action) {
      case 'discover':
        result = await handleDiscoverRaces(year);
        break;
      case 'scrape-race':
        result = await handleScrapeRace(url, seriesId);
        break;
      case 'scrape-all':
        result = await handleScrapeAll(year, seriesId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Must be "discover", "scrape-race", or "scrape-all"'
        });
    }

    const duration = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      action,
      data: result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scraping error:', error);

    return res.status(500).json({
      success: false,
      error: 'Scraping failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Discover available race URLs for a given year
 */
async function handleDiscoverRaces(year?: number): Promise<any> {
  const targetYear = year || new Date().getFullYear();
  console.log(`Discovering races for year: ${targetYear}`);

  const urls = await mcrrcScraper.discoverRaceUrls(targetYear);

  return {
    year: targetYear,
    urls,
    count: urls.length
  };
}

/**
 * Scrape a single race from a URL
 */
async function handleScrapeRace(url: string, seriesId?: string): Promise<any> {
  if (!url) {
    throw new Error('URL is required for scrape-race action');
  }

  console.log(`Scraping single race: ${url}`);

  // Get or create series
  const finalSeriesId = await getOrCreateSeries(seriesId);
  
  // Scrape the race
  const scrapedRace = await mcrrcScraper.scrapeRace(url);
  
  // Store in database
  await mcrrcScraper.storeRaceData(scrapedRace, finalSeriesId);

  return {
    race: {
      name: scrapedRace.name,
      date: scrapedRace.date,
      distance: scrapedRace.distance,
      location: scrapedRace.location,
      url: scrapedRace.url
    },
    stats: {
      runnersFound: scrapedRace.runners.length,
      resultsFound: scrapedRace.results.length
    }
  };
}

/**
 * Discover and scrape all races for a year
 */
async function handleScrapeAll(year?: number, seriesId?: string): Promise<any> {
  const targetYear = year || new Date().getFullYear();
  console.log(`Scraping all races for year: ${targetYear}`);

  // Get or create series
  const finalSeriesId = await getOrCreateSeries(seriesId, targetYear);

  // Discover race URLs
  const urls = await mcrrcScraper.discoverRaceUrls(targetYear);
  console.log(`Found ${urls.length} potential race URLs`);

  const results = [];
  const errors = [];

  // Scrape each race with some delay to be respectful
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      console.log(`Scraping race ${i + 1}/${urls.length}: ${url}`);
      
      const scrapedRace = await mcrrcScraper.scrapeRace(url);
      await mcrrcScraper.storeRaceData(scrapedRace, finalSeriesId);

      results.push({
        url,
        name: scrapedRace.name,
        date: scrapedRace.date,
        runnersFound: scrapedRace.runners.length,
        resultsFound: scrapedRace.results.length,
        success: true
      });

      // Add delay between requests to be respectful
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      errors.push({
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    year: targetYear,
    seriesId: finalSeriesId,
    summary: {
      totalUrls: urls.length,
      successfulScrapes: results.length,
      failures: errors.length,
      totalRunners: results.reduce((sum, r) => sum + r.runnersFound, 0),
      totalResults: results.reduce((sum, r) => sum + r.resultsFound, 0)
    },
    results,
    errors
  };
}

/**
 * Get existing series or create new one
 */
async function getOrCreateSeries(seriesId?: string, year?: number): Promise<string> {
  const sql = getSql();
  const targetYear = year || new Date().getFullYear();

  if (seriesId) {
    // Verify series exists
    const existing = await sql`SELECT id FROM series WHERE id = ${seriesId}` as any[];
    if (existing.length > 0) {
      return seriesId;
    }
  }

  // Find or create series for the year
  let series = await sql`
    SELECT id FROM series 
    WHERE year = ${targetYear} AND name ILIKE '%championship%'
    ORDER BY created_at DESC
    LIMIT 1
  ` as any[];

  if (series.length === 0) {
    // Create new series for this year
    const newSeries = await sql`
      INSERT INTO series (name, year, description, is_active)
      VALUES (
        ${`MCRRC Championship Series`},
        ${targetYear},
        ${`Montgomery County Road Runners Club Championship Series for ${targetYear}`},
        true
      )
      RETURNING id
    `;
    return newSeries[0].id;
  }

  return series[0].id;
}
