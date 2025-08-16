#!/usr/bin/env tsx
/**
 * Leaderboard Diagnostic Script
 * 
 * Checks the current state of the database to diagnose leaderboard issues.
 * Shows race count, standings count, and helps identify missing data.
 * 
 * Usage:
 *   npm run diagnose:leaderboard
 *   npx tsx scripts/diagnose-leaderboard.ts
 */

import { getSql } from '../lib/db/connection';

// Default series ID - MCRRC Championship Series 2025
const DEFAULT_SERIES_ID = 'f75a7257-ad21-495c-a127-69240dd0193d';
const TARGET_YEAR = 2025;

async function diagnoseLeaderboard(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('   Set it in .env.local or as an environment variable');
    process.exit(1);
  }

  const sql = getSql();

  try {
    console.log('🔍 MCRRC Championship Series Leaderboard Diagnostics');
    console.log('=' .repeat(60));
    console.log(`📊 Series ID: ${DEFAULT_SERIES_ID}`);
    console.log(`📅 Year: ${TARGET_YEAR}`);
    console.log('');

    // 1. Check series exists
    const series = await sql`
      SELECT id, name, year, is_active 
      FROM series 
      WHERE id = ${DEFAULT_SERIES_ID}
    ` as any[];

    if (series.length === 0) {
      console.log('❌ Series not found!');
      console.log(`   The series ID ${DEFAULT_SERIES_ID} doesn't exist.`);
      console.log('   You may need to run the seed script first.');
      return;
    }

    console.log('✅ Series found:');
    console.log(`   Name: ${series[0].name}`);
    console.log(`   Year: ${series[0].year}`);
    console.log(`   Active: ${series[0].is_active}`);
    console.log('');

    // 2. Check planned races
    const plannedRaces = await sql`
      SELECT name, status, series_order 
      FROM planned_races 
      WHERE series_id = ${DEFAULT_SERIES_ID} AND year = ${TARGET_YEAR}
      ORDER BY series_order
    ` as any[];

    console.log(`📋 Planned Races: ${plannedRaces.length}/12`);
    if (plannedRaces.length > 0) {
      const statusCounts = plannedRaces.reduce((acc: any, race: any) => {
        acc[race.status] = (acc[race.status] || 0) + 1;
        return acc;
      }, {});
      
      for (const [status, count] of Object.entries(statusCounts)) {
        const emoji = status === 'scraped' ? '✅' : '📅';
        console.log(`   ${emoji} ${status}: ${count} races`);
      }
    } else {
      console.log('   ⚠️  No planned races found. Run: npm run seed:races:planned-only');
    }
    console.log('');

    // 3. Check scraped races
    const scrapedRaces = await sql`
      SELECT id, name, date, distance_miles, planned_race_id
      FROM races 
      WHERE series_id = ${DEFAULT_SERIES_ID} AND year = ${TARGET_YEAR}
      ORDER BY date
    ` as any[];

    console.log(`🏁 Scraped Races: ${scrapedRaces.length}`);
    if (scrapedRaces.length > 0) {
      for (const race of scrapedRaces) {
        const linkedIcon = race.planned_race_id ? '🔗' : '❓';
        console.log(`   ${linkedIcon} ${race.name} (${race.date}) - ${race.distance_miles || 'Unknown'} mi`);
      }
    } else {
      console.log('   ⚠️  No scraped races found. Run: npm run seed:races:scrape');
    }
    console.log('');

    // 4. Check race results
    const resultCounts = await sql`
      SELECT 
        r.name as race_name,
        COUNT(rr.id) as result_count
      FROM races r
      LEFT JOIN race_results rr ON r.id = rr.race_id
      WHERE r.series_id = ${DEFAULT_SERIES_ID} AND r.year = ${TARGET_YEAR}
      GROUP BY r.id, r.name
      ORDER BY r.date
    ` as any[];

    console.log(`🏆 Race Results:`);
    let totalResults = 0;
    for (const race of resultCounts) {
      const count = parseInt(race.result_count) || 0;
      totalResults += count;
      const resultIcon = count > 0 ? '✅' : '❌';
      console.log(`   ${resultIcon} ${race.race_name}: ${count} results`);
    }
    console.log(`   Total: ${totalResults} results across all races`);
    console.log('');

    // 5. Check series registrations
    const registrationCount = await sql`
      SELECT COUNT(*) as count
      FROM series_registrations 
      WHERE series_id = ${DEFAULT_SERIES_ID}
    ` as any[];

    console.log(`👥 Series Registrations: ${registrationCount[0]?.count || 0} runners`);
    console.log('');

    // 6. Check standings (most important!)
    const standingsCount = await sql`
      SELECT COUNT(*) as count
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      WHERE sr.series_id = ${DEFAULT_SERIES_ID}
    ` as any[];

    const standingsRows = await sql`
      SELECT 
        r.first_name,
        r.last_name,
        ss.total_points,
        ss.overall_points,
        ss.age_group_points,
        ss.races_participated,
        ss.last_calculated_at
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE sr.series_id = ${DEFAULT_SERIES_ID}
      ORDER BY ss.total_points DESC
      LIMIT 5
    ` as any[];

    console.log(`📊 Calculated Standings: ${standingsCount[0]?.count || 0} runners`);
    
    if (standingsRows.length > 0) {
      console.log(`   Last calculated: ${standingsRows[0].last_calculated_at || 'Never'}`);
      console.log('   Top 5 runners:');
      for (const [i, standing] of standingsRows.entries()) {
        console.log(`   ${i + 1}. ${standing.first_name} ${standing.last_name} - ${standing.total_points} pts (${standing.races_participated} races)`);
      }
    } else {
      console.log('   ❌ No standings calculated yet!');
      console.log('   This is why your leaderboard is empty.');
    }
    console.log('');

    // 7. Diagnosis and recommendations
    console.log('🩺 DIAGNOSIS:');
    console.log('=' .repeat(40));

    if (scrapedRaces.length === 0) {
      console.log('❌ PRIMARY ISSUE: No races scraped');
      console.log('   SOLUTION: Run scraping first');
      console.log('   COMMAND: npm run seed:races:scrape');
    } else if (totalResults === 0) {
      console.log('❌ PRIMARY ISSUE: Races exist but no results');
      console.log('   SOLUTION: Re-run scraping to get results');  
      console.log('   COMMAND: npm run fix:failed-races');
    } else if (standingsCount[0]?.count === 0) {
      console.log('❌ PRIMARY ISSUE: No standings calculated');
      console.log('   SOLUTION: Calculate MCRRC Championship Series standings');
      console.log(`   COMMAND: curl -X POST http://localhost:3000/api/standings/calculate \\`);
      console.log(`            -H "Content-Type: application/json" \\`);
      console.log(`            -d '{"seriesId": "${DEFAULT_SERIES_ID}", "year": ${TARGET_YEAR}}'`);
    } else {
      console.log('✅ Data looks good! Check frontend filtering logic.');
    }

    console.log('');
    console.log('💡 RECOMMENDED STEPS:');
    console.log('1. Fix any data issues above');
    console.log('2. Calculate standings using the API call');
    console.log('3. Check leaderboard at http://localhost:3000/leaderboard');
    console.log('4. If still issues, check browser console for errors');

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'Unknown error');
  }
}

// Run the diagnostic function if called directly
if (require.main === module) {
  diagnoseLeaderboard()
    .then(() => {
      console.log('\n🏁 Diagnostic complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Diagnostic failed:', error);
      process.exit(1);
    });
}

export { diagnoseLeaderboard };
