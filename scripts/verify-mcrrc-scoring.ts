#!/usr/bin/env npx tsx

import { getSql } from '../lib/db/connection.js';

async function verifyMcrrcScoring() {
  const sql = getSql();
  
  console.log('🏆 Verifying MCRRC-only scoring fix...');
  
  // Find Nicolas
  const nicolas = await sql`
    SELECT sr.id as registration_id
    FROM runners r
    JOIN series_registrations sr ON r.id = sr.runner_id  
    WHERE r.first_name ILIKE 'Nicolas' AND r.last_name ILIKE 'Crouzier'
    AND sr.series_id = 'f75a7257-ad21-495c-a127-69240dd0193d'
  `;
  
  if (nicolas.length === 0) {
    console.log('❌ Nicolas not found');
    return;
  }
  
  const registrationId = nicolas[0].registration_id;
  
  // Test the races where non-MCRRC runners won
  const testRaces = [
    'MCRRC Midsummer Night\'s Mile',
    'MCRRC Going Green – 2 Mile Run'
  ];
  
  console.log('\n🔍 Checking races where non-MCRRC runners won overall...\n');
  
  for (const raceName of testRaces) {
    const raceResults = await sql`
      SELECT 
        rr.place as overall_place,
        r.first_name,
        r.last_name,
        r.club,
        (r.club = 'MCRRC' OR r.club LIKE '%MCRRC%') as is_mcrrc
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      JOIN races races ON rr.race_id = races.id
      WHERE races.name = ${raceName}
      ORDER BY rr.place
      LIMIT 10
    `;
    
    console.log(`🏁 ${raceName}:`);
    
    let mcrrcRank = 1;
    raceResults.forEach(result => {
      const marker = result.is_mcrrc ? '✅' : '❌';
      const points = result.is_mcrrc ? (mcrrcRank <= 10 ? (11 - mcrrcRank) : 0) : 0;
      
      console.log(`   ${marker} Overall #${result.overall_place}: ${result.first_name} ${result.last_name} → MCRRC rank: ${result.is_mcrrc ? mcrrcRank : 'N/A'} → ${points} pts`);
      
      if (result.is_mcrrc) mcrrcRank++;
    });
    
    // Check Nicolas's specific result in this race
    const nicolasResult = await sql`
      SELECT 
        rr.place as overall_place
      FROM race_results rr
      JOIN races races ON rr.race_id = races.id
      WHERE races.name = ${raceName}
      AND rr.series_registration_id = ${registrationId}
    `;
    
    if (nicolasResult.length > 0) {
      // Count MCRRC members ahead of Nicolas
      const mcrrcAheadCount = await sql`
        SELECT COUNT(*) as count
        FROM race_results rr
        JOIN series_registrations sr ON rr.series_registration_id = sr.id
        JOIN runners r ON sr.runner_id = r.id
        JOIN races races ON rr.race_id = races.id
        WHERE races.name = ${raceName}
        AND rr.place < ${nicolasResult[0].overall_place}
        AND (r.club = 'MCRRC' OR r.club LIKE '%MCRRC%')
      `;
      
      const nicolasMcrrcRank = parseInt(mcrrcAheadCount[0].count) + 1;
      const expectedPoints = nicolasMcrrcRank <= 10 ? (11 - nicolasMcrrcRank) : 0;
      
      console.log(`   🎯 Nicolas: Overall #${nicolasResult[0].overall_place} → MCRRC rank: ${nicolasMcrrcRank} → Should get ${expectedPoints} points`);
    }
    
    console.log('');
  }
  
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMcrrcScoring().catch(console.error);
}
