# MCRRC Championship Series Seeding Scripts

This directory contains scripts to seed and manage the MCRRC Championship Series data.

## Championship Series Race Seeding

### Overview
The `seed-championship-series-races.ts` script populates the database with all 12 official MCRRC Championship Series races based on the official race list from [mcrrc.org](https://mcrrc.org/club-race-series/championship-series-cs/). The script can optionally scrape completed races automatically. It's written in TypeScript for type safety and better development experience.

### Race List (2025)
1. **Kemp Mill (C)hills 10K** - 10K (Feb 9) ✅ *Available to scrape*
2. **Piece of Cake 10K** - 10K (Mar 23) ✅ *Available to scrape*
3. **Capital for a Day 5K** - 5K (Apr 12) ✅ *Available to scrape*
4. **Memorial Day 4 Miler** - 4 miles (May 26) ✅ *Available to scrape*
5. **Midsummer Night's Mile** - 1 mile (Jul 11) ✅ *Available to scrape*
6. **Riley's Rumble Half-Marathon** - 13.1 miles (Jul 27) ✅ *Available to scrape*
7. **Going Green – 2 Mile Run** - 2 miles (Aug 1) ✅ *Available to scrape*
8. **Matthew Henson 5K** - 5K (Aug 9) ✅ *Available to scrape*
9. **Eastern County** - 8K (September) *Planned*
10. **Country Road Run** - 5K (October) *Planned*
11. **Turkey Burnoff** - 10 miles (November) *Planned*
12. **Jingle Bell Jog** - 8K (December) *Planned*

### Usage

#### NPM Scripts (Recommended)

**Option 1: Seed + Scrape (Complete setup)**
```bash
# First ensure database migrations are up to date
npm run migrate

# Seed planned races AND scrape all 8 completed races
npm run seed:races:scrape
```

**Option 2: Planned races only (Fast)**
```bash
# First ensure database migrations are up to date
npm run migrate

# Seed only planned races (no automatic scraping)
npm run seed:races:planned-only
```

**Option 3: Default behavior**
```bash
# First ensure database migrations are up to date
npm run migrate

# Seed planned races, show hint about scraping option
npm run seed:races
```

#### Production
```bash
# First run migrations
DATABASE_URL="your-production-db-url" npm run migrate

# Option A: Full setup (planned races + scraping)
DATABASE_URL="your-production-db-url" npm run seed:races:scrape

# Option B: Planned races only
DATABASE_URL="your-production-db-url" npm run seed:races:planned-only
```

#### Direct execution with flags
```bash
# Seed + scrape all completed races
npx tsx scripts/seed-championship-series-races.ts --scrape-completed

# Seed planned races only
npx tsx scripts/seed-championship-series-races.ts --planned-only

# Default (planned races only, show scraping hint)
npx tsx scripts/seed-championship-series-races.ts
```

#### Requirements
- **New Migration Required**: `1755356400000_add-planned-races-table.sql`
- This migration adds the `planned_races` table and `races.planned_race_id` linking column

### What It Does

#### Planned Race Seeding (Always)
1. **Verifies database schema** (requires new planned races migration to be run)
2. **Intelligent race matching** using keywords and name mappings
3. **Links existing scraped races** to planned race definitions  
4. **Adds missing planned races** from official MCRRC championship series list
5. **Updates race statuses** (planned → scraped when linked)
6. **Calculates correct Q value** based on total planned races (not just scraped)

#### Completed Race Scraping (Optional with `--scrape-completed`)
7. **Scrapes all 8 completed races** from MCRRC website using idempotent scraping logic
8. **Processes race results** (runners, times, placements) with robust error handling
9. **Respects server limits** with 3-second delays between requests
10. **Continues on errors** and provides comprehensive summary
11. **Links scraped races** to planned race definitions automatically
12. **Updates race statuses** from "planned" to "scraped"

#### Summary & Reporting (Always)
13. **Provides detailed summary** with linking, scraping, and status information

### Error Handling

If you haven't run the new migration yet, the script will show:
```
❌ planned_races table not found.
   This requires the planned races migration to be run.
   Please run: npm run migrate
   Migration file: 1755356400000_add-planned-races-table.sql
```

### Key Features

- **🔄 Idempotent**: Safe to run multiple times - won't create duplicates
- **🔗 Smart Linking**: Automatically connects scraped races to official series races  
- **📊 Robust Matching**: Uses multiple strategies (exact mapping, keywords, fuzzy matching)
- **🚀 Future-Ready**: New scraped races automatically link to planned races
- **✅ Status Tracking**: Tracks race lifecycle (planned → scraped → completed)
- **📝 TypeScript**: Written in TypeScript for type safety and better development experience
- **🌐 Automatic Scraping**: Optionally scrapes all 8 completed races in one command
- **⚡ Flexible Options**: Choose between planned-only or full setup with scraping
- **🛡️ Error Resilient**: Continues scraping even if individual races fail
- **⏳ Server Friendly**: Includes delays between requests to respect MCRRC servers

### Expected Output

```
🏃 Seeding MCRRC Championship Series races for 2025...
📊 Source: https://mcrrc.org/club-race-series/championship-series-cs/
📅 Year: 2025
🎯 Series ID: f75a7257-ad21-495c-a127-69240dd0193d

📋 Found 3 scraped races and 0 planned races

🔍 Processing: "Riley's Rumble Half Marathon"
   🔗 Created planned race and linked existing scraped race "Riley's Rumble Half Marathon"
🔍 Processing: "Going Green Track Meet"
   🔗 Created planned race and linked existing scraped race "MCRRC Going Green – 2 Mile Run"
🔍 Processing: "Matthew Henson Trail"
   🔗 Created planned race and linked existing scraped race "Matthew Henson 5K"
🔍 Processing: "Kemp Mill (C)hills"
   ➕ Created planned race - 6.2 miles, February 2025
...

📊 Summary:
   ➕ Added: 12 planned races
   🔗 Linked: 3 scraped races to planned races
   ⏭️  Skipped: 0 existing races
   🎯 Total championship series races: 12

🏆 Championship Series Qualification:
   📅 Total races defined: 12
   🎯 Qualifying races needed (Q): 6
   📐 Formula: Q = ceil(12/2) = 6

📈 Race Status:
   📅 planned: 9 races
   ✅ scraped: 3 races

✨ Script is idempotent - safe to run multiple times!
```

### Next Steps After Seeding

1. **Verify races** in the admin dashboard at `http://localhost:3000/admin`
2. **Recalculate standings** to update the Q value:
   ```bash
   curl -X POST "http://localhost:3001/api/standings/calculate" \
        -H "Content-Type: application/json" \
        -d '{"seriesId": "f75a7257-ad21-495c-a127-69240dd0193d", "year": 2025}'
   ```
3. **Check the leaderboard** - Nicolas Crouzier should now have 29 points instead of 20!

### Impact on Scoring

**Before seeding** (Q = 2):
- Nicolas: Best 2 races = 10 + 10 = 20 points

**After seeding** (Q = 6):  
- Nicolas: All 3 races = 10 + 9 + 10 = 29 points ✅

The system now correctly calculates qualifying races based on the full 12-race championship series.
