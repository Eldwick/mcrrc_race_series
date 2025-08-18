#!/usr/bin/env tsx

import 'dotenv/config';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getSql } from '../lib/db/connection.js';
import { calculateMCRRCStandings } from '../lib/db/utils.js';

const execAsync = promisify(exec);

async function run(cmd: string) {
  const { stdout, stderr } = await execAsync(cmd, { env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL } });
  if (stdout) console.log(stdout.trim());
  if (stderr) console.error(stderr.trim());
}

async function main() {
  console.log('🚀 Setting up system with historical data...');

  const args = process.argv.slice(2);
  const doMigrate = args.includes('--migrate');
  const historicalMode = args.includes('--recent')
    ? 'recent'
    : args.includes('--2023-only')
    ? '2023'
    : args.includes('--before2023')
    ? 'before2023'
    : 'all';

  const sql = getSql();

  try {
    if (doMigrate) {
      console.log('\n1️⃣ Running DB migrations...');
      await run('npm run -s migrate');
    }

    console.log('\n2️⃣ Seeding planned championship series races (current year)...');
    await run('npm run -s seed:races:planned-only');

    console.log('\n3️⃣ Scraping completed current-year race data...');
    await run('npm run -s seed:races:scrape');

    console.log('\n4️⃣ Scraping historical race results...');
    if (historicalMode === 'recent') {
      await run('npm run -s scrape:historical:results:recent');
    } else if (historicalMode === '2023') {
      await run('npm run -s scrape:historical:results:2023');
    } else if (historicalMode === 'before2023') {
      await run('npm run -s scrape:historical:results:before2023');
    } else {
      await run('npm run -s scrape:historical:results');
    }

    console.log('\n5️⃣ Linking races to courses...');
    await run('npm run -s link:courses');

    console.log('\n6️⃣ Calculating standings for all available series...');
    const seriesRows = (await sql`
      SELECT id, year FROM series WHERE name = 'MCRRC Championship Series' ORDER BY year
    `) as Array<{ id: string; year: number }>;

    for (const s of seriesRows) {
      console.log(`   📅 Calculating standings for ${s.year}...`);
      await calculateMCRRCStandings(s.id, s.year);
    }

    console.log('\n7️⃣ Summary checks...');
    const races = await sql`SELECT COUNT(*) AS c FROM races`;
    const results = await sql`SELECT COUNT(*) AS c FROM race_results`;
    const runners = await sql`SELECT COUNT(*) AS c FROM runners`;
    const standings = await sql`SELECT COUNT(*) AS c FROM series_standings`;
    console.log(`   🏁 Races: ${races[0].c}`);
    console.log(`   📊 Results: ${results[0].c}`);
    console.log(`   🏃 Runners: ${runners[0].c}`);
    console.log(`   🏆 Standings: ${standings[0].c}`);

    console.log('\n🎉 Setup with historical data complete!');
    console.log('Usage:');
    console.log('  • npm run dev (start frontend)');
  } catch (err: any) {
    console.error('❌ Setup failed:', err?.message || err);
    if (err?.stdout) console.log('stdout:', err.stdout);
    if (err?.stderr) console.log('stderr:', err.stderr);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as setupWithHistory };


