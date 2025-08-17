#!/usr/bin/env tsx
/**
 * Fix Failed Races Script
 * 
 * Re-scrapes the races that failed during the initial seed scraping.
 * This script uses the improved idempotent scraping logic to handle conflicts.
 * 
 * Usage:
 *   npm run fix:failed-races
 *   npx tsx scripts/fix-failed-races.ts
 */

import { mcrrcScraper } from '../lib/scraping/mcrrc-scraper';

// Default series ID - MCRRC Championship Series 2025
const DEFAULT_SERIES_ID = 'f75a7257-ad21-495c-a127-69240dd0193d';

// Races that failed during initial scraping
const FAILED_RACES = [
  {
    name: "Memorial Day 4 Miler",
    url: "https://mcrrc.org/race-result/memorial-day-4-miler-5/",
    reason: "Bib number conflicts"
  },
  {
    name: "Midsummer Night's Mile", 
    url: "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-9/",
    reason: "Distance parsing (now fixed)"
  },
  {
    name: "Riley's Rumble Half Marathon",
    url: "https://mcrrc.org/race-result/rileys-rumble-half-marathon-13/",
    reason: "Bib number conflicts"
  },
  {
    name: "Going Green – 2 Mile Run",
    url: "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-6/",
    reason: "Bib number conflicts"
  }
];

async function fixFailedRaces(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('   Set it in .env.local or as an environment variable');
    process.exit(1);
  }

  console.log('🔧 Re-scraping races that failed during initial seed scraping...');
  console.log('📋 Fixed issues:');
  console.log('   ✅ Improved bib number conflict resolution');
  console.log('   ✅ Better distance parsing for "Mile" races');
  console.log('   ✅ Made distance_miles nullable in database');
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  const errors: { race: string; error: string }[] = [];

  for (const [index, race] of FAILED_RACES.entries()) {
    const raceNum = index + 1;
    try {
      console.log(`🏃 [${raceNum}/${FAILED_RACES.length}] Re-scraping: ${race.name}`);
      console.log(`   🔍 Previous issue: ${race.reason}`);
      console.log(`   🔗 URL: ${race.url}`);

      // Use the improved idempotent scraper
      const scrapedRace = await mcrrcScraper.scrapeRace(race.url);
      await mcrrcScraper.storeRaceData(scrapedRace, DEFAULT_SERIES_ID);

      console.log(`   ✅ Success! Found ${scrapedRace.runners.length} runners, ${scrapedRace.results.length} results`);
      successCount++;

      // Add delay between requests to be respectful
      if (index < FAILED_RACES.length - 1) {
        console.log('   ⏳ Waiting 1 second before next scrape...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2s to 1s
      }

    } catch (error) {
      console.error(`   ❌ Still failing:`, error instanceof Error ? error.message : error);
      errors.push({
        race: race.name,
        error: error instanceof Error ? error.message : String(error)
      });
      errorCount++;
    }

    console.log('');
  }

  // Summary
  console.log('📊 Re-scraping Results:');
  console.log(`   ✅ Fixed: ${successCount}/${FAILED_RACES.length} races`);
  console.log(`   ❌ Still failing: ${errorCount}/${FAILED_RACES.length} races`);

  if (errors.length > 0) {
    console.log('');
    console.log('⚠️ Remaining Issues:');
    for (const error of errors) {
      console.log(`   • ${error.race}: ${error.error}`);
    }
    console.log('');
    console.log('🆘 If issues persist, please report them with the error details above.');
  }

  if (successCount > 0) {
    console.log('');
    console.log('🎉 Successfully fixed races!');
    console.log('💡 Next steps:');
    console.log('   1. Check the admin dashboard: http://localhost:3000/admin');
    console.log('   2. Recalculate standings to update points');
    console.log('   3. Verify the leaderboard shows correct results');
  }

  console.log('');
  console.log('✨ Script complete!');
}

// Run the fix function if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixFailedRaces()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix script failed:', error);
      process.exit(1);
    });
}

export { fixFailedRaces, FAILED_RACES };
