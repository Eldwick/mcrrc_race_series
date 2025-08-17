#!/usr/bin/env tsx
/**
 * Test Historical Race Scraping for 2023-2024
 * 
 * This script tests the enhanced scraper by processing historical race URLs
 * for just 2023 and 2024 before doing the full 25-year historical run.
 * 
 * Usage:
 *   npm run test:historical:recent
 *   npx tsx scripts/test-historical-scraping-2023-2024.ts
 */

import { MCRRCScraper } from '../lib/scraping/mcrrc-scraper.js';
import { getSql } from '../lib/db/connection.js';

// Historical race data from the scraper output (focusing on 2023-2024)
const HISTORICAL_RACE_DATA = [
  {
    "name": "Kemp Mill (C)hills",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/kemp-mill-chill-5k-3/",
      "2024": "https://mcrrc.org/race-result/kemp-mill-chill-10k-4/"
    }
  },
  {
    "name": "Piece of Cake",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/piece-of-cake-10k-12/",
      "2024": "https://mcrrc.org/race-result/piece-of-cake-10k-13/"
    }
  },
  {
    "name": "Capital for a Day",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/capital-for-a-day-5k-5/",
      "2024": "https://mcrrc.org/race-result/capital-for-a-day-5k-6/"
    }
  },
  {
    "name": "Memorial Day 4 Miler",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/memorial-day-4-miler-4/",
      "2024": "https://mcrrc.org/race-result/memorial-4-mile-4/"
    }
  },
  {
    "name": "Midsummer Night's Mile",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/midsummer-nights-mile-10/",
      "2024": "https://mcrrc.org/race-result/midsummer-nights-mile-12/"
    }
  },
  {
    "name": "Riley's Rumble Half Marathon",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-11/",
      "2024": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-12/"
    }
  },
  {
    "name": "Going Green Track Meet",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/going-green-track-meet-2-mile-run/",
      "2024": "https://mcrrc.org/race-result/mcrrc-going-green-4x400-relay-5/"
    }
  },
  {
    "name": "Matthew Henson Trail",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/matthew-henson-5k-4/",
      "2024": "https://mcrrc.org/race-result/matthew-henson-5k-5/"
    }
  },
  {
    "name": "Eastern County",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/eastern-county-8k-10/",
      "2024": "https://mcrrc.org/race-result/eastern-county-8k-11/"
    }
  },
  {
    "name": "Country Road Run",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/country-road-5k-2/",
      "2024": "https://mcrrc.org/race-result/country-road-5k-3/"
    }
  },
  {
    "name": "Turkey Burnoff",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile-4/",
      "2024": "https://mcrrc.org/race-result/turkey-burnoff-10-mile-5-2/"
    }
  },
  {
    "name": "Jingle Bell Jog",
    "result_urls": {
      "2023": "https://mcrrc.org/race-result/jingle-bell-jog-8k-11/",
      "2024": "https://mcrrc.org/race-result/mcrrc-jingle-bell-jog-8k-2/"
    }
  }
];

interface ScrapingResult {
  year: number;
  raceName: string;
  url: string;
  seriesId: string;
  runnersFound: number;
  resultsFound: number;
  success: boolean;
  duration: number;
}

interface ScrapingError {
  year: number;
  raceName: string;
  url: string;
  error: string;
}

/**
 * Get existing series or create new one for a specific year
 */
async function getOrCreateSeries(year: number): Promise<string> {
  const sql = getSql();

  // Find existing championship series for the year
  let series = await sql`
    SELECT id, name FROM series 
    WHERE year = ${year} AND name ILIKE '%championship%'
    ORDER BY created_at DESC
    LIMIT 1
  ` as any[];

  if (series.length === 0) {
    // Create new series for this year
    console.log(`✨ Creating new championship series for ${year}`);
    const newSeries = await sql`
      INSERT INTO series (name, year, description, is_active)
      VALUES (
        ${'MCRRC Championship Series'},
        ${year},
        ${'Montgomery County Road Runners Club Championship Series for ' + year},
        true
      )
      RETURNING id, name
    ` as any[];
    
    console.log(`✅ Created series: "${newSeries[0].name}" (${newSeries[0].id})`);
    return newSeries[0].id;
  }

  console.log(`📋 Using existing series: "${series[0].name}" (${series[0].id}) for ${year}`);
  return series[0].id;
}

/**
 * Scrape a single historical race
 */
async function scrapeHistoricalRace(
  raceName: string, 
  url: string, 
  year: number, 
  scraper: MCRRCScraper
): Promise<ScrapingResult> {
  const startTime = Date.now();

  try {
    console.log(`\n🏃‍♂️ Scraping ${year} ${raceName}...`);
    console.log(`   URL: ${url}`);

    // Get or create series for this year
    const seriesId = await getOrCreateSeries(year);

    // Scrape the race
    const scrapedRace = await scraper.scrapeRace(url);
    
    // Store in database
    await scraper.storeRaceData(scrapedRace, seriesId);

    const duration = Date.now() - startTime;
    console.log(`✅ Success: ${scrapedRace.runners.length} runners, ${scrapedRace.results.length} results (${duration}ms)`);

    return {
      year,
      raceName,
      url,
      seriesId,
      runnersFound: scrapedRace.runners.length,
      resultsFound: scrapedRace.results.length,
      success: true,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed: ${errorMessage} (${duration}ms)`);

    throw {
      year,
      raceName,
      url,
      error: errorMessage
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🏃‍♂️ Historical Race Scraping Test (2023-2024)');
  console.log('=' .repeat(50));
  console.log('');

  // Check database configuration
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('');
    console.error('📋 To run this script, you need to:');
    console.error('   1. Copy env.example to .env: cp env.example .env');
    console.error('   2. Update DATABASE_URL in .env with your database connection');
    console.error('   3. Or run this script in production where DATABASE_URL is configured');
    console.error('');
    console.error('💡 For testing purposes, you can also run: npm run scrape:historical');
    console.error('   (This will show the race URLs without storing to database)');
    process.exit(1);
  }

  console.log('✅ Database configuration found');
  console.log('');

  const scraper = new MCRRCScraper();
  const results: ScrapingResult[] = [];
  const errors: ScrapingError[] = [];

  // Extract all URLs for 2023 and 2024
  const urlsToScrape: { raceName: string; url: string; year: number }[] = [];
  
  for (const raceData of HISTORICAL_RACE_DATA) {
    for (const [year, url] of Object.entries(raceData.result_urls)) {
      const yearNum = parseInt(year);
      if (yearNum === 2023 || yearNum === 2024) {
        urlsToScrape.push({
          raceName: raceData.name,
          url: url,
          year: yearNum
        });
      }
    }
  }

  console.log(`📋 Found ${urlsToScrape.length} historical races to scrape:`);
  urlsToScrape.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.year} ${item.raceName}`);
  });
  console.log('');

  // Scrape each race with delay between requests
  for (let i = 0; i < urlsToScrape.length; i++) {
    const { raceName, url, year } = urlsToScrape[i];
    
    try {
      const result = await scrapeHistoricalRace(raceName, url, year, scraper);
      results.push(result);

      // Add delay between requests to be respectful to the server
      if (i < urlsToScrape.length - 1) {
        console.log('   ⏱️  Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      errors.push(error as ScrapingError);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SCRAPING SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`\n✅ Successful scrapes: ${results.length}/${urlsToScrape.length}`);
  console.log(`❌ Failed scrapes: ${errors.length}/${urlsToScrape.length}`);
  
  if (results.length > 0) {
    const totalRunners = results.reduce((sum, r) => sum + r.runnersFound, 0);
    const totalResults = results.reduce((sum, r) => sum + r.resultsFound, 0);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    console.log(`\n📈 Data Collected:`);
    console.log(`   Total runners: ${totalRunners}`);
    console.log(`   Total results: ${totalResults}`);
    console.log(`   Average scraping time: ${Math.round(avgDuration)}ms`);
    
    console.log(`\n🏆 Successful Races:`);
    results.forEach(result => {
      console.log(`   ${result.year} ${result.raceName}: ${result.runnersFound} runners`);
    });
  }

  if (errors.length > 0) {
    console.log(`\n❌ Failed Races:`);
    errors.forEach(error => {
      console.log(`   ${error.year} ${error.raceName}: ${error.error}`);
    });
  }

  console.log('\n🎯 Test completed! Check your database for the historical race data.');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { main as testHistoricalScraping };
