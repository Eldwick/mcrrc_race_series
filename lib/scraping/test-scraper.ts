// Test utility for MCRRC scraper
// Run with: npm run ts-node lib/scraping/test-scraper.ts

import { mcrrcScraper } from './mcrrc-scraper';
import { getSql } from '../db/connection';

async function testScraper() {
  console.log('🚀 Testing MCRRC Scraper...\n');

  try {
    // Test 1: Discover race URLs
    console.log('📡 Discovering race URLs...');
    const urls = await mcrrcScraper.discoverRaceUrls(2024);
    console.log(`Found ${urls.length} URLs:`);
    urls.slice(0, 5).forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    if (urls.length > 5) {
      console.log(`  ... and ${urls.length - 5} more`);
    }
    console.log('');

    // Test 2: Try to scrape a sample URL (if any found)
    if (urls.length > 0) {
      const testUrl = urls[0];
      console.log(`🔍 Testing scrape on: ${testUrl}`);
      
      try {
        const scrapedRace = await mcrrcScraper.scrapeRace(testUrl);
        
        console.log('✅ Scrape successful!');
        console.log(`Race: ${scrapedRace.name}`);
        console.log(`Date: ${scrapedRace.date}`);
        console.log(`Distance: ${scrapedRace.distance} miles`);
        console.log(`Location: ${scrapedRace.location}`);
        console.log(`Runners found: ${scrapedRace.runners.length}`);
        console.log(`Results found: ${scrapedRace.results.length}`);
        
        // Show sample data
        if (scrapedRace.runners.length > 0) {
          console.log('\nSample runners:');
          scrapedRace.runners.slice(0, 3).forEach((runner, i) => {
            console.log(`  ${i + 1}. Bib ${runner.bibNumber}: ${runner.firstName} ${runner.lastName}, ${runner.gender}${runner.age}, ${runner.club}`);
          });
        }
        
        if (scrapedRace.results.length > 0) {
          console.log('\nSample results:');
          scrapedRace.results.slice(0, 3).forEach((result, i) => {
            console.log(`  ${i + 1}. Bib ${result.bibNumber}: Place ${result.place}, Time ${result.gunTime}${result.isDNF ? ' (DNF)' : ''}${result.isDQ ? ' (DQ)' : ''}`);
          });
        }
        
      } catch (scrapeError) {
        console.log('❌ Scrape failed:', scrapeError instanceof Error ? scrapeError.message : scrapeError);
      }
    }

    // Test 3: Database connection
    console.log('\n🗄️ Testing database connection...');
    const sql = getSql();
    const result = await sql`SELECT current_timestamp, COUNT(*) as series_count FROM series`;
    console.log('✅ Database connected!');
    console.log(`Current time: ${result[0].current_timestamp}`);
    console.log(`Series in database: ${result[0].series_count}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  console.log('\n🏁 Test completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  testScraper().catch(console.error);
}
