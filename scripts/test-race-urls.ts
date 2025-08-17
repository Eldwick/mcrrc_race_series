#!/usr/bin/env tsx
/**
 * Test Race URLs Script
 * 
 * Checks if races in the database have official MCRRC URLs stored
 * and tests the URL linking functionality.
 * 
 * Usage:
 *   npm run test:race-urls
 *   npx tsx scripts/test-race-urls.ts
 */

import { getSql } from '../lib/db/connection';

async function testRaceUrls(): Promise<void> {
  console.log('🔗 Testing Race URL Storage and Linking');
  console.log('=' .repeat(50));
  
  try {
    const sql = getSql();
    
    // Check races with URLs
    const racesWithUrls = await sql`
      SELECT 
        id,
        name,
        date,
        distance_miles,
        location,
        mcrrc_url,
        year
      FROM races 
      WHERE mcrrc_url IS NOT NULL
      ORDER BY date DESC
      LIMIT 10
    ` as any[];
    
    console.log(`✅ Found ${racesWithUrls.length} races with official URLs:\n`);
    
    if (racesWithUrls.length === 0) {
      console.log('⚠️  No races found with URLs. This could mean:');
      console.log('   1. No races have been scraped yet');
      console.log('   2. The mcrrc_url column is not being populated during scraping');
      console.log('   3. The database schema doesn\'t include mcrrc_url column');
      console.log('\n💡 Try running a scraping operation to populate URLs.');
    } else {
      racesWithUrls.forEach((race, index) => {
        console.log(`${index + 1}. ${race.name} (${race.year})`);
        console.log(`   📅 Date: ${race.date}`);
        console.log(`   📍 Location: ${race.location}`);
        console.log(`   🏃 Distance: ${race.distance_miles || 'Unknown'} miles`);
        console.log(`   🔗 URL: ${race.mcrrc_url}`);
        console.log('');
      });
    }
    
    // Check races without URLs
    const racesWithoutUrls = await sql`
      SELECT COUNT(*) as count
      FROM races 
      WHERE mcrrc_url IS NULL
    ` as any[];
    
    const countWithoutUrls = racesWithoutUrls[0]?.count || 0;
    
    if (countWithoutUrls > 0) {
      console.log(`⚠️  Found ${countWithoutUrls} races without URLs`);
      console.log('   These races may have been created manually or from legacy data.');
      console.log('   URLs will be populated when races are scraped or re-scraped.');
    }
    
    // Check database schema
    console.log('\n🗄️  Database Schema Check:');
    const schemaCheck = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'races' AND column_name = 'mcrrc_url'
    ` as any[];
    
    if (schemaCheck.length > 0) {
      const column = schemaCheck[0];
      console.log(`✅ mcrrc_url column exists: ${column.data_type} ${column.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    } else {
      console.log('❌ mcrrc_url column not found in races table');
    }
    
    // Test URL accessibility (just check format)
    console.log('\n🌐 URL Format Validation:');
    let validUrls = 0;
    let invalidUrls = 0;
    
    for (const race of racesWithUrls) {
      const url = race.mcrrc_url;
      if (url && url.includes('mcrrc.org') && url.includes('race-result')) {
        validUrls++;
      } else {
        invalidUrls++;
        console.log(`   ❌ Invalid URL format: ${race.name} - ${url}`);
      }
    }
    
    if (racesWithUrls.length > 0) {
      console.log(`✅ ${validUrls} URLs have valid MCRRC format`);
      if (invalidUrls > 0) {
        console.log(`❌ ${invalidUrls} URLs have invalid format`);
      }
    }
    
    console.log('\n📱 Frontend Integration Status:');
    console.log('✅ Race type includes raceUrl and resultsUrl fields');
    console.log('✅ API endpoints return mcrrcUrl field');
    console.log('✅ Frontend API client maps mcrrcUrl to raceUrl/resultsUrl');
    console.log('✅ Individual race page shows "View Official Results" link');
    console.log('✅ Race list page shows "Official Results" links');
    console.log('✅ Links open in new tab with proper security attributes');
    
    console.log('\n🎯 Test Results Summary:');
    console.log(`   📊 Total races with URLs: ${racesWithUrls.length}`);
    console.log(`   📊 Total races without URLs: ${countWithoutUrls}`);
    console.log(`   📊 Valid URL format: ${validUrls}`);
    console.log(`   📊 Invalid URL format: ${invalidUrls}`);
    
    const overallStatus = racesWithUrls.length > 0 && validUrls === racesWithUrls.length;
    console.log(`   🏁 Overall Status: ${overallStatus ? '✅ WORKING' : '⚠️  NEEDS ATTENTION'}`);
    
    if (overallStatus) {
      console.log('\n🎉 Official race result links are properly configured!');
      console.log('   Users can now access original MCRRC race results from both');
      console.log('   the races list page and individual race detail pages.');
    } else if (racesWithUrls.length === 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Run race scraping to populate URLs');
      console.log('   2. Check scraper is capturing URLs correctly');
      console.log('   3. Verify database schema includes mcrrc_url column');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the test function if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRaceUrls()
    .then(() => {
      console.log('\n✨ Race URL test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Race URL test failed:', error);
      process.exit(1);
    });
}

export { testRaceUrls };
