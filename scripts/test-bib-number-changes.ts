#!/usr/bin/env tsx

/**
 * Test Script: Bib Number Changes
 * 
 * This script tests the system's ability to handle runners who change
 * bib numbers during a race series. It creates test data and verifies
 * that points are properly aggregated across multiple bib numbers.
 */

import { getSql } from '../lib/db/connection.js';
import { calculateMCRRCStandings } from '../lib/db/utils.js';

interface TestRunner {
  id?: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  birthYear: number;
  club: string;
  bibNumbers: string[]; // Multiple bib numbers for testing
}

interface TestRace {
  id?: string;
  name: string;
  date: string;
  distanceMiles: number;
  location: string;
}

async function testBibNumberChanges() {
  const sql = getSql();
  console.log('🧪 Testing Bib Number Changes\n');

  try {
    // Step 1: Create test series
    console.log('📊 Step 1: Creating test series...');
    const testSeries = await sql`
      INSERT INTO series (name, year, description, is_active)
      VALUES ('Test Bib Changes Series', 2024, 'Test series for bib number changes', true)
      RETURNING id
    `;
    const seriesId = testSeries[0].id;
    console.log(`   ✅ Created test series: ${seriesId}\n`);

    // Step 2: Create test runners
    console.log('👥 Step 2: Creating test runners...');
    const testRunners: TestRunner[] = [
      {
        firstName: 'Alice',
        lastName: 'Runner',
        gender: 'F',
        birthYear: 1985,
        club: 'MCRRC',
        bibNumbers: ['100', '200'] // Alice changes from bib 100 to 200
      },
      {
        firstName: 'Bob',
        lastName: 'Sprinter',
        gender: 'M',
        birthYear: 1990,
        club: 'MCRRC',
        bibNumbers: ['101'] // Bob keeps same bib
      }
    ];

    for (const runner of testRunners) {
      const result = await sql`
        INSERT INTO runners (first_name, last_name, gender, birth_year, club)
        VALUES (${runner.firstName}, ${runner.lastName}, ${runner.gender}, ${runner.birthYear}, ${runner.club})
        RETURNING id
      `;
      runner.id = result[0].id;
      console.log(`   ✅ Created runner: ${runner.firstName} ${runner.lastName} (${runner.id})`);
    }
    console.log('');

    // Step 3: Create test races
    console.log('🏁 Step 3: Creating test races...');
    const testRaces: TestRace[] = [
      {
        name: 'Spring Test Race',
        date: '2024-04-15',
        distanceMiles: 5.0,
        location: 'Test Park'
      },
      {
        name: 'Summer Test Race',
        date: '2024-07-15',
        distanceMiles: 10.0,
        location: 'Test Trail'
      }
    ];

    for (const race of testRaces) {
      const result = await sql`
        INSERT INTO races (series_id, name, date, year, distance_miles, location)
        VALUES (${seriesId}, ${race.name}, ${race.date}, 2024, ${race.distanceMiles}, ${race.location})
        RETURNING id
      `;
      race.id = result[0].id;
      console.log(`   ✅ Created race: ${race.name} (${race.id})`);
    }
    console.log('');

    // Step 4: Create series registrations with bib number changes
    console.log('🎫 Step 4: Creating series registrations...');
    
    // Alice: bib 100 for first race, bib 200 for second race
    const alice = testRunners[0];
    await sql`
      INSERT INTO series_registrations (series_id, runner_id, bib_number, age, age_group)
      VALUES (${seriesId}, ${alice.id}, ${alice.bibNumbers[0]}, 39, '35-39')
    `;
    console.log(`   ✅ ${alice.firstName}: Registration with bib ${alice.bibNumbers[0]}`);

    await sql`
      INSERT INTO series_registrations (series_id, runner_id, bib_number, age, age_group)
      VALUES (${seriesId}, ${alice.id}, ${alice.bibNumbers[1]}, 39, '35-39')
    `;
    console.log(`   ✅ ${alice.firstName}: Registration with bib ${alice.bibNumbers[1]} (changed bib!)`);

    // Bob: single bib for both races
    const bob = testRunners[1];
    await sql`
      INSERT INTO series_registrations (series_id, runner_id, bib_number, age, age_group)
      VALUES (${seriesId}, ${bob.id}, ${bob.bibNumbers[0]}, 34, '30-34')
    `;
    console.log(`   ✅ ${bob.firstName}: Registration with bib ${bob.bibNumbers[0]}`);
    console.log('');

    // Step 5: Create race results
    console.log('🏆 Step 5: Creating race results...');
    
    // Get registration IDs
    const aliceReg1 = await sql`SELECT id FROM series_registrations WHERE series_id = ${seriesId} AND runner_id = ${alice.id} AND bib_number = ${alice.bibNumbers[0]}`;
    const aliceReg2 = await sql`SELECT id FROM series_registrations WHERE series_id = ${seriesId} AND runner_id = ${alice.id} AND bib_number = ${alice.bibNumbers[1]}`;
    const bobReg = await sql`SELECT id FROM series_registrations WHERE series_id = ${seriesId} AND runner_id = ${bob.id} AND bib_number = ${bob.bibNumbers[0]}`;

    // Race 1 results: Alice with bib 100 wins, Bob second
    await sql`
      INSERT INTO race_results (race_id, series_registration_id, place, place_gender, place_age_group, gun_time)
      VALUES (${testRaces[0].id}, ${aliceReg1[0].id}, 1, 1, 1, INTERVAL '25:30')
    `;
    console.log(`   ✅ Race 1: ${alice.firstName} (bib ${alice.bibNumbers[0]}) - 1st place`);

    await sql`
      INSERT INTO race_results (race_id, series_registration_id, place, place_gender, place_age_group, gun_time)
      VALUES (${testRaces[0].id}, ${bobReg[0].id}, 2, 1, 1, INTERVAL '26:15')
    `;
    console.log(`   ✅ Race 1: ${bob.firstName} (bib ${bob.bibNumbers[0]}) - 2nd place`);

    // Race 2 results: Alice with bib 200 wins again, Bob second
    await sql`
      INSERT INTO race_results (race_id, series_registration_id, place, place_gender, place_age_group, gun_time)
      VALUES (${testRaces[1].id}, ${aliceReg2[0].id}, 1, 1, 1, INTERVAL '50:45')
    `;
    console.log(`   ✅ Race 2: ${alice.firstName} (bib ${alice.bibNumbers[1]}) - 1st place`);

    await sql`
      INSERT INTO race_results (race_id, series_registration_id, place, place_gender, place_age_group, gun_time)
      VALUES (${testRaces[1].id}, ${bobReg[0].id}, 2, 1, 1, INTERVAL '52:30')
    `;
    console.log(`   ✅ Race 2: ${bob.firstName} (bib ${bob.bibNumbers[0]}) - 2nd place`);
    console.log('');

    // Step 6: Calculate standings
    console.log('📊 Step 6: Calculating standings...');
    await calculateMCRRCStandings(seriesId, 2024);
    console.log('');

    // Step 7: Verify results
    console.log('✅ Step 7: Verifying aggregated results...');
    const standings = await sql`
      SELECT 
        r.first_name,
        r.last_name,
        ss.total_overall_points,
        ss.total_age_group_points,
        ss.races_participated,
        ss.overall_rank
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE sr.series_id = ${seriesId}
      ORDER BY ss.overall_rank
    ` as any[];

    if (standings.length === 0) {
      console.log('   ❌ No standings found - check calculation');
      return;
    }

    console.log('\n📈 Final Standings:');
    standings.forEach((standing: any, index: number) => {
      console.log(`   ${index + 1}. ${standing.first_name} ${standing.last_name}`);
      console.log(`      Overall Points: ${standing.total_overall_points}`);
      console.log(`      Age Group Points: ${standing.total_age_group_points}`);
      console.log(`      Races: ${standing.races_participated}`);
    });

    // Check if Alice's results were properly aggregated
    const aliceStanding = standings.find((s: any) => s.first_name === 'Alice');
    if (aliceStanding && aliceStanding.races_participated === 2) {
      console.log('\n🎉 SUCCESS: Alice\'s results from both bib numbers were aggregated!');
      console.log(`   Alice participated in ${aliceStanding.races_participated} races across 2 different bib numbers`);
    } else {
      console.log('\n❌ FAILURE: Alice\'s results were not properly aggregated');
      console.log(`   Expected: 2 races, Got: ${aliceStanding?.races_participated || 'unknown'}`);
    }

    // Step 8: Check for duplicate standings (would indicate the bug exists)
    const duplicateCheck = await sql`
      SELECT r.first_name, r.last_name, COUNT(*) as standing_count
      FROM series_standings ss
      JOIN series_registrations sr ON ss.series_registration_id = sr.id
      JOIN runners r ON sr.runner_id = r.id
      WHERE sr.series_id = ${seriesId}
      GROUP BY r.id, r.first_name, r.last_name
      HAVING COUNT(*) > 1
    ` as any[];

    if (duplicateCheck.length > 0) {
      console.log('\n⚠️  WARNING: Found duplicate standings (indicates the old bug):');
      duplicateCheck.forEach((dup: any) => {
        console.log(`   ${dup.first_name} ${dup.last_name}: ${dup.standing_count} standings`);
      });
    } else {
      console.log('\n✅ No duplicate standings found - system working correctly!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      // Delete in reverse order due to foreign key constraints
      await sql`DELETE FROM series WHERE name = 'Test Bib Changes Series'`;
      console.log('   ✅ Cleanup completed');
    } catch (cleanupError) {
      console.error('   ❌ Cleanup failed:', cleanupError);
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testBibNumberChanges().catch(console.error);
}

export { testBibNumberChanges };
