#!/usr/bin/env tsx
/**
 * Calculate MCRRC Championship Series Standings for ALL years
 *
 * Usage:
 *   npm run calculate:standings:all
 *   npx tsx scripts/calculate-standings-all-years.ts
 */

import 'dotenv/config';
import { getSql } from '../lib/db/connection.js';
import { calculateMCRRCStandings } from '../lib/db/utils.js';

interface SeriesRow {
  id: string;
  name: string;
  year: number;
}

async function calculateAllYears(): Promise<void> {
  const sql = getSql();
  const startedAt = Date.now();

  console.log('🏆 Calculating standings for ALL years...');
  console.log('');

  // Get all series (distinct name/year)
  const seriesRows = await sql`
    SELECT id, name, year
    FROM series
    ORDER BY year ASC
  ` as SeriesRow[];

  if (!seriesRows || seriesRows.length === 0) {
    console.log('❌ No series found. Nothing to calculate.');
    return;
  }

  console.log(`📚 Found ${seriesRows.length} series years`);
  console.log('');

  let successes = 0;
  let failures = 0;

  for (const s of seriesRows) {
    const yearStart = Date.now();
    console.log('==============================');
    console.log(`📅 Year ${s.year} — ${s.name} (ID: ${s.id})`);

    try {
      // Quick check: skip if no race results exist for this series/year
      const counts = await sql`
        SELECT COUNT(*) AS cnt
        FROM race_results rr
        JOIN series_registrations sr ON rr.series_registration_id = sr.id
        JOIN races r ON rr.race_id = r.id
        WHERE sr.series_id = ${s.id} AND r.year = ${s.year}
      ` as Array<{ cnt: string }>;

      const resultCount = parseInt(counts[0]?.cnt || '0', 10);
      if (resultCount === 0) {
        console.log('⚠️  Skipping — no race results for this year');
        continue;
      }

      console.log(`   📊 Race results present: ${resultCount}`);
      console.log('   ⏳ Calculating...');

      await calculateMCRRCStandings(s.id, s.year);

      const dur = Date.now() - yearStart;
      console.log(`✅ Done year ${s.year} in ${Math.round(dur / 1000)}s`);
      successes++;
    } catch (err: any) {
      failures++;
      const dur = Date.now() - yearStart;
      console.error(`❌ Failed year ${s.year} after ${Math.round(dur / 1000)}s: ${err?.message || err}`);
    }
  }

  const totalDur = Date.now() - startedAt;
  console.log('');
  console.log('==============================');
  console.log('🎉 Standings calculation complete for ALL years');
  console.log(`✅ Successes: ${successes}`);
  console.log(`❌ Failures : ${failures}`);
  console.log(`⏱️  Total time: ${Math.round(totalDur / 1000)}s`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  calculateAllYears()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('💥 Fatal error:', err);
      process.exit(1);
    });
}


