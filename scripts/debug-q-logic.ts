#!/usr/bin/env npx tsx

import { getSql } from '../lib/db/connection.js';

async function debugQLogic() {
  const sql = getSql();
  
  console.log('🔍 Debugging Q logic for Nicolas...');
  
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
  console.log(`📋 Registration ID: ${registrationId}`);
  
  // Manually simulate the Q logic
  const raceResults = await sql`
    SELECT 
      races.name as race_name,
      rr.place,
      rr.place_gender, 
      rr.place_age_group
    FROM race_results rr
    JOIN races ON rr.race_id = races.id
    WHERE rr.series_registration_id = ${registrationId}
    ORDER BY races.date
  `;
  
  console.log(`\n📊 All ${raceResults.length} race results:`);
  
  const racePoints = raceResults.map((result, idx) => {
    const overallPoints = result.place <= 10 ? (11 - result.place) : 0;
    const ageGroupPoints = result.place_age_group <= 10 ? (11 - result.place_age_group) : 0;
    
    console.log(`   ${idx + 1}. ${result.race_name}: Overall #${result.place} (${overallPoints} pts), Age Group #${result.place_age_group} (${ageGroupPoints} pts)`);
    
    return { overallPoints, ageGroupPoints };
  });
  
  // Q calculation
  const totalPlannedRaces = await sql`SELECT COUNT(*) as count FROM planned_races WHERE series_id = 'f75a7257-ad21-495c-a127-69240dd0193d'`;
  const qualifyingRaces = Math.ceil(parseInt(totalPlannedRaces[0].count) / 2);
  
  console.log(`\n🎯 Q Logic:`);
  console.log(`   Total planned races: ${totalPlannedRaces[0].count}`);
  console.log(`   Qualifying races (Q): ${qualifyingRaces}`);
  
  // Sort and take best races
  const overallRaces = [...racePoints].sort((a, b) => b.overallPoints - a.overallPoints);
  const topOverallRaces = overallRaces.slice(0, qualifyingRaces);
  const totalOverallPoints = topOverallRaces.reduce((sum, race) => sum + race.overallPoints, 0);
  
  console.log(`\n📊 Best ${qualifyingRaces} overall races:`);
  topOverallRaces.forEach((race, idx) => {
    console.log(`   ${idx + 1}. ${race.overallPoints} points`);
  });
  console.log(`   Total: ${totalOverallPoints} points`);
  
  const ageGroupRaces = [...racePoints].sort((a, b) => b.ageGroupPoints - a.ageGroupPoints);
  const topAgeGroupRaces = ageGroupRaces.slice(0, qualifyingRaces);
  const totalAgeGroupPoints = topAgeGroupRaces.reduce((sum, race) => sum + race.ageGroupPoints, 0);
  
  console.log(`\n📊 Best ${qualifyingRaces} age group races:`);
  topAgeGroupRaces.forEach((race, idx) => {
    console.log(`   ${idx + 1}. ${race.ageGroupPoints} points`);
  });
  console.log(`   Total: ${totalAgeGroupPoints} points`);
  
  // Check what's in database
  const dbStanding = await sql`
    SELECT total_points, overall_points, age_group_points, races_participated
    FROM series_standings ss
    WHERE ss.series_registration_id = ${registrationId}
  `;
  
  console.log(`\n🗄️  Database vs Calculated:`);
  console.log(`   DB Overall: ${dbStanding[0].overall_points} | Calculated: ${totalOverallPoints}`);
  console.log(`   DB Age Group: ${dbStanding[0].age_group_points} | Calculated: ${totalAgeGroupPoints}`);
  console.log(`   DB Total: ${dbStanding[0].total_points} | Expected: ${totalOverallPoints} (overall only)`);
  
  if (dbStanding[0].overall_points !== totalOverallPoints) {
    console.log(`❌ OVERALL MISMATCH!`);
  }
  
  if (dbStanding[0].age_group_points !== totalAgeGroupPoints) {
    console.log(`❌ AGE GROUP MISMATCH!`);
  }
  
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  debugQLogic().catch(console.error);
}
