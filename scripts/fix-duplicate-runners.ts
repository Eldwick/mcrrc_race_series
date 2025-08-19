#!/usr/bin/env tsx

/**
 * Script to detect and merge duplicate runners
 * 
 * This script:
 * 1. Identifies potential duplicate runners based on name similarity
 * 2. Selects primary runner based on most recent race series participation
 * 3. Merges their race results and registrations into the primary runner
 * 4. Deactivates the duplicate runner records
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
  latest_series_year: number | null;
}

interface DuplicateGroup {
  key: string; // normalized name key
  runners: RunnerRecord[];
}

async function findDuplicateRunners(): Promise<DuplicateGroup[]> {
  const sql = getSql();
  
  console.log('🔍 Finding potential duplicate runners...');
  
  // Get all active runners with their race counts and latest series year
  const allRunners = await sql`
    SELECT 
      r.*,
      COUNT(DISTINCT rr.id) as race_count,
      MAX(s.year) as latest_series_year
    FROM runners r
    LEFT JOIN series_registrations sr ON r.id = sr.runner_id
    LEFT JOIN race_results rr ON sr.id = rr.series_registration_id
    LEFT JOIN series s ON sr.series_id = s.id
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
  
  // Sort runners to keep the "best" one (most recent series year, then most races, then oldest created_at)
  const sortedRunners = group.runners.sort((a, b) => {
    // Prefer runner from most recent series year (null values go to end)
    if (a.latest_series_year === null && b.latest_series_year === null) {
      // Both null, continue to next criteria
    } else if (a.latest_series_year === null) {
      return 1; // a goes to end
    } else if (b.latest_series_year === null) {
      return -1; // b goes to end
    } else if (b.latest_series_year !== a.latest_series_year) {
      return b.latest_series_year - a.latest_series_year; // Higher year first
    }
    
    // If same/null series year, prefer runner with more races
    if (b.race_count !== a.race_count) {
      return b.race_count - a.race_count;
    }
    // If same race count, prefer older record
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  const primaryRunner = sortedRunners[0];
  const duplicateRunners = sortedRunners.slice(1);
  
  if (duplicateRunners.length === 0) {
    console.log(`   ℹ️  No duplicates to merge for ${primaryRunner.first_name} ${primaryRunner.last_name}`);
    return;
  }
  
  console.log(`   🎯 Keeping primary: ${primaryRunner.first_name} ${primaryRunner.last_name} (ID: ${primaryRunner.id}, Latest Series: ${primaryRunner.latest_series_year}, Races: ${primaryRunner.race_count})`);
  duplicateRunners.forEach(duplicate => {
    console.log(`   🗑️  Will merge: ${duplicate.first_name} ${duplicate.last_name} (ID: ${duplicate.id}, Series: ${duplicate.latest_series_year}, Races: ${duplicate.race_count})`);
  });
  
  // Collect all duplicate IDs for bulk operations
  const duplicateIds = duplicateRunners.map(r => r.id);
  
  try {
    // Execute bulk operations (Neon serverless doesn't support explicit transactions)
    // But individual operations are atomic and we handle errors gracefully
    
    // 1. Bulk update series_registrations to point to primary runner
    await sql`
      UPDATE series_registrations 
      SET runner_id = ${primaryRunner.id}, updated_at = NOW()
      WHERE runner_id = ANY(${duplicateIds})
    `;
    console.log(`   📋 Updated ${duplicateIds.length} runners' series registrations`);
    
    // 2. Handle potential duplicate series registrations by merging them
    // First, identify and handle duplicate series registrations that might now exist
    await sql`
      DELETE FROM series_registrations sr1
      WHERE sr1.runner_id = ${primaryRunner.id}
        AND EXISTS (
          SELECT 1 FROM series_registrations sr2 
          WHERE sr2.runner_id = ${primaryRunner.id} 
            AND sr2.series_id = sr1.series_id 
            AND sr2.id > sr1.id
        )
    `;
    console.log(`   🧹 Cleaned up duplicate series registrations`);
    
    // 3. Update race_results to point to the correct series_registration
    // This handles any orphaned race_results that might exist
    await sql`
      UPDATE race_results rr
      SET series_registration_id = (
        SELECT sr.id 
        FROM series_registrations sr 
        WHERE sr.runner_id = ${primaryRunner.id} 
          AND sr.series_id = (
            SELECT sr_old.series_id 
            FROM series_registrations sr_old 
            WHERE sr_old.id = rr.series_registration_id
          )
        LIMIT 1
      )
      WHERE series_registration_id IN (
        SELECT id FROM series_registrations 
        WHERE runner_id = ANY(${duplicateIds})
      )
    `;
    console.log(`   🏃 Updated race results references`);
    
    // 4. Bulk deactivate duplicate runners
    await sql`
      UPDATE runners 
      SET is_active = false, updated_at = NOW()
      WHERE id = ANY(${duplicateIds})
    `;
    console.log(`   🚫 Deactivated ${duplicateIds.length} duplicate runners`);
    
    console.log(`   ✅ Successfully merged ${duplicateIds.length} duplicate runners into primary`);
    
  } catch (error) {
    console.error(`   ❌ Error during bulk merge operation:`, error);
    throw error;
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
    
    // Calculate total runners that will be processed
    let totalDuplicatesToMerge = 0;
    duplicateGroups.forEach(group => {
      if (group.runners.length > 1) {
        totalDuplicatesToMerge += group.runners.length - 1; // -1 because we keep one as primary
      }
    });
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate runners found!');
      return;
    }
    
    console.log('\n📋 Duplicate groups found:');
    console.log(`📊 Will process ${duplicateGroups.length} duplicate groups, merging ${totalDuplicatesToMerge} duplicate runners\n`);
    
    duplicateGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.key} (${group.runners.length} runners)`);
      group.runners.forEach(runner => {
        console.log(`   - ${runner.first_name} ${runner.last_name} (${runner.race_count} races, Series: ${runner.latest_series_year || 'None'}, Birth: ${runner.birth_year || 'Unknown'}) - ${runner.id}`);
      });
    });
    
    // Ask for confirmation before proceeding
    console.log(`\n⚠️  This will merge ${totalDuplicatesToMerge} duplicate runners across ${duplicateGroups.length} groups. Continue? (y/N)`);
    
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
    
    // Process duplicate groups with progress tracking
    // Note: Processing sequentially to avoid potential foreign key conflicts
    // when multiple groups might reference the same series/races
    console.log('\n🔄 Starting merge operations...');
    const startTime = Date.now();
    
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      console.log(`\n📊 Processing group ${i + 1}/${duplicateGroups.length}`);
      await mergeDuplicateRunners(group);
    }
    
    const endTime = Date.now();
    const totalSeconds = (endTime - startTime) / 1000;
    console.log(`\n⏱️  Total merge time: ${totalSeconds.toFixed(2)} seconds`);
    console.log(`📈 Average time per group: ${(totalSeconds / duplicateGroups.length).toFixed(2)} seconds`);
    console.log(`🎯 Total duplicate runners merged: ${totalDuplicatesToMerge}`);
    console.log(`📊 Duplicate groups processed: ${duplicateGroups.length}`);
    
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
