#!/usr/bin/env tsx

import 'dotenv/config';
import { MCRRCScraper } from '../lib/scraping/mcrrc-scraper.ts';

/**
 * Simple script to scrape and save a single race URL to the database
 * Use this after verifying fixes with verify-race-fix
 */
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error('❌ Error: Please provide a race URL');
    console.log('Usage: npm run scrape-single-race "https://mcrrc.org/race-result/....."');
    process.exit(1);
  }
  
  console.log(`\n🔄 Scraping single race: ${url}\n`);
  
  try {
    const scraper = new MCRRCScraper();
    
    // Scrape the race data first
    console.log('🚀 Scraping race data...');
    const scrapedData = await scraper.scrapeRace(url);
    
    if (!scrapedData.results.length) {
      console.error('❌ No results scraped - check the URL or scraping logic');
      process.exit(1);
    }
    
    // Now save the data to the database
    console.log('💾 Saving to database...');
    const seriesId = '7e4725ac-1620-484d-9371-78ab81565dc0'; // 2018 MCRRC Championship Series
    await scraper.storeRaceData(scrapedData, seriesId);
    
    console.log(`\n✅ Successfully scraped and saved!`);
    console.log(`📋 Race: ${scrapedData.race?.name || 'Unknown'}`);
    console.log(`📅 Date: ${scrapedData.race?.date || 'Unknown'}`);
    console.log(`📍 Location: ${scrapedData.race?.location || 'Unknown'}`);
    console.log(`🏃 Results: ${scrapedData.results.length}`);
    console.log(`👥 Runners: ${scrapedData.runners.length}`);
    
    // Show first few results as confirmation
    console.log(`\n📊 Sample results:`);
    scrapedData.results.slice(0, 5).forEach((result, index) => {
      const runner = scrapedData.runners.find(r => r.bibNumber === result.bibNumber);
      console.log(`   ${index + 1}: ${runner?.firstName} ${runner?.lastName} (${result.bibNumber}) - ${result.gunTime}`);
    });
    
    if (scrapedData.results.length > 5) {
      console.log(`   ... and ${scrapedData.results.length - 5} more results`);
    }
    
    console.log(`\n🎯 Race data has been saved to the database!`);
    
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n❌ Scraping cancelled by user');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
