#!/usr/bin/env npx tsx

import { getSql } from '../lib/db/connection.js';

async function checkNonMcrrcWinners() {
  const sql = getSql();
  
  console.log('🏆 Checking for non-MCRRC race winners...');
  
  // Get all races and their top 5
  const races = await sql`
    SELECT DISTINCT races.id, races.name, races.date
    FROM races 
    WHERE series_id = 'f75a7257-ad21-495c-a127-69240dd0193d'
    ORDER BY races.date
  `;
  
  console.log(`\nAnalyzing ${races.length} races...\n`);
  
  let hasNonMcrrcWinners = false;
  
  for (const race of races) {
    const topResults = await sql`
      SELECT 
        rr.place,
        r.first_name,
        r.last_name, 
        r.club
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE rr.race_id = ${race.id}
      ORDER BY rr.place
      LIMIT 5
    `;
    
    console.log(`🏁 ${race.name} (${race.date.toISOString().split('T')[0]}):`);
    
    let mcrrcRank = 1;
    topResults.forEach(result => {
      const isMCRRC = result.club === 'MCRRC' || result.club?.includes('MCRRC');
      const marker = isMCRRC ? '✅' : '❌';
      const points = isMCRRC ? (mcrrcRank <= 10 ? (11 - mcrrcRank) : 0) : 0;
      
      console.log(`   ${marker} Overall #${result.place}: ${result.first_name} ${result.last_name} (${result.club || 'No Club'}) → ${points} MCRRC pts`);
      
      if (isMCRRC) mcrrcRank++;
      if (result.place === 1 && !isMCRRC) {
        hasNonMcrrcWinners = true;
      }
    });
    
    // Show MCRRC member count
    const mcrrcCount = await sql`
      SELECT COUNT(*) as count
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE rr.race_id = ${race.id} 
      AND (r.club = 'MCRRC' OR r.club LIKE '%MCRRC%')
    `;
    
    console.log(`   📊 MCRRC members in race: ${mcrrcCount[0].count}`);
    console.log('');
  }
  
  if (hasNonMcrrcWinners) {
    console.log('🔥 ISSUE CONFIRMED: Non-MCRRC runners are winning races!');
    console.log('   Current system gives them points, but they should get 0.');
    console.log('   MCRRC members should be re-ranked among themselves.');
  } else {
    console.log('ℹ️  All race winners are MCRRC members in scraped races.');
    console.log('   But scoring should still be MCRRC-only for consistency.');
  }
  
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkNonMcrrcWinners().catch(console.error);
}
