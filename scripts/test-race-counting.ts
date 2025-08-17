#!/usr/bin/env tsx
/**
 * Test Race Counting Fix
 * 
 * Verifies that the /api/series/races endpoint is no longer double counting races
 */

import { getSql } from '../lib/db/connection.js';

const TARGET_YEAR = 2025;
const SERIES_NAME = 'MCRRC Championship Series';

async function testRaceCounting(): Promise<void> {
  const sql = getSql();
  
  console.log('🧪 Testing Race Counting Fix');
  console.log('=' .repeat(50));
  
  try {
    // Find series
    const series = await sql`
      SELECT id, name, year 
      FROM series 
      WHERE name = ${SERIES_NAME} AND year = ${TARGET_YEAR}
    `;

    if (series.length === 0) {
      console.log('❌ Series not found');
      return;
    }

    const seriesId = series[0].id;
    console.log(`📊 Found series: "${series[0].name}" (${series[0].year}) - ID: ${seriesId}`);
    
    // Direct database counts
    console.log('\n📋 Direct Database Counts:');
    
    const plannedRaces = await sql`
      SELECT COUNT(*) as count
      FROM planned_races 
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
    `;
    
    const scrapedRaces = await sql`
      SELECT COUNT(*) as count
      FROM races 
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
    `;
    
    const linkedRaces = await sql`
      SELECT COUNT(*) as count
      FROM planned_races pr
      LEFT JOIN races r ON pr.id = r.planned_race_id
      WHERE pr.series_id = ${seriesId} AND pr.year = ${TARGET_YEAR}
      AND r.id IS NOT NULL
    `;
    
    console.log(`   📅 Planned races: ${plannedRaces[0].count}`);
    console.log(`   🏁 Scraped races: ${scrapedRaces[0].count}`);
    console.log(`   🔗 Linked races: ${linkedRaces[0].count}`);
    
    // Test API endpoint simulation
    console.log('\n🔧 API Logic Simulation:');
    
    const allRaces = await sql`
      SELECT 
        pr.id,
        pr.name,
        pr.planned_date as date,
        r.id as scraped_race_id,
        CASE 
          WHEN r.id IS NOT NULL THEN 'scraped'
          ELSE 'planned'
        END as status
      FROM planned_races pr
      LEFT JOIN races r ON pr.id = r.planned_race_id 
      WHERE pr.series_id = ${seriesId} AND pr.year = ${TARGET_YEAR}
      ORDER BY pr.series_order, pr.planned_date
    `;
    
    const scrapedCount = (allRaces as any[]).filter(race => race.status === 'scraped').length;
    const totalCount = (allRaces as any[]).length;
    
    console.log(`   🎯 Total races (should be ${plannedRaces[0].count}): ${totalCount}`);
    console.log(`   ✅ Scraped races (should be ${linkedRaces[0].count}): ${scrapedCount}`);
    console.log(`   ⏳ Remaining races: ${totalCount - scrapedCount}`);
    
    // Validation
    console.log('\n🔍 Validation:');
    if (totalCount == plannedRaces[0].count) {
      console.log('   ✅ Total count matches planned races count');
    } else {
      console.log('   ❌ Total count does NOT match planned races count');
    }
    
    if (scrapedCount == linkedRaces[0].count) {
      console.log('   ✅ Scraped count matches linked races count');
    } else {
      console.log('   ❌ Scraped count does NOT match linked races count');
    }
    
    console.log('\n📱 Expected leaderboard display:');
    console.log(`   "${scrapedCount}/${totalCount} races completed"`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testRaceCounting()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

