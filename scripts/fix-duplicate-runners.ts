#!/usr/bin/env tsx

/**
 * Script to detect and merge duplicate runners
 * 
 * This script:
 * 1. Identifies potential duplicate runners based on name similarity
 * 2. Merges their race results and registrations
 * 3. Deactivates the duplicate runner records
 * 
 * Usage: npx tsx scripts/fix-duplicate-runners.ts
 */
import 'dotenv/config';
import { getSql } from '../lib/db/connection';

interface RunnerRecord {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  birth_year: number;
  club: string;
  is_active: boolean;
  created_at: string;
  race_count: number;
}

interface DuplicateGroup {
  key: string; // normalized name key
  runners: RunnerRecord[];
}

async function findDuplicateRunners(): Promise<DuplicateGroup[]> {
  const sql = getSql();
  
  console.log('🔍 Finding potential duplicate runners...');
  
  // Get all active runners with their race counts
  const allRunners = await sql`
    SELECT 
      r.*,
      COUNT(DISTINCT rr.id) as race_count
    FROM runners r
    LEFT JOIN series_registrations sr ON r.id = sr.runner_id
    LEFT JOIN race_results rr ON sr.id = rr.series_registration_id
    WHERE (r.is_active IS NULL OR r.is_active = true)
      AND r.first_name != ''
      AND r.last_name != ''
      AND LENGTH(r.first_name) > 1
      AND LENGTH(r.last_name) > 1
      AND r.first_name NOT LIKE '%:%'  -- Exclude corrupted entries with times
      AND r.first_name NOT IN ('F', 'M', 'Unknown', 'MCRRC')  -- Exclude obviously corrupted entries
    GROUP BY r.id, r.first_name, r.last_name, r.gender, r.birth_year, r.club, r.is_active, r.created_at
    ORDER BY r.last_name, r.first_name
  ` as RunnerRecord[];
  
  console.log(`📊 Found ${allRunners.length} valid runners to analyze`);
  
  // Group runners by normalized name
  const nameGroups = new Map<string, RunnerRecord[]>();
  
  allRunners.forEach(runner => {
    const normalizedKey = normalizeRunnerName(runner.first_name, runner.last_name);
    
    if (!nameGroups.has(normalizedKey)) {
      nameGroups.set(normalizedKey, []);
    }
    nameGroups.get(normalizedKey)!.push(runner);
  });
  
  // Find groups with multiple runners (potential duplicates)
  const duplicateGroups: DuplicateGroup[] = [];
  nameGroups.forEach((runners, key) => {
    if (runners.length > 1) {
      duplicateGroups.push({ key, runners });
    }
  });
  
  console.log(`🔍 Found ${duplicateGroups.length} potential duplicate groups`);
  
  return duplicateGroups;
}

function normalizeRunnerName(firstName: string, lastName: string): string {
  // Normalize names for comparison
  const normalize = (name: string) => name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '') // Remove non-alphabetic characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  return `${normalize(firstName)}|${normalize(lastName)}`;
}

async function mergeDuplicateRunners(group: DuplicateGroup): Promise<void> {
  const sql = getSql();
  
  console.log(`\n🔀 Processing duplicate group: ${group.key}`);
  console.log(`   Runners found: ${group.runners.length}`);
  
  // Sort runners to keep the "best" one (most races, oldest created_at)
  const sortedRunners = group.runners.sort((a, b) => {
    // Prefer runner with more races
    if (b.race_count !== a.race_count) {
      return b.race_count - a.race_count;
    }
    // If same race count, prefer older record
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  const primaryRunner = sortedRunners[0];
  const duplicateRunners = sortedRunners.slice(1);
  
  console.log(`   🎯 Keeping primary: ${primaryRunner.first_name} ${primaryRunner.last_name} (ID: ${primaryRunner.id}, Races: ${primaryRunner.race_count})`);
  
  // Merge each duplicate into the primary runner
  for (const duplicate of duplicateRunners) {
    console.log(`   🗑️  Merging: ${duplicate.first_name} ${duplicate.last_name} (ID: ${duplicate.id}, Races: ${duplicate.race_count})`);
    
    try {
      // Update series_registrations to point to primary runner
      await sql`
        UPDATE series_registrations 
        SET runner_id = ${primaryRunner.id}
        WHERE runner_id = ${duplicate.id}
      `;
      
      // Update any race_results that might directly reference the runner
      await sql`
        UPDATE race_results rr
        SET series_registration_id = (
          SELECT sr.id 
          FROM series_registrations sr 
          WHERE sr.runner_id = ${primaryRunner.id} 
            AND sr.series_id = (
              SELECT sr2.series_id 
              FROM series_registrations sr2 
              WHERE sr2.id = rr.series_registration_id
            )
          LIMIT 1
        )
        WHERE series_registration_id IN (
          SELECT id FROM series_registrations WHERE runner_id = ${duplicate.id}
        )
      `;
      
      // Deactivate the duplicate runner
      await sql`
        UPDATE runners 
        SET is_active = false, 
            updated_at = NOW()
        WHERE id = ${duplicate.id}
      `;
      
      console.log(`     ✅ Merged duplicate runner successfully`);
    } catch (error) {
      console.error(`     ❌ Error merging ${duplicate.id}:`, error);
    }
  }
}

async function cleanupCorruptedRunners(): Promise<void> {
  const sql = getSql();
  
  console.log('\n🧹 Cleaning up obviously corrupted runner entries...');
  
  // Deactivate runners with clearly corrupted names
  const corruptedRunners = await sql`
    UPDATE runners 
    SET is_active = false, updated_at = NOW()
    WHERE (
      first_name LIKE '%:%' OR  -- Time strings
      first_name IN ('F', 'M', 'Unknown', 'MCRRC') OR  -- Single letters/generic
      last_name = '' OR  -- Empty last names
      LENGTH(first_name) <= 1 OR  -- Single character names
      first_name ~ '^[0-9]' OR  -- Names starting with numbers
      first_name LIKE '%MD' OR  -- Location strings
      first_name ~ '^[FM]$'  -- Single F or M
    ) AND (is_active IS NULL OR is_active = true)
    RETURNING id, first_name, last_name
  ` as any[];
  
  console.log(`🗑️  Deactivated ${corruptedRunners.length} corrupted runner entries`);
  
  if (corruptedRunners.length > 0) {
    console.log('   Examples of cleaned entries:');
    corruptedRunners.slice(0, 5).forEach((runner: any) => {
      console.log(`   - "${runner.first_name}" "${runner.last_name}" (ID: ${runner.id})`);
    });
  }
}

async function main() {
  console.log('🚀 Starting duplicate runner detection and cleanup...\n');
  
  try {
    // First, clean up obviously corrupted entries
    await cleanupCorruptedRunners();
    
    // Then find and merge duplicates
    const duplicateGroups = await findDuplicateRunners();
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate runners found!');
      return;
    }
    
    console.log('\n📋 Duplicate groups found:');
    duplicateGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.key} (${group.runners.length} runners)`);
      group.runners.forEach(runner => {
        console.log(`   - ${runner.first_name} ${runner.last_name} (${runner.race_count} races) - ${runner.id}`);
      });
    });
    
    // Ask for confirmation before proceeding
    console.log('\n⚠️  This will merge duplicate runners. Continue? (y/N)');
    
    // For script automation, you can uncomment the next line to auto-proceed
    // const proceed = 'y';
    
    // For manual confirmation:
    const proceed = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim().toLowerCase());
      });
    });
    
    if (proceed !== 'y' && proceed !== 'yes') {
      console.log('❌ Operation cancelled');
      return;
    }
    
    // Process each duplicate group
    for (const group of duplicateGroups) {
      await mergeDuplicateRunners(group);
    }
    
    console.log('\n✅ Duplicate runner cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { findDuplicateRunners, mergeDuplicateRunners, cleanupCorruptedRunners };
