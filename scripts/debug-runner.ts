#!/usr/bin/env tsx
/**
 * Debug Runner Lookup
 * 
 * Tests if a specific runner can be found in the database
 */

import { getSql } from '../lib/db/connection';
import { getRunnerById } from '../lib/db/utils';

async function debugRunner(): Promise<void> {
  console.log('🔍 Debugging Runner Lookup');
  console.log('=' .repeat(50));
  
  const runnerId = '4cd748fd-0704-44d0-bc9d-a294b7623d3a';
  console.log(`Looking for runner: ${runnerId}`);
  
  const sql = getSql();
  
  try {
    // First, check if runner exists in runners table at all
    console.log('\n1. Checking runners table...');
    const runnerCheck = await sql`
      SELECT id, first_name, last_name, is_active
      FROM runners 
      WHERE id = ${runnerId}
    `;
    console.log(`Found ${runnerCheck.length} rows in runners table:`, runnerCheck);
    
    // Check series_registrations for this runner
    console.log('\n2. Checking series_registrations...');
    const regCheck = await sql`
      SELECT sr.*, s.name as series_name, s.year
      FROM series_registrations sr
      LEFT JOIN series s ON sr.series_id = s.id
      WHERE sr.runner_id = ${runnerId}
    `;
    console.log(`Found ${regCheck.length} registrations:`, regCheck);
    
    // Check race_results for this runner
    console.log('\n3. Checking race_results...');
    const resultsCheck = await sql`
      SELECT rr.*, ra.name as race_name
      FROM race_results rr
      JOIN races ra ON rr.race_id = ra.id
      JOIN series_registrations sr ON rr.series_registration_id = sr.id
      WHERE sr.runner_id = ${runnerId}
      LIMIT 3
    `;
    console.log(`Found ${resultsCheck.length} race results:`, resultsCheck);
    
    // Now try the getRunnerById function
    console.log('\n4. Testing getRunnerById function...');
    const runner = await getRunnerById(runnerId);
    console.log('getRunnerById result:', runner);
    
    if (!runner) {
      console.log('\n🔍 Let\'s try the full query manually...');
      const fullQuery = await sql`
        SELECT 
          r.*,
          sr.bib_number,
          sr.age,
          sr.age_group,
          s.year,
          s.name as series_name,
          COALESCE(race_counts.race_count, 0) as race_count
        FROM runners r
        LEFT JOIN series_registrations sr ON r.id = sr.runner_id
        LEFT JOIN series s ON sr.series_id = s.id
        LEFT JOIN (
          SELECT 
            sr2.runner_id,
            COUNT(DISTINCT rr.race_id) as race_count
          FROM series_registrations sr2
          JOIN race_results rr ON sr2.id = rr.series_registration_id
          JOIN races ra ON rr.race_id = ra.id
          WHERE ra.year = EXTRACT(year FROM CURRENT_DATE)
          GROUP BY sr2.runner_id
        ) race_counts ON r.id = race_counts.runner_id
        WHERE r.id = ${runnerId}
        ORDER BY s.year DESC, sr.created_at DESC
        LIMIT 1
      `;
      console.log('Manual query result:', fullQuery);
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug function if called directly
if (require.main === module) {
  debugRunner()
    .then(() => {
      console.log('\n✨ Debug complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

export { debugRunner };
