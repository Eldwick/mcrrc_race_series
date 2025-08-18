#!/usr/bin/env tsx
/**
 * Seed Championship Series Races (TypeScript version)
 * 
 * This script seeds the 2025 MCRRC Championship Series races based on the official list from:
 * https://mcrrc.org/club-race-series/championship-series-cs/
 * 
 * Usage:
 *   npm run seed:races
 *   npx tsx scripts/seed-championship-series-races.ts
 * 
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 */
import 'dotenv/config';
import { getSql } from '../lib/db/connection';
import { mcrrcScraper } from '../lib/scraping/mcrrc-scraper';

// Official 2025 MCRRC Championship Series Races
// Source: https://mcrrc.org/club-race-series/championship-series-cs/
interface ChampionshipRace {
  name: string;
  distance: number;
  estimatedMonth: string;
  location: string;
  matchKeywords: string[];
  order: number;
}

// Completed 2025 Championship Series Races (ready to scrape)
interface CompletedRace {
  date: string; // MM/DD format
  name: string;
  url: string;
  order: number;
}

const COMPLETED_RACES_2025: CompletedRace[] = [
  {
    date: "Feb 9",
    name: "Kemp Mill (C)hills 10K", 
    url: "https://mcrrc.org/race-result/kemp-mill-chills-10k-5/",
    order: 1
  },
  {
    date: "Mar 23",
    name: "Piece of Cake 10K",
    url: "https://mcrrc.org/race-result/piece-of-cake-10k-14/",
    order: 2
  },
  {
    date: "Apr 12",
    name: "Capital for a Day 5K",
    url: "https://mcrrc.org/race-result/capital-for-a-day-3/",
    order: 3
  },
  {
    date: "May 26",
    name: "Memorial Day 4 Miler",
    url: "https://mcrrc.org/race-result/memorial-day-4-miler-5/",
    order: 4
  },
  {
    date: "Jul 11",
    name: "Midsummer Night's Mile",
    url: "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-9/",
    order: 5
  },
  {
    date: "Jul 27",
    name: "Riley's Rumble Half Marathon",
    url: "https://mcrrc.org/race-result/rileys-rumble-half-marathon-13/",
    order: 6
  },
  {
    date: "Aug 1",
    name: "Going Green – 2 Mile Run",
    url: "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-6/",
    order: 7
  },
  {
    date: "Aug 9",
    name: "Matthew Henson 5K",
    url: "https://mcrrc.org/race-result/matthew-henson-5k-6/",
    order: 8
  },
];

const CHAMPIONSHIP_SERIES_RACES_2025: ChampionshipRace[] = [
  {
    name: "Kemp Mill (C)hills",
    distance: 6.2, // 10K
    estimatedMonth: "February",
    location: "Kemp Mill, MD",
    // Keywords to match against scraped race names
    matchKeywords: ["kemp mill", "chill", "10k"],
    order: 1
  },
  {
    name: "Piece of Cake",
    distance: 6.2, // 10K
    estimatedMonth: "March", 
    location: "Wheaton, MD",
    matchKeywords: ["piece of cake", "piece", "cake"],
    order: 2
  },
  {
    name: "Capital for a Day",
    distance: 3.1, // 5K
    estimatedMonth: "April",
    location: "Rockville, MD",
    matchKeywords: ["capital for a day", "capital", "rockville"],
    order: 3
  },
  {
    name: "Memorial Day 4 Miler",
    distance: 4.0, // 4 miles
    estimatedMonth: "May",
    location: "TBD",
    matchKeywords: ["memorial day", "4 miler", "4-miler", "4 mile"],
    order: 4
  },
  {
    name: "Midsummer Night's Mile",
    distance: 1.0, // 1 mile
    estimatedMonth: "June",
    location: "Silver Spring, MD",
    matchKeywords: ["midsummer", "night's mile", "nights mile", "1 mile"],
    order: 5
  },
  {
    name: "Riley's Rumble Half Marathon",
    distance: 13.1, // Half marathon
    estimatedMonth: "July",
    location: "Boyds, MD",
    matchKeywords: ["riley", "rumble", "half marathon", "half-marathon"],
    order: 6
  },
  {
    name: "Going Green Track Meet", 
    distance: 2.0, // 2 miles
    estimatedMonth: "August",
    location: "Gaithersburg, MD",
    matchKeywords: ["going green", "green", "2 mile", "track meet"],
    order: 7
  },
  {
    name: "Matthew Henson Trail",
    distance: 3.1, // 5K
    estimatedMonth: "August",
    location: "Silver Spring, MD",
    matchKeywords: ["matthew henson", "henson", "5k", "trail"],
    order: 8
  },
  {
    name: "Eastern County",
    distance: 5.0, // 8K (approximately)
    estimatedMonth: "September",
    location: "Eastern Montgomery County, MD",
    matchKeywords: ["eastern county", "eastern", "8k"],
    order: 9
  },
  {
    name: "Country Road Run",
    distance: 3.1, // 5K
    estimatedMonth: "October", 
    location: "Rural Montgomery County, MD",
    matchKeywords: ["country road", "country", "road run"],
    order: 10
  },
  {
    name: "Turkey Burnoff",
    distance: 10.0, // 10 miles
    estimatedMonth: "November",
    location: "TBD",
    matchKeywords: ["turkey burnoff", "turkey", "burnoff", "10 mile", "10-mile"],
    order: 11
  },
  {
    name: "Jingle Bell Jog",
    distance: 5.0, // 8K (approximately)
    estimatedMonth: "December",
    location: "TBD",
    matchKeywords: ["jingle bell", "jingle", "bell", "jog", "8k"],
    order: 12
  }
];

// Race name mapping for better matching between official names and scraped names
const RACE_NAME_MAPPINGS: Record<string, string[]> = {
  // Official name -> possible scraped name patterns
  "Riley's Rumble Half Marathon": ["riley's rumble half marathon", "riley's rumble half-marathon", "rileys rumble"],
  "Going Green Track Meet": ["mcrrc going green", "going green 2 mile", "going green – 2 mile run"],
  "Matthew Henson Trail": ["matthew henson 5k", "matthew henson trail", "henson 5k"]
};

// Default series ID - MCRRC Championship Series 2025
const DEFAULT_SERIES_ID = 'f75a7257-ad21-495c-a127-69240dd0193d';
const TARGET_YEAR = 2025;

// Database result interfaces
interface DatabaseTable {
  table_name: string;
}

interface DatabaseColumn {
  column_name: string;
}

interface ScrapedRace {
  id: string;
  name: string;
  distance_miles: number;
  planned_race_id: string | null;
}

interface PlannedRace {
  id: string;
  name: string;
  estimated_distance: number;
  status: 'planned' | 'scraped' | 'cancelled';
  series_order: number;
}

interface RaceCount {
  count: string;
}

interface RaceStatusCount {
  status: string;
  count: string;
}

// Helper function to check if a scraped race matches an official race
function findMatchingOfficialRace(scrapedRaceName: string, officialRaces: ChampionshipRace[]): ChampionshipRace | undefined {
  const scrapedName = scrapedRaceName.toLowerCase().trim();
  
  // First try exact mapping
  for (const [officialName, patterns] of Object.entries(RACE_NAME_MAPPINGS)) {
    if (patterns.some(pattern => scrapedName.includes(pattern.toLowerCase()))) {
      return officialRaces.find(race => race.name === officialName);
    }
  }
  
  // Then try keyword matching
  return officialRaces.find(race => {
    return race.matchKeywords.some(keyword => 
      scrapedName.includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(scrapedName.split(' ')[0]) // Match first word
    );
  });
}

// Helper function to check if a planned race already exists
function findExistingPlannedRace(officialRace: ChampionshipRace, existingPlannedRaces: PlannedRace[]): PlannedRace | undefined {
  return existingPlannedRaces.find(planned => 
    planned.name.toLowerCase() === officialRace.name.toLowerCase() ||
    officialRace.matchKeywords.some(keyword => 
      planned.name.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

// Parse command line arguments for options
const args = process.argv.slice(2);
const SCRAPE_COMPLETED = args.includes('--scrape-completed') || args.includes('--scrape');
const SKIP_COMPLETED = args.includes('--skip-scraping') || args.includes('--planned-only');

/**
 * Scrape all completed championship series races
 */
async function scrapeCompletedRaces(seriesId: string): Promise<void> {
  console.log(`🏁 Scraping ${COMPLETED_RACES_2025.length} completed championship series races...`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  const errors: { race: string; error: string }[] = [];

  for (const [index, race] of COMPLETED_RACES_2025.entries()) {
    const raceNum = index + 1;
    try {
      console.log(`🏃 [${raceNum}/${COMPLETED_RACES_2025.length}] Scraping: ${race.name}`);
      console.log(`   📅 Date: ${race.date}, 2025`);
      console.log(`   🔗 URL: ${race.url}`);

      // Use the idempotent scraper
      const scrapedRace = await mcrrcScraper.scrapeRace(race.url);
      await mcrrcScraper.storeRaceData(scrapedRace, seriesId);

      console.log(`   ✅ Success! Found ${scrapedRace.runners.length} runners, ${scrapedRace.results.length} results`);
      successCount++;

      // Add delay between requests to be respectful to MCRRC servers
      if (index < COMPLETED_RACES_2025.length - 1) {
        console.log('   ⏳ Waiting 1 second before next scrape...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 3s to 1s
      }

    } catch (error) {
      console.error(`   ❌ Failed to scrape ${race.name}:`, error instanceof Error ? error.message : error);
      errors.push({
        race: race.name,
        error: error instanceof Error ? error.message : String(error)
      });
      errorCount++;

      // Continue with next race even if this one fails
      console.log('   ⏭️ Continuing with next race...');
    }

    console.log('');
  }

  // Summary
  console.log('📊 Scraping Summary:');
  console.log(`   ✅ Successful: ${successCount}/${COMPLETED_RACES_2025.length} races`);
  console.log(`   ❌ Failed: ${errorCount}/${COMPLETED_RACES_2025.length} races`);

  if (errors.length > 0) {
    console.log('');
    console.log('⚠️ Scraping Errors:');
    for (const error of errors) {
      console.log(`   • ${error.race}: ${error.error}`);
    }
  }

  console.log('');
  console.log(`🎉 Completed race scraping! ${successCount} races successfully processed.`);
}

async function seedChampionshipSeriesRaces(): Promise<void> {
  const sql = getSql();
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('   Set it in .env.local or as an environment variable');
    process.exit(1);
  }

  try {
    console.log('🏃 Seeding MCRRC Championship Series races for 2025...');
    console.log('📊 Source: https://mcrrc.org/club-race-series/championship-series-cs/');
    console.log(`📅 Year: ${TARGET_YEAR}`);
    console.log(`🎯 Target Series: MCRRC Championship Series ${TARGET_YEAR}`);
    
    if (SCRAPE_COMPLETED && !SKIP_COMPLETED) {
      console.log('🌐 Will scrape completed races after seeding planned races');
    } else if (SKIP_COMPLETED) {
      console.log('⏭️ Skipping race scraping (planned races only)');
    } else {
      console.log('💡 Use --scrape-completed flag to automatically scrape completed races');
    }
    console.log('');

    // Verify that required tables exist from migrations
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('planned_races', 'races')
    `;
    
    const existingTables = (tablesCheck as DatabaseTable[]).map(t => t.table_name);
    
    if (!existingTables.includes('races')) {
      console.error('❌ races table not found. Please run migrations first:');
      console.error('   npm run migrate');
      process.exit(1);
    }
    
    if (!existingTables.includes('planned_races')) {
      console.error('❌ planned_races table not found.');
      console.error('   This requires the planned races migration to be run.');
      console.error('   Please run: npm run migrate');
      console.error('   Migration file: 1755356400000_add-planned-races-table.sql');
      process.exit(1);
    }

    // Check if races table has the planned_race_id column
    const columnsCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'races' 
        AND column_name = 'planned_race_id'
    `;
    
    if ((columnsCheck as DatabaseColumn[]).length === 0) {
      console.error('❌ races.planned_race_id column not found.');
      console.error('   This requires the planned races migration to be run.');
      console.error('   Please run: npm run migrate');
      console.error('   Migration file: 1755356400000_add-planned-races-table.sql');
      process.exit(1);
    }

    // Ensure the series record exists first
    console.log('📋 Ensuring series record exists...');
    const existingSeries = await sql`
      SELECT id, name, year 
      FROM series 
      WHERE name = 'MCRRC Championship Series' AND year = ${TARGET_YEAR}
    `;

    let seriesId = DEFAULT_SERIES_ID;
    
    if (existingSeries.length === 0) {
      console.log('   🆕 Creating MCRRC Championship Series record...');
      await sql`
        INSERT INTO series (id, name, year, description, start_date, end_date, is_active)
        VALUES (
          ${DEFAULT_SERIES_ID},
          'MCRRC Championship Series',
          ${TARGET_YEAR},
          'Montgomery County Road Runners Club Championship Series - Points-based competition across multiple races throughout the year',
          '2025-01-01'::date,
          '2025-12-31'::date,
          true
        )
      `;
      console.log('   ✅ Series record created successfully');
    } else {
      seriesId = existingSeries[0].id;
      console.log(`   ✅ Series record already exists: "${existingSeries[0].name}" (${existingSeries[0].year}) - ID: ${seriesId}`);
    }
    
    console.log(`🎯 Using Series ID: ${seriesId}`);

    // Get existing data
    const existingScrapedRaces = await sql`
      SELECT id, name, distance_miles, planned_race_id
      FROM races 
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
    ` as ScrapedRace[];

    const existingPlannedRaces = await sql`
      SELECT id, name, estimated_distance, status, series_order
      FROM planned_races 
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
    ` as PlannedRace[];

    console.log(`📋 Found ${existingScrapedRaces.length} scraped races and ${existingPlannedRaces.length} planned races`);
    console.log('');

    let addedCount = 0;
    let linkedCount = 0;
    let skippedCount = 0;

    // Process each official championship series race
    for (const officialRace of CHAMPIONSHIP_SERIES_RACES_2025) {
      console.log(`🔍 Processing: "${officialRace.name}"`);

      // Check if we already have a planned race for this official race
      const existingPlanned = findExistingPlannedRace(officialRace, existingPlannedRaces);
      
      if (existingPlanned) {
        console.log(`   ✅ Planned race already exists: "${existingPlanned.name}"`);
        
        // Check if there's a scraped race that matches and should be linked
        const matchingScraped = existingScrapedRaces.find(scraped => 
          findMatchingOfficialRace(scraped.name, [officialRace]) && !scraped.planned_race_id
        );
        
        if (matchingScraped) {
          // Link the scraped race to the planned race
          await sql`
            UPDATE races 
            SET planned_race_id = ${existingPlanned.id}
            WHERE id = ${matchingScraped.id}
          `;
          
          // Update planned race status
          await sql`
            UPDATE planned_races 
            SET status = 'scraped', updated_at = NOW()
            WHERE id = ${existingPlanned.id}
          `;
          
          console.log(`   🔗 Linked scraped race "${matchingScraped.name}" to planned race`);
          linkedCount++;
        }
        
        skippedCount++;
        continue;
      }

      // Check if there's already a scraped race for this official race
      const matchingScraped = existingScrapedRaces.find(scraped => 
        findMatchingOfficialRace(scraped.name, [officialRace])
      );

      if (matchingScraped && !matchingScraped.planned_race_id) {
        // Create a planned race entry and link the existing scraped race
        const estimatedDate = getEstimatedDate(officialRace.estimatedMonth, TARGET_YEAR);
        
        const plannedRaceResult = await sql`
          INSERT INTO planned_races (
            series_id, name, planned_date, year, estimated_distance, 
            location, notes, status, series_order
          ) VALUES (
            ${seriesId}, ${officialRace.name}, ${estimatedDate}, ${TARGET_YEAR}, 
            ${officialRace.distance}, ${officialRace.location}, 
            ${`Official MCRRC Championship Series race #${officialRace.order}. Already scraped as "${matchingScraped.name}".`},
            'scraped', ${officialRace.order}
          )
          RETURNING id, name
        ` as { id: string; name: string }[];
        
        const plannedRace = plannedRaceResult[0];
        
        // Link the existing scraped race
        await sql`
          UPDATE races 
          SET planned_race_id = ${plannedRace.id}
          WHERE id = ${matchingScraped.id}
        `;
        
        console.log(`   🔗 Created planned race and linked existing scraped race "${matchingScraped.name}"`);
        addedCount++;
        linkedCount++;
        continue;
      }

      if (matchingScraped && matchingScraped.planned_race_id) {
        console.log(`   ✅ Already linked to planned race`);
        skippedCount++;
        continue;
      }

      // No existing planned or scraped race - create new planned race
      const estimatedDate = getEstimatedDate(officialRace.estimatedMonth, TARGET_YEAR);
      
      const newPlannedRaceResult = await sql`
        INSERT INTO planned_races (
          series_id, name, planned_date, year, estimated_distance, 
          location, notes, status, series_order
        ) VALUES (
          ${seriesId}, ${officialRace.name}, ${estimatedDate}, ${TARGET_YEAR},
          ${officialRace.distance}, ${officialRace.location},
          ${`Official MCRRC Championship Series race #${officialRace.order}. Estimated ${officialRace.estimatedMonth} ${TARGET_YEAR}.`},
          'planned', ${officialRace.order}
        )
        RETURNING id, name
      ` as { id: string; name: string }[];
      
      const newPlannedRace = newPlannedRaceResult[0];

      console.log(`   ➕ Created planned race - ${officialRace.distance} miles, ${officialRace.estimatedMonth} ${TARGET_YEAR}`);
      addedCount++;
    }

    // Calculate totals for Q value
    const updatedPlannedRaces = await sql`
      SELECT COUNT(*) as count FROM planned_races 
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
    ` as RaceCount[];
    
    const totalRaceCount = parseInt(updatedPlannedRaces[0].count);
    const newQ = Math.ceil(totalRaceCount / 2);
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`   ➕ Added: ${addedCount} planned races`);
    console.log(`   🔗 Linked: ${linkedCount} scraped races to planned races`);
    console.log(`   ⏭️  Skipped: ${skippedCount} existing races`);
    console.log(`   🎯 Total championship series races: ${totalRaceCount}`);
    console.log('');
    console.log('🏆 Championship Series Qualification:');
    console.log(`   📅 Total races defined: ${totalRaceCount}`);
    console.log(`   🎯 Qualifying races needed (Q): ${newQ}`);
    console.log(`   📐 Formula: Q = ceil(${totalRaceCount}/2) = ${newQ}`);

    // Show race status breakdown
    const statusBreakdown = await sql`
      SELECT status, COUNT(*) as count 
      FROM planned_races 
      WHERE series_id = ${seriesId} AND year = ${TARGET_YEAR}
      GROUP BY status
      ORDER BY status
    ` as RaceStatusCount[];
    
    console.log('');
    console.log('📈 Race Status:');
    for (const status of statusBreakdown) {
      const emoji = status.status === 'scraped' ? '✅' : '📅';
      console.log(`   ${emoji} ${status.status}: ${status.count} races`);
    }

    // Optionally scrape completed races
    if (SCRAPE_COMPLETED && !SKIP_COMPLETED) {
      console.log('');
      console.log('🌐 Starting to scrape completed championship series races...');
      await scrapeCompletedRaces(seriesId);
    }

    if (addedCount > 0 || linkedCount > 0) {
      console.log('');
      console.log('⚡ Next steps:');
      console.log('   1. Verify the planned races in your admin dashboard');
      console.log('   2. Run standings recalculation to update Q value');
      console.log('   3. Check leaderboard - Nicolas should now have correct points!');
      console.log('');
      console.log('🔗 Admin Dashboard: http://localhost:3000/admin');
    }

    console.log('');
    console.log('✨ Script is idempotent - safe to run multiple times!');

  } catch (error) {
    console.error('❌ Error seeding championship series races:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'Unknown error');
    process.exit(1);
  }
}

// Helper function to generate estimated dates
function getEstimatedDate(month: string, year: number): string {
  const monthMap: Record<string, number> = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  
  const monthNum = monthMap[month] || 6; // Default to June if not found
  const day = 15; // Mid-month estimate
  
  return `${year}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// Run the seeding function if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedChampionshipSeriesRaces()
    .then(() => {
      console.log('✅ Championship series races seeded successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedChampionshipSeriesRaces, scrapeCompletedRaces, CHAMPIONSHIP_SERIES_RACES_2025, COMPLETED_RACES_2025 };
