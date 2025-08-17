#!/usr/bin/env tsx
/**
 * Calculate MCRRC Championship Series Standings
 * 
 * This script calculates standings directly using the database utilities.
 * Must be run after races have been scraped to see results on the leaderboard.
 * 
 * Usage:
 *   npm run calculate:standings
 *   npx tsx scripts/calculate-standings.ts
 */

import { calculateMCRRCStandings } from '../lib/db/utils.js';
import { getSql } from '../lib/db/connection.js';

const TARGET_YEAR = 2025;
const SERIES_NAME = 'MCRRC Championship Series';

async function calculateStandings(): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🏆 Initiating MCRRC Championship Series Standings Calculation...');
    console.log(`📊 Series: ${SERIES_NAME}`);
    console.log(`📅 Year: ${TARGET_YEAR}`);
    console.log('');
    
    // Find the series by name and year
    const sql = getSql();
    
    console.log('📋 Finding series...');
    const series = await sql`
      SELECT id, name, year 
      FROM series 
      WHERE name = ${SERIES_NAME} AND year = ${TARGET_YEAR}
    `;

    if (series.length === 0) {
      console.error(`❌ Series "${SERIES_NAME}" for year ${TARGET_YEAR} not found`);
      console.error('   Make sure the series has been created first.');
      console.error('   Run: npm run setup:complete');
      process.exit(1);
    }

    const seriesId = series[0].id;
    console.log(`✅ Found series: "${series[0].name}" (${series[0].year}) - ID: ${seriesId}`);
    console.log('');
    
    console.log('🔍 Verifying data...');
    const raceResults = await sql`
      SELECT COUNT(*) as count
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      WHERE sr.series_id = ${seriesId}
    `;
    
    const races = await sql`
      SELECT COUNT(*) as count
      FROM races
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
    `;
    
    const plannedRaces = await sql`
      SELECT COUNT(*) as count
      FROM planned_races
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
    `;
    
    console.log(`   📊 Race results: ${raceResults[0].count}`);
    console.log(`   🏁 Scraped races: ${races[0].count}`);
    console.log(`   📅 Planned races: ${plannedRaces[0].count}`);
    
    if (raceResults[0].count === 0) {
      console.log('⚠️  No race results found. Make sure races have been scraped first.');
      console.log('   Run: npm run seed:races:scrape');
      process.exit(1);
    }

    console.log('');
    console.log('⏳ Starting calculation (this may take a while for large datasets)...');
    
    // Run the calculation
    await calculateMCRRCStandings(seriesId, TARGET_YEAR);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify results
    console.log('');
    console.log('🔍 Verifying calculation results...');
    
    const standings = await sql`
      SELECT COUNT(*) as count
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      WHERE sr.series_id = ${seriesId}
    `;
    
    console.log(`   🏆 Total standings calculated: ${standings[0].count}`);
    
    // Show top 5 results
    const topResults = await sql`
      SELECT 
        r.first_name,
        r.last_name,
        r.gender,
        s.overall_points,
        s.age_group_points,
        s.races_participated,
        s.overall_rank
      FROM series_standings s
      JOIN series_registrations sr ON s.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE sr.series_id = ${seriesId}
      ORDER BY r.gender, s.overall_points DESC
      LIMIT 10
    `;
    
    console.log('');
    console.log('🏆 Top Results by Gender:');
    
    const maleResults = topResults.filter(r => r.gender === 'M').slice(0, 5);
    const femaleResults = topResults.filter(r => r.gender === 'F').slice(0, 5);
    
    console.log('');
    console.log('👨 Men:');
    maleResults.forEach((result, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '   ';
      console.log(`   ${emoji} #${result.overall_rank} ${result.first_name} ${result.last_name} - ${result.overall_points} pts (${result.races_participated} races)`);
    });
    
    console.log('');
    console.log('👩 Women:');
    femaleResults.forEach((result, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '   ';
      console.log(`   ${emoji} #${result.overall_rank} ${result.first_name} ${result.last_name} - ${result.overall_points} pts (${result.races_participated} races)`);
    });
    
    console.log('');
    console.log('✅ CALCULATION SUCCESSFUL!');
    console.log('==============================');
    console.log(`⏱️  Completed in: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    console.log(`🏆 Total standings: ${standings[0].count}`);
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   • Start frontend: npm run dev');
    console.log('   • Visit leaderboard: http://localhost:3001/leaderboard');
    console.log('   • Check specific runners: http://localhost:3001/runners');
    
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ CALCULATION FAILED');
    console.error('==============================');
    console.error(`⏱️  Failed after: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    console.error(`💥 Error: ${error.message}`);
    console.error('');
    console.error('🩺 TROUBLESHOOTING STEPS:');
    console.error('   1. Verify data exists: npm run diagnose:leaderboard');
    console.error('   2. Check database connection');
    console.error('   3. Ensure races have been scraped first');
    console.error('   4. Check for data inconsistencies');
    console.error('');
    
    if (error.stack) {
      console.error('📋 Stack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run the calculation function if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  calculateStandings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Calculation failed:', error);
      process.exit(1);
    });
}