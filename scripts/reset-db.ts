#!/usr/bin/env tsx
import 'dotenv/config';
import { getSql } from '../lib/db/connection.js';

async function resetDb() {
  const sql = getSql();
  console.log('⚠️  Resetting database: truncating dynamic tables (keeping race_courses)...');
  try {
    await sql`BEGIN`;

    // Disable referential integrity checks if needed (optional for Neon/Postgres with CASCADE)
    // await sql`SET session_replication_role = replica`;

    // Truncate dynamic data tables; keep race_courses intact
    await sql`
      TRUNCATE TABLE 
        race_results, 
        series_standings, 
        qualifying_races, 
        series_registrations, 
        races, 
        planned_races, 
        runners, 
        series
      RESTART IDENTITY CASCADE
    `;

    // Re-enable referential integrity
    // await sql`SET session_replication_role = DEFAULT`;

    await sql`COMMIT`;
    console.log('✅ Database reset complete.');

    // Quick sanity check counts
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM series) as series,
        (SELECT COUNT(*) FROM runners) as runners,
        (SELECT COUNT(*) FROM races) as races,
        (SELECT COUNT(*) FROM planned_races) as planned_races,
        (SELECT COUNT(*) FROM series_registrations) as registrations,
        (SELECT COUNT(*) FROM race_results) as results,
        (SELECT COUNT(*) FROM series_standings) as standings,
        (SELECT COUNT(*) FROM race_courses) as race_courses
    ` as any[];

    const c = counts[0];
    console.log(`   series: ${c.series}`);
    console.log(`   runners: ${c.runners}`);
    console.log(`   races: ${c.races}`);
    console.log(`   planned_races: ${c.planned_races}`);
    console.log(`   registrations: ${c.registrations}`);
    console.log(`   results: ${c.results}`);
    console.log(`   standings: ${c.standings}`);
    console.log(`   race_courses: ${c.race_courses} (preserved)`);
  } catch (err) {
    await sql`ROLLBACK`;
    console.error('❌ Failed to reset database:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetDb().then(() => process.exit(0));
}

export { resetDb };


