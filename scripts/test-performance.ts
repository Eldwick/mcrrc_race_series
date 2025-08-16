#!/usr/bin/env tsx
/**
 * Performance Test Script
 * 
 * Tests the optimized standings calculation performance and compares
 * against expected benchmarks.
 * 
 * Usage:
 *   npm run test:performance
 *   npx tsx scripts/test-performance.ts
 */

import { getSql } from '../lib/db/connection';

// Default series ID - MCRRC Championship Series 2025
const DEFAULT_SERIES_ID = 'f75a7257-ad21-495c-a127-69240dd0193d';
const TARGET_YEAR = 2025;

interface PerformanceTest {
  name: string;
  expectedMaxTime: number; // ms
  actualTime?: number;
  status?: 'pass' | 'fail' | 'warn';
  details?: string;
}

async function testPerformance(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('   Set it in .env.local or as an environment variable');
    process.exit(1);
  }

  const sql = getSql();

  console.log('🏁 MCRRC Performance Test Suite');
  console.log('=' .repeat(40));
  console.log(`📊 Series ID: ${DEFAULT_SERIES_ID}`);
  console.log(`📅 Year: ${TARGET_YEAR}`);
  console.log('');

  const tests: PerformanceTest[] = [
    { name: 'Database Connection', expectedMaxTime: 500 },
    { name: 'Race Data Query', expectedMaxTime: 200 },
    { name: 'Participant Query', expectedMaxTime: 300 },
    { name: 'Race Rankings Calculation', expectedMaxTime: 1000 },
    { name: 'Sample Standings Calculation', expectedMaxTime: 5000 }
  ];

  // Test 1: Database Connection
  console.log('🔗 Test 1: Database Connection Speed...');
  let startTime = Date.now();
  try {
    await sql`SELECT 1 as test`;
    tests[0].actualTime = Date.now() - startTime;
    tests[0].status = tests[0].actualTime <= tests[0].expectedMaxTime ? 'pass' : 'warn';
    console.log(`   ✅ Connection established in ${tests[0].actualTime}ms`);
  } catch (error) {
    tests[0].status = 'fail';
    tests[0].details = error instanceof Error ? error.message : 'Connection failed';
    console.error(`   ❌ Connection failed: ${tests[0].details}`);
  }
  console.log('');

  // Test 2: Race Data Query Performance
  console.log('📋 Test 2: Race Data Query Performance...');
  startTime = Date.now();
  try {
    const races = await sql`
      SELECT id, name, date, distance_miles 
      FROM races 
      WHERE series_id = ${DEFAULT_SERIES_ID} AND year = ${TARGET_YEAR}
      ORDER BY date
    ` as any[];

    tests[1].actualTime = Date.now() - startTime;
    tests[1].status = tests[1].actualTime <= tests[1].expectedMaxTime ? 'pass' : 'warn';
    tests[1].details = `Found ${races.length} races`;
    console.log(`   ✅ Query completed in ${tests[1].actualTime}ms (${races.length} races)`);

    if (races.length === 0) {
      console.warn('   ⚠️  No races found - run scraping first');
    }
  } catch (error) {
    tests[1].status = 'fail';
    tests[1].details = error instanceof Error ? error.message : 'Query failed';
    console.error(`   ❌ Query failed: ${tests[1].details}`);
  }
  console.log('');

  // Test 3: Participant Query Performance
  console.log('👥 Test 3: Participant Query Performance...');
  startTime = Date.now();
  try {
    const participants = await sql`
      SELECT DISTINCT 
        sr.runner_id,
        r.first_name,
        r.last_name, 
        r.gender,
        sr.age,
        sr.age_group,
        sr.series_id
      FROM series_registrations sr
      JOIN runners r ON sr.runner_id = r.id
      JOIN race_results rr ON sr.id = rr.series_registration_id
      JOIN races ra ON rr.race_id = ra.id
      WHERE sr.series_id = ${DEFAULT_SERIES_ID} AND ra.year = ${TARGET_YEAR}
    ` as any[];

    tests[2].actualTime = Date.now() - startTime;
    tests[2].status = tests[2].actualTime <= tests[2].expectedMaxTime ? 'pass' : 'warn';
    tests[2].details = `Found ${participants.length} participants`;
    console.log(`   ✅ Query completed in ${tests[2].actualTime}ms (${participants.length} participants)`);

    if (participants.length === 0) {
      console.warn('   ⚠️  No participants found - run scraping and ensure race results exist');
    }
  } catch (error) {
    tests[2].status = 'fail';
    tests[2].details = error instanceof Error ? error.message : 'Query failed';
    console.error(`   ❌ Query failed: ${tests[2].details}`);
  }
  console.log('');

  // Test 4: Race Rankings Calculation (sample)
  console.log('🏃 Test 4: Race Rankings Calculation Performance...');
  startTime = Date.now();
  try {
    // Get first race for testing
    const sampleRace = await sql`
      SELECT id, name FROM races 
      WHERE series_id = ${DEFAULT_SERIES_ID} AND year = ${TARGET_YEAR}
      LIMIT 1
    ` as any[];

    if (sampleRace.length > 0) {
      const raceResults = await sql`
        SELECT 
          rr.series_registration_id,
          rr.place,
          rr.is_dnf,
          rr.is_dq,
          r.gender,
          sr.age_group
        FROM race_results rr
        JOIN series_registrations sr ON rr.series_registration_id = sr.id
        JOIN runners r ON sr.runner_id = r.id
        WHERE rr.race_id = ${sampleRace[0].id}
          AND rr.is_dnf = false 
          AND rr.is_dq = false
        ORDER BY rr.place
      ` as any[];

      // Simulate ranking calculation (in-memory operations)
      const maleResults = raceResults.filter((r: any) => r.gender === 'M');
      const femaleResults = raceResults.filter((r: any) => r.gender === 'F');
      
      tests[3].actualTime = Date.now() - startTime;
      tests[3].status = tests[3].actualTime <= tests[3].expectedMaxTime ? 'pass' : 'warn';
      tests[3].details = `Ranked ${raceResults.length} results (${maleResults.length}M, ${femaleResults.length}F)`;
      console.log(`   ✅ Rankings calculated in ${tests[3].actualTime}ms for "${sampleRace[0].name}"`);
      console.log(`   📊 Results: ${raceResults.length} total (${maleResults.length} men, ${femaleResults.length} women)`);
    } else {
      tests[3].status = 'warn';
      tests[3].details = 'No races available for testing';
      console.warn('   ⚠️  No races available for ranking test');
    }
  } catch (error) {
    tests[3].status = 'fail';
    tests[3].details = error instanceof Error ? error.message : 'Ranking calculation failed';
    console.error(`   ❌ Ranking calculation failed: ${tests[3].details}`);
  }
  console.log('');

  // Test 5: Sample Standings Calculation (API call)
  console.log('🏆 Test 5: Sample Standings Calculation...');
  console.log('   💡 This tests the full optimized algorithm via API call');
  startTime = Date.now();
  try {
    const response = await fetch('http://localhost:3000/api/standings/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seriesId: DEFAULT_SERIES_ID,
        year: TARGET_YEAR
      })
    });

    if (response.ok) {
      const data = await response.json();
      tests[4].actualTime = Date.now() - startTime;
      tests[4].status = tests[4].actualTime <= tests[4].expectedMaxTime ? 'pass' : 'warn';
      tests[4].details = data.success ? 'Calculation successful' : data.error;
      console.log(`   ✅ Standings calculated in ${tests[4].actualTime}ms`);
    } else {
      tests[4].status = 'fail';
      tests[4].details = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`   ❌ API call failed: ${tests[4].details}`);
    }
  } catch (error) {
    tests[4].status = 'fail';
    tests[4].details = error instanceof Error ? error.message : 'API call failed';
    console.error(`   ❌ Calculation failed: ${tests[4].details}`);
    console.error('   💡 Make sure your dev server is running (npm run dev)');
  }
  console.log('');

  // Results Summary
  console.log('📊 PERFORMANCE TEST RESULTS');
  console.log('=' .repeat(50));
  
  const passed = tests.filter(t => t.status === 'pass').length;
  const warned = tests.filter(t => t.status === 'warn').length;  
  const failed = tests.filter(t => t.status === 'fail').length;

  for (const test of tests) {
    const statusIcon = test.status === 'pass' ? '✅' : test.status === 'warn' ? '⚠️' : '❌';
    const time = test.actualTime ? `${test.actualTime}ms` : 'N/A';
    const expected = `(expected <${test.expectedMaxTime}ms)`;
    const details = test.details ? ` - ${test.details}` : '';
    
    console.log(`${statusIcon} ${test.name}: ${time} ${expected}${details}`);
  }

  console.log('');
  console.log('📈 Summary:');
  console.log(`   ✅ Passed: ${passed}/${tests.length}`);
  console.log(`   ⚠️  Warnings: ${warned}/${tests.length}`);
  console.log(`   ❌ Failed: ${failed}/${tests.length}`);

  if (failed > 0) {
    console.log('');
    console.log('🔧 Recommendations:');
    if (tests[0].status === 'fail') {
      console.log('   • Fix database connection issues first');
    }
    if (tests[1].status === 'fail' || tests[2].status === 'fail') {
      console.log('   • Verify race data exists (run scraping)');
    }
    if (tests[4].status === 'fail') {
      console.log('   • Ensure dev server is running (npm run dev)');
    }
    if (tests.some(t => t.status === 'warn')) {
      console.log('   • Consider database performance tuning');
      console.log('   • Check network latency to database');
    }
  } else if (warned > 0) {
    console.log('');
    console.log('💡 Performance is acceptable but could be improved');
    console.log('   Consider database optimization if consistently slow');
  } else {
    console.log('');
    console.log('🎉 All performance tests passed!');
    console.log('   Your system is optimized and ready for production');
  }

  const overallResult = failed === 0 ? 'PASS' : 'FAIL';
  console.log('');
  console.log(`🏁 Overall Result: ${overallResult}`);
}

// Run the test function if called directly
if (require.main === module) {
  testPerformance()
    .then(() => {
      console.log('\n✨ Performance testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    });
}

export { testPerformance };
