#!/usr/bin/env tsx
/**
 * Debug Race Results and Runner Linkage
 * 
 * Checks if race results are properly linked to runners
 */

import { getSql } from '../lib/db/connection';

async function debugRaceResults(): Promise<void> {
  console.log('🔍 Debugging Race Results and Runner Linkage');
  console.log('=' .repeat(50));
  
  const sql = getSql();
  
  try {
    // Check race results and their runner IDs
    console.log('1. Checking race results with runner info...');
    const raceResults = await sql`
      SELECT 
        rr.id as result_id,
        rr.race_id,
        sr.runner_id,
        r.first_name,
        r.last_name,
        r.id as actual_runner_id
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      LEFT JOIN runners r ON sr.runner_id = r.id
      LIMIT 5
    `;
    console.log('Race results sample:', raceResults);
    
    // Count missing runners
    console.log('\n2. Counting missing runners...');
    const missingRunners = await sql`
      SELECT COUNT(*) as missing_count
      FROM race_results rr
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      LEFT JOIN runners r ON sr.runner_id = r.id
      WHERE r.id IS NULL
    `;
    console.log('Missing runners:', missingRunners);
    
    // Check what runners do exist
    console.log('\n3. Sample of existing runners...');
    const existingRunners = await sql`
      SELECT id, first_name, last_name, is_active
      FROM runners
      LIMIT 5
    `;
    console.log('Existing runners:', existingRunners);
    
    // Find a valid runner that has race results
    console.log('\n4. Finding valid runners with race results...');
    const validRunners = await sql`
      SELECT DISTINCT
        r.id,
        r.first_name,
        r.last_name,
        COUNT(rr.id) as race_count
      FROM runners r
      JOIN series_registrations sr ON r.id = sr.runner_id
      JOIN race_results rr ON sr.id = rr.series_registration_id
      GROUP BY r.id, r.first_name, r.last_name
      ORDER BY race_count DESC
      LIMIT 3
    `;
    console.log('Valid runners with race results:', validRunners);
    
    if (validRunners.length > 0) {
      const testRunnerId = validRunners[0].id;
      console.log(`\n5. Testing API with valid runner ID: ${testRunnerId}`);
      
      // Test the getRunnerById function
      const { getRunnerById } = await import('../lib/db/utils');
      const runner = await getRunnerById(testRunnerId);
      console.log('getRunnerById result:', runner);
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug function if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugRaceResults()
    .then(() => {
      console.log('\n✨ Debug complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

export { debugRaceResults };
