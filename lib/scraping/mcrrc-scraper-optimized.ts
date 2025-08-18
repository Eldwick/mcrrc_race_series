// MCRRC Race Results Scraper - Performance Optimized Version
// This file contains optimized versions of the core scraper methods
// for significantly faster historical data processing

import { ScrapedRaceResult, ScrapedRace } from './mcrrc-scraper.js';

/**
 * Optimized race results processing with bulk operations
 * Replaces the sequential processing in storeRaceData
 */
export class MCRRCScraperOptimized {
  private sanitizeBibNumber(raw: string): string {
    if (!raw) return '';
    const cleaned = raw.toString().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return cleaned.slice(0, 10);
  }
  
  /**
   * OPTIMIZED: Store race results in batches instead of individually
   * This method replaces the slow sequential processing in storeRaceData
   */
  async storeRaceResultsOptimized(
    sql: any, 
    results: ScrapedRaceResult[], 
    raceId: string, 
    seriesId: string
  ): Promise<{created: number, skipped: number}> {
    console.log(`🏆 Processing ${results.length} race results (OPTIMIZED)...`);
    
    if (results.length === 0) {
      return { created: 0, skipped: 0 };
    }

    // OPTIMIZATION 1: Pre-load ONLY NEEDED registration mappings to eliminate N+1 queries
    const neededBibs = Array.from(new Set(results.map(r => this.sanitizeBibNumber(r.bibNumber)))).filter(Boolean);
    const registrationMap = await this.preloadRegistrationMappings(sql, seriesId, neededBibs);
    console.log(`   📋 Pre-loaded ${registrationMap.size} registration mappings`);

    // OPTIMIZATION 2: Filter results and prepare for bulk insert
    const validResults: Array<{
      result: ScrapedRaceResult;
      registrationId: string;
      gunTimeInterval: string;
      chipTimeInterval: string | null;
      paceInterval: string;
    }> = [];

    let skippedCount = 0;
    
    for (const result of results) {
      const bib = this.sanitizeBibNumber(result.bibNumber);
      const registrationId = registrationMap.get(bib);
      
      if (!registrationId) {
        console.warn(`⚠️ No registration found for bib ${bib} - skipping result`);
        skippedCount++;
        continue;
      }

      // Pre-convert time formats
      const gunTimeInterval = this.timeToInterval(result.gunTime);
      const chipTimeInterval = result.chipTime ? this.timeToInterval(result.chipTime) : null;
      const paceInterval = this.timeToInterval(result.pacePerMile);

      validResults.push({
        result,
        registrationId,
        gunTimeInterval,
        chipTimeInterval,
        paceInterval
      });
    }

    if (validResults.length === 0) {
      console.log(`   ⏭️ No valid results to insert`);
      return { created: 0, skipped: skippedCount };
    }

    // OPTIMIZATION 3: Insert results in optimized batches with limited concurrency
    const BATCH_SIZE = 50; // Smaller batches for Neon SQL compatibility
    const CONCURRENCY = 8; // Cap parallel inserts to avoid saturating the DB
    let totalCreated = 0;

    for (let i = 0; i < validResults.length; i += BATCH_SIZE) {
      const batch = validResults.slice(i, i + BATCH_SIZE);
      const batchCreated = await this.bulkInsertResults(sql, batch, raceId, CONCURRENCY);
      totalCreated += batchCreated;
      if (validResults.length > BATCH_SIZE) {
        console.log(`   ✨ Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validResults.length / BATCH_SIZE)}: ${batchCreated} results`);
      }
    }

    console.log(`   🎉 BULK COMPLETE: Created ${totalCreated} race results, ⏭️ skipped ${skippedCount} (missing registrations)`);
    return { created: totalCreated, skipped: skippedCount };
  }

  /**
   * Pre-load all registration mappings for a series to eliminate N+1 queries
   */
  private async preloadRegistrationMappings(sql: any, seriesId: string, bibNumbers?: string[]): Promise<Map<string, string>> {
    let registrations: Array<{bib_number: string, id: string}> = [];
    try {
      if (bibNumbers && bibNumbers.length > 0 && typeof (sql as any).array === 'function') {
        const uniqueBibs = Array.from(new Set(bibNumbers));
        registrations = await sql`
          SELECT bib_number, id
          FROM series_registrations
          WHERE series_id = ${seriesId}
            AND bib_number = ANY(${(sql as any).array(uniqueBibs, 'text')})
        ` as Array<{bib_number: string, id: string}>;
      } else {
        // Fallback: load all registrations for series (maintains test compatibility)
        registrations = await sql`
          SELECT bib_number, id 
          FROM series_registrations 
          WHERE series_id = ${seriesId}
        ` as Array<{bib_number: string, id: string}>;
      }
    } catch (_err) {
      // Safe fallback if driver does not support array parameters
      registrations = await sql`
        SELECT bib_number, id 
        FROM series_registrations 
        WHERE series_id = ${seriesId}
      ` as Array<{bib_number: string, id: string}>;
    }

    const map = new Map<string, string>();
    registrations.forEach(reg => {
      map.set(reg.bib_number, reg.id);
    });

    return map;
  }

  /**
   * Bulk insert race results using a single multi-value INSERT
   */
  private async bulkInsertResults(
    sql: any,
    batch: Array<{
      result: ScrapedRaceResult;
      registrationId: string;
      gunTimeInterval: string;
      chipTimeInterval: string | null;
      paceInterval: string;
    }>,
    raceId: string,
    concurrency: number = 8
  ): Promise<number> {
    
    // Execute inserts in parallel with limited concurrency to reduce round-trips
    let insertedCount = 0;
    let index = 0;
    while (index < batch.length) {
      const slice = batch.slice(index, index + concurrency);
      await Promise.all(slice.map(async (item) => {
        await sql`
          INSERT INTO race_results (
            race_id, series_registration_id, place, place_gender, place_age_group,
            gun_time, chip_time, pace_per_mile, is_dnf, is_dq
          )
          VALUES (
            ${raceId}, 
            ${item.registrationId}, 
            ${item.result.place}, 
            ${item.result.placeGender}, 
            ${item.result.placeAgeGroup},
            ${item.gunTimeInterval}, 
            ${item.chipTimeInterval}, 
            ${item.paceInterval}, 
            ${item.result.isDNF}, 
            ${item.result.isDQ}
          )
        `;
        insertedCount++;
      }));
      index += concurrency;
    }

    return insertedCount;
  }

  /**
   * Convert time string to PostgreSQL interval format
   */
  private timeToInterval(timeStr: string): string {
    return this.normalizeTime(timeStr);
  }

  /**
   * Normalize time string to HH:MM:SS format
   */
  private normalizeTime(timeStr: string): string {
    if (!timeStr || timeStr === 'DNS' || timeStr === 'DNF' || timeStr === 'DQ') {
      return '00:00:00';
    }

    // Normalize whitespace and remove decimals/newlines or stray chars
    let processed = timeStr.replace(/\s+/g, '').trim();

    // Truncate decimal seconds if present (e.g., 4:29.4 -> 4:29)
    if (processed.includes('.')) {
      const parts = processed.split('.');
      if (parts.length >= 2 && /^\d/.test(parts[1])) {
        processed = parts[0];
      }
    }

    // Keep only digits and colons
    processed = processed.replace(/[^\d:]/g, '');

    const parts = processed.split(':').filter(Boolean);
    if (parts.length === 1) {
      const totalSeconds = parseInt(parts[0]) || 0;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      const validSeconds = seconds > 59 ? 59 : seconds;
      return `00:${minutes.toString().padStart(2, '0')}:${validSeconds.toString().padStart(2, '0')}`;
    } else if (parts.length >= 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      const validMinutes = minutes > 59 ? 59 : minutes;
      const validSeconds = seconds > 59 ? 59 : seconds;
      return `${hours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}:${validSeconds.toString().padStart(2, '0')}`;
    }

    return '00:00:00';
  }

  /**
   * OPTIMIZED: Process runner data with better batching
   * Enhanced version of storeRunnersDataOptimized with even better performance
   */
  async storeRunnersDataOptimizedV2(
    sql: any, 
    runners: Array<{
      bibNumber: string;
      firstName: string;
      lastName: string;
      gender: 'M' | 'F';
      age: number;
      club?: string;
    }>, 
    seriesId: string
  ): Promise<{
    runnersCreated: number;
    runnersUpdated: number;
    registrationsProcessed: number;
  }> {
    
    console.log(`👥 Processing ${runners.length} runners (OPTIMIZED V2)...`);
    
    if (runners.length === 0) {
      return { runnersCreated: 0, runnersUpdated: 0, registrationsProcessed: 0 };
    }

    // OPTIMIZATION 1: Pre-load all existing runners to reduce queries
    const existingRunnersMap = await this.preloadExistingRunners(sql, runners);
    console.log(`   📋 Pre-loaded ${existingRunnersMap.size} existing runners`);

    // OPTIMIZATION 2: Separate runners into new vs existing
    const newRunners: Array<any> = [];
    const existingRunners: Array<{runner: any, id: string}> = [];
    
    runners.forEach(runner => {
      const key = this.getRunnerKey(runner);
      const existingId = existingRunnersMap.get(key);
      
      if (existingId) {
        existingRunners.push({ runner, id: existingId });
      } else {
        newRunners.push(runner);
      }
    });

    console.log(`   🆕 ${newRunners.length} new runners, 🔄 ${existingRunners.length} existing runners`);

    // OPTIMIZATION 3: Bulk create new runners
    let runnersCreated = 0;
    if (newRunners.length > 0) {
      runnersCreated = await this.bulkCreateRunners(sql, newRunners);
      console.log(`   ✨ Bulk created ${runnersCreated} new runners`);
    }

    // OPTIMIZATION 4: Batch update existing runners
    let runnersUpdated = 0;
    if (existingRunners.length > 0) {
      runnersUpdated = await this.batchUpdateRunners(sql, existingRunners);
      console.log(`   🔄 Batch updated ${runnersUpdated} existing runners`);
    }

    // OPTIMIZATION 5: Reload runner mappings and bulk process registrations
    const allRunnersMap = await this.preloadExistingRunners(sql, runners);
    const registrationsProcessed = await this.bulkProcessRegistrations(sql, runners, allRunnersMap, seriesId);
    console.log(`   📝 Bulk processed ${registrationsProcessed} registrations`);

    return {
      runnersCreated,
      runnersUpdated,
      registrationsProcessed
    };
  }

  /**
   * Pre-load existing runners to eliminate lookups
   */
  private async preloadExistingRunners(
    sql: any, 
    runners: Array<{firstName: string, lastName: string, age: number}>
  ): Promise<Map<string, string>> {
    
    if (runners.length === 0) return new Map();

    // Get unique runner combinations
    const runnerKeys = [...new Set(runners.map(r => this.getRunnerKey(r)))];
    
    // For compatibility with Neon SQL, run lookups in parallel with capped concurrency
    const existingRunners: Array<{id: string, first_name: string, last_name: string}> = [];
    const CONCURRENCY = 10;
    let idx = 0;
    while (idx < runnerKeys.length) {
      const slice = runnerKeys.slice(idx, idx + CONCURRENCY);
      const results = await Promise.all(slice.map(async (key) => {
        const [firstName, lastName] = key.split('|');
        const rows = await sql`
          SELECT id, first_name, last_name
          FROM runners 
          WHERE LOWER(first_name) = LOWER(${firstName}) AND LOWER(last_name) = LOWER(${lastName})
          LIMIT 1
        `;
        return rows as Array<{id: string, first_name: string, last_name: string}>;
      }));
      for (const group of results) {
        if (group && group.length > 0) existingRunners.push(...group);
      }
      idx += CONCURRENCY;
    }

    // Build map
    const map = new Map<string, string>();
    existingRunners.forEach(runner => {
      const key = `${runner.first_name.toLowerCase()}|${runner.last_name.toLowerCase()}`;
      map.set(key, runner.id);
    });

    return map;
  }

  /**
   * Generate unique key for runner lookup
   */
  private getRunnerKey(runner: {firstName: string, lastName: string, age: number}): string {
    return `${runner.firstName.toLowerCase()}|${runner.lastName.toLowerCase()}`;
  }

  /**
   * Bulk create new runners (using individual inserts for Neon SQL compatibility)
   */
  private async bulkCreateRunners(sql: any, runners: Array<any>): Promise<number> {
    if (runners.length === 0) return 0;

    const currentYear = new Date().getFullYear();
    let created = 0;
    
    // Process in smaller batches for better performance
    const BATCH_SIZE = 25;
    
    for (let i = 0; i < runners.length; i += BATCH_SIZE) {
      const batch = runners.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (runner) => {
        const birthYear = currentYear - runner.age;
        await sql`
          INSERT INTO runners (first_name, last_name, gender, birth_year, club)
          VALUES (${runner.firstName}, ${runner.lastName}, ${runner.gender}, ${birthYear}, ${runner.club || null})
        `;
      }));
      created += batch.length;
      if (runners.length > BATCH_SIZE) {
        console.log(`   📝 Created runners batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(runners.length / BATCH_SIZE)}`);
      }
    }

    return created;
  }

  /**
   * Batch update existing runners
   */
  private async batchUpdateRunners(sql: any, runners: Array<{runner: any, id: string}>): Promise<number> {
    if (runners.length === 0) return 0;

    // Update in batches to avoid large transactions
    const BATCH_SIZE = 50;
    let updated = 0;

    for (let i = 0; i < runners.length; i += BATCH_SIZE) {
      const batch = runners.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async ({runner, id}) => {
        await sql`
          UPDATE runners SET
            gender = ${runner.gender},
            club = ${runner.club || null},
            updated_at = NOW()
          WHERE id = ${id}
        `;
      }));
      updated += batch.length;
    }

    return updated;
  }

  /**
   * Bulk process registrations with conflict resolution
   */
  private async bulkProcessRegistrations(
    sql: any,
    runners: Array<any>,
    runnersMap: Map<string, string>,
    seriesId: string
  ): Promise<number> {
    
    if (runners.length === 0) return 0;

    let processed = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < runners.length; i += BATCH_SIZE) {
      const batch = runners.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (runner) => {
        const key = this.getRunnerKey(runner);
        const runnerId = runnersMap.get(key);
        if (!runnerId) {
          console.warn(`⚠️ Runner ID not found for ${runner.firstName} ${runner.lastName}`);
          return;
        }
        const ageGroup = this.getAgeGroup(runner.age);
        try {
          await sql`
            INSERT INTO series_registrations (series_id, runner_id, bib_number, age, age_group)
            VALUES (${seriesId}, ${runnerId}, ${this.sanitizeBibNumber(runner.bibNumber)}, ${runner.age}, ${ageGroup})
            ON CONFLICT (series_id, bib_number) DO UPDATE SET
              runner_id = EXCLUDED.runner_id,
              age = EXCLUDED.age,
              age_group = EXCLUDED.age_group,
              updated_at = NOW()
          `;
          processed++;
        } catch (error) {
          if (error instanceof Error && error.message.includes('duplicate key value')) {
            console.warn(`⚠️ Registration conflict for ${runner.firstName} ${runner.lastName} (bib ${runner.bibNumber}) - skipping`);
          } else {
            throw error;
          }
        }
      }));
    }

    return processed;
  }

  /**
   * Calculate age group from age
   */
  private getAgeGroup(age: number): string {
    if (age < 15) return '0-14';
    if (age < 20) return '15-19';
    if (age < 25) return '20-24';
    if (age < 30) return '25-29';
    if (age < 35) return '30-34';
    if (age < 40) return '35-39';
    if (age < 45) return '40-44';
    if (age < 50) return '45-49';
    if (age < 55) return '50-54';
    if (age < 60) return '55-59';
    if (age < 65) return '60-64';
    if (age < 70) return '65-69';
    if (age < 75) return '70-74';
    if (age < 80) return '75-79';
    return '80-99';
  }
}

// Export for use in the main scraper
export const scraperOptimized = new MCRRCScraperOptimized();
