#!/usr/bin/env tsx

import 'dotenv/config';
import { getSql } from '../lib/db/connection.js';
import { MCRRCScraper } from '../lib/scraping/mcrrc-scraper.js';
import { BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT } from './scrape-historical-race-results.js';
import { linkRacesToCourses } from './link-races-to-courses.js';

/**
 * Reset and re-scrape all races for a given course name.
 *
 * Usage:
 *   DATABASE_URL="..." tsx scripts/reset-and-rescrape-course.ts --course "Capital for a Day" [--years 2010,2014,2015]
 */

async function main() {
  const sql = getSql();
  const scraper = new MCRRCScraper();

  const args = process.argv.slice(2);
  const courseArgIdx = args.indexOf('--course');
  if (courseArgIdx === -1 || !args[courseArgIdx + 1]) {
    console.error('❌ Please provide --course "<Course Name as in BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT>"');
    process.exit(1);
  }
  const courseName = args[courseArgIdx + 1];

  // Optional years filter
  let targetYears: number[] | undefined;
  const yearsIdx = args.indexOf('--years');
  if (yearsIdx !== -1 && args[yearsIdx + 1]) {
    targetYears = args[yearsIdx + 1]
      .split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !Number.isNaN(v));
  }

  // Find the course entry in the discovered URL list
  const courseEntry = BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT.find(r => r.name.toLowerCase() === courseName.toLowerCase());
  if (!courseEntry) {
    console.error(`❌ Course "${courseName}" not found in BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT`);
    process.exit(1);
  }

  // Build year->url map to process
  const allYears = Object.keys(courseEntry.result_urls).map(y => parseInt(y)).sort((a, b) => a - b);
  const yearsToProcess = targetYears && targetYears.length > 0
    ? allYears.filter(y => targetYears!.includes(y))
    : allYears;

  console.log(`\n🧹 Resetting data and re-scraping course: ${courseEntry.name}`);
  console.log(`   Years: ${yearsToProcess.join(', ')}`);

  for (const year of yearsToProcess) {
    const url = courseEntry.result_urls[String(year)];
    if (!url) continue;

    // Locate races for this course+year via URL match first, then by name+year fallback
    const races = await sql`
      SELECT id FROM races WHERE year = ${year} AND (mcrrc_url = ${url} OR name ILIKE ${'%' + courseEntry.name + '%'})
    ` as Array<{ id: string }>;

    // Delete results and races for this set
    if (races.length > 0) {
      console.log(`   🗑️  Deleting ${races.length} race(s) for ${year}...`);
      for (const r of races) {
        await sql`DELETE FROM race_results WHERE race_id = ${r.id}`;
        await sql`DELETE FROM races WHERE id = ${r.id}`;
      }
    }

    // Ensure the series for the year exists (or create)
    const seriesRows = await sql`
      SELECT id FROM series WHERE name = 'MCRRC Championship Series' AND year = ${year} LIMIT 1
    ` as Array<{ id: string }>;
    let seriesId = seriesRows[0]?.id;
    if (!seriesId) {
      const inserted = await sql`
        INSERT INTO series (name, year, description, is_active)
        VALUES ('MCRRC Championship Series', ${year}, ${'Montgomery County Road Runners Club Championship Series for ' + year}, ${year === new Date().getFullYear()})
        RETURNING id
      ` as Array<{ id: string }>;
      seriesId = inserted[0].id;
      console.log(`   📅 Created series ${year}`);
    }

    // Re-scrape and store from the URL
    console.log(`   📄 ${year}: Scraping ${url}`);
    const scraped = await scraper.scrapeRace(url);
    await scraper.storeRaceData(scraped, seriesId);
    console.log(`   ✅ Stored ${scraped.results.length} results for ${year}`);
  }

  // Link the newly created races to courses
  console.log(`\n🔗 Linking races to courses...`);
  await linkRacesToCourses();

  console.log(`\n🎉 Done re-scraping course: ${courseEntry.name}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
}


