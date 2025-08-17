import { getSql } from '../lib/db/connection.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupCompleteSystem() {
  console.log('🚀 Setting up complete MCRRC Championship Series system...\n');
  
  const sql = getSql();
  
  try {
    // Step 1: Verify database schema is ready
    console.log('1️⃣ Verifying database schema...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('series', 'runners', 'races', 'planned_races', 'series_registrations', 'race_results', 'series_standings')
      ORDER BY table_name
    `;
    console.log(`   ✅ Found ${tables.length}/7 required tables`);
    
    if (tables.length < 7) {
      console.log('   ❌ Missing required tables. Please run migrations first.');
      process.exit(1);
    }
    
    // Step 2: Seed planned championship series races
    console.log('\n2️⃣ Seeding planned championship series races...');
    const { stdout: seedOutput } = await execAsync('npm run seed:races:planned-only', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log(seedOutput);
    
    // Step 3: Scrape completed race data
    console.log('\n3️⃣ Scraping completed race data...');
    const { stdout: scrapeOutput } = await execAsync('npm run seed:races:scrape', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log(scrapeOutput);
    
    // Step 4: Calculate MCRRC standings
    console.log('\n4️⃣ Calculating MCRRC standings...');
    const { stdout: standingsOutput } = await execAsync('npm run calculate:standings', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log(standingsOutput);
    
    // Step 5: Verify system is working
    console.log('\n5️⃣ Verifying system setup...');
    
    // Check planned races
    const plannedRaces = await sql`SELECT COUNT(*) as count FROM planned_races`;
    console.log(`   📋 Planned races: ${plannedRaces[0].count}`);
    
    // Check scraped races
    const scrapedRaces = await sql`SELECT COUNT(*) as count FROM races`;
    console.log(`   🏁 Scraped races: ${scrapedRaces[0].count}`);
    
    // Check runners
    const runners = await sql`SELECT COUNT(*) as count FROM runners`;
    console.log(`   🏃 Total runners: ${runners[0].count}`);
    
    // Check race results
    const results = await sql`SELECT COUNT(*) as count FROM race_results`;
    console.log(`   📊 Total results: ${results[0].count}`);
    
    // Check standings
    const standings = await sql`SELECT COUNT(*) as count FROM series_standings`;
    console.log(`   🏆 Calculated standings: ${standings[0].count}`);
    
    // Check top 5 overall standings
    console.log('\n🏆 Top 5 Overall Standings:');
    const topStandings = await sql`
      SELECT 
        r.first_name,
        r.last_name,
        s.overall_points,
        s.age_group_points,
        s.races_participated,
        s.overall_rank
      FROM series_standings s
      JOIN runners r ON s.runner_id = r.id
      WHERE s.year = 2025 
      AND s.gender = 'M'
      AND s.category = 'overall_gender'
      ORDER BY s.overall_rank
      LIMIT 5
    `;
    
    topStandings.forEach((standing, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '   ';
      console.log(`   ${emoji} #${standing.overall_rank} ${standing.first_name} ${standing.last_name} - ${standing.overall_points} pts (${standing.races_participated} races)`);
    });
    
    console.log('\n🎉 SYSTEM SETUP COMPLETE!');
    console.log('📝 Next steps:');
    console.log('   • Start frontend: npm run dev');
    console.log('   • Visit leaderboard: http://localhost:3001/leaderboard');
    console.log('   • Visit races: http://localhost:3001/races');
    console.log('   • Visit runners: http://localhost:3001/runners');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupCompleteSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 System setup failed:', error);
      process.exit(1);
    });
}

export { setupCompleteSystem };
