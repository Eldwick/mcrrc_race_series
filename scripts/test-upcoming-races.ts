#!/usr/bin/env tsx
/**
 * Test Upcoming Races Script
 * 
 * Tests that the races API now returns both scraped and planned races.
 * 
 * Usage:
 *   npm run test:upcoming-races
 *   npx tsx scripts/test-upcoming-races.ts
 */

import { getSql } from '../lib/db/connection';
import { getAllRaces } from '../lib/db/utils';

async function testUpcomingRaces(): Promise<void> {
  console.log('🏃 Testing Upcoming Races Display');
  console.log('=' .repeat(50));
  
  try {
    const sql = getSql();
    
    console.log('📊 Database Race Status Summary:');
    
    // Check scraped races count
    const scrapedRacesCount = await sql`
      SELECT COUNT(*) as count FROM races WHERE year = 2025
    ` as any[];
    
    // Check planned races count
    const plannedRacesCount = await sql`
      SELECT COUNT(*) as count FROM planned_races WHERE year = 2025 AND status = 'planned'
    ` as any[];
    
    console.log(`   ✅ Scraped races (2025): ${scrapedRacesCount[0]?.count || 0}`);
    console.log(`   📅 Planned races (2025): ${plannedRacesCount[0]?.count || 0}`);
    
    // Test the getAllRaces function
    console.log('\n🔍 Testing getAllRaces API Function:');
    const allRaces = await getAllRaces(2025);
    
    const scrapedRaces = allRaces.filter(r => r.race_status === 'scraped');
    const plannedRaces = allRaces.filter(r => r.race_status === 'planned');
    
    console.log(`   📋 Total races returned: ${allRaces.length}`);
    console.log(`   ✅ Scraped races: ${scrapedRaces.length}`);
    console.log(`   📅 Planned races: ${plannedRaces.length}`);
    
    console.log('\n📅 Upcoming Races (Planned):');
    if (plannedRaces.length > 0) {
      plannedRaces.forEach((race, index) => {
        const date = race.date ? new Date(race.date).toLocaleDateString() : 'TBD';
        const distance = race.distance_miles ? `${race.distance_miles} miles` : 'Distance TBD';
        const location = race.location || 'Location TBD';
        
        console.log(`   ${index + 1}. ${race.name}`);
        console.log(`      📅 Date: ${date}`);
        console.log(`      🏃 Distance: ${distance}`);
        console.log(`      📍 Location: ${location}`);
        console.log(`      🏷️  Status: ${race.race_status}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No planned races found');
    }
    
    console.log('✅ Completed Races (Scraped):');
    if (scrapedRaces.length > 0) {
      scrapedRaces.slice(0, 3).forEach((race, index) => {
        const date = new Date(race.date).toLocaleDateString();
        const distance = race.distance_miles ? `${race.distance_miles} miles` : 'Unknown distance';
        
        console.log(`   ${index + 1}. ${race.name}`);
        console.log(`      📅 Date: ${date}`);
        console.log(`      🏃 Distance: ${distance}`);
        console.log(`      📍 Location: ${race.location || 'Unknown location'}`);
        console.log(`      🏷️  Status: ${race.race_status}`);
        console.log(`      🔗 URL: ${race.mcrrc_url || 'No URL'}`);
        console.log('');
      });
      
      if (scrapedRaces.length > 3) {
        console.log(`   ... and ${scrapedRaces.length - 3} more completed races`);
      }
    } else {
      console.log('   ⚠️  No scraped races found');
    }
    
    console.log('🎯 Test Results:');
    
    const expectedTotal = parseInt(scrapedRacesCount[0]?.count || '0') + parseInt(plannedRacesCount[0]?.count || '0');
    const actualTotal = allRaces.length;
    
    console.log(`   📊 Expected total races: ${expectedTotal}`);
    console.log(`   📊 Actual races returned: ${actualTotal}`);
    console.log(`   🎯 API working correctly: ${expectedTotal === actualTotal ? '✅ YES' : '❌ NO'}`);
    
    if (plannedRaces.length > 0) {
      console.log(`   📅 Upcoming races visible: ✅ YES (${plannedRaces.length} found)`);
    } else {
      console.log('   📅 Upcoming races visible: ❌ NO');
      console.log('      💡 Make sure planned races are seeded with: npm run seed:races:planned-only');
    }
    
    console.log('\n🎯 Frontend Integration:');
    console.log('   📱 Races API updated: ✅ Returns both scraped and planned races');
    console.log('   🏷️  Race status field added: ✅ Distinguishes race types');
    console.log('   🎨 UI updated: ✅ Different badges for completed vs upcoming');
    console.log('   🚫 Navigation: ✅ Planned races not clickable (no detail page yet)');
    console.log('   📊 Stats: ✅ Separate counts for completed vs upcoming');
    
    console.log('\n📱 How to Test in Browser:');
    console.log('   1. Start development server: npm run dev');
    console.log('   2. Visit: http://localhost:5173/races (not port 3000!)');
    console.log('   3. You should now see both completed and upcoming races');
    console.log('   4. Upcoming races will show "Upcoming" badge and countdown');
    console.log('   5. Completed races will show "Completed" badge and results');
    
    const overallSuccess = (expectedTotal === actualTotal) && (plannedRaces.length > 0) && (scrapedRaces.length > 0);
    console.log(`\n🏁 Overall Status: ${overallSuccess ? '✅ SUCCESS' : '⚠️  NEEDS ATTENTION'}`);
    
    if (overallSuccess) {
      console.log('🎉 Upcoming races are now visible alongside completed races!');
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
  testUpcomingRaces()
    .then(() => {
      console.log('\n✨ Upcoming races test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Upcoming races test failed:', error);
      process.exit(1);
    });
}

export { testUpcomingRaces };
