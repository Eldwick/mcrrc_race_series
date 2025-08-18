// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';

function createSqlRecorder(options?: { plannedName?: string; existingRace?: { id: string; planned_race_id?: string | null } }) {
  const calls: Array<{ text: string; values: any[] }> = [];
  const state: any = {
    plannedName: options?.plannedName ?? 'Planned Race',
    existingRace: options?.existingRace ?? null,
    raceId: options?.existingRace?.id ?? null,
    registrations: new Map<string, string>(), // bib -> regId
  };

  const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    const text = strings.join(' ');
    calls.push({ text, values });

    // Planned races lookup
    if (text.includes('FROM planned_races') && text.includes('SELECT')) {
      return [
        { id: 'planned-1', name: state.plannedName, estimated_distance: null, status: 'planned' },
      ];
    }

    // Existing race by URL
    if (text.includes('FROM races') && text.includes('mcrrc_url') && text.includes('SELECT id, planned_race_id')) {
      if (state.existingRace) {
        return [state.existingRace];
      }
      return [];
    }

    // Existing race by name/date
    if (text.includes('FROM races') && text.includes('WHERE') && text.includes('name =') && text.includes('date =') && text.includes('SELECT id, planned_race_id')) {
      return [];
    }

    // Insert new race
    if (text.includes('INSERT INTO races') && text.includes('RETURNING id')) {
      state.raceId = 'race-new-1';
      return [{ id: state.raceId }];
    }

    // Update race
    if (text.startsWith('\n           UPDATE races SET') || text.includes('UPDATE races SET')) {
      return [];
    }

    // Update planned race status
    if (text.includes('UPDATE planned_races') && text.includes("SET status = 'scraped'")) {
      return [];
    }

    // Delete old results
    if (text.includes('DELETE FROM race_results') && text.includes('WHERE race_id =')) {
      return [];
    }

    // Optimized: preload registrations
    if (text.includes('SELECT bib_number, id') && text.includes('FROM series_registrations')) {
      return Array.from(state.registrations.entries()).map(([bib, id]) => ({ bib_number: bib, id }));
    }

    // Runner exists lookup
    if (text.includes('SELECT id FROM runners') && text.includes('WHERE first_name')) {
      // Simulate found runner after creation
      const firstName = values[0];
      const lastName = values[1];
      const birthYear = values[2];
      return [{ id: `runner-${firstName}-${lastName}-${birthYear}`, first_name: firstName, last_name: lastName, birth_year: birthYear }];
    }

    // Insert runner
    if (text.includes('INSERT INTO runners')) {
      return [{ id: `runner-new-${Math.random().toString(36).slice(2)}` }];
    }

    // Update runner
    if (text.includes('UPDATE runners SET')) {
      return [];
    }

    // Insert/Upsert registration
    if (text.includes('INSERT INTO series_registrations')) {
      const bib = values[2]; // (... series_id, runner_id, bib_number, ...)
      const regId = `reg-${bib}`;
      state.registrations.set(bib, regId);
      return [];
    }

    // Bulk/individual insert race_results
    if (text.includes('INSERT INTO race_results')) {
      return [];
    }

    // Generic SELECT 1, health checks, etc.
    return [];
  };

  return { sql, calls, state };
}

let currentSql: any;
vi.mock('../../lib/db/connection', () => ({
  getSql: () => currentSql,
}));

let optimizedCalls: string[] = [];
vi.mock('../../lib/scraping/mcrrc-scraper-optimized.js', () => {
  class MCRRCScraperOptimized {
    async storeRaceResultsOptimized(sql: any, results: any[], raceId: string, seriesId: string) {
      optimizedCalls.push('results');
      return { created: results.length, skipped: 0 };
    }
    async storeRunnersDataOptimizedV2(sql: any, runners: any[], seriesId: string) {
      optimizedCalls.push('runners');
      return { runnersCreated: runners.length, runnersUpdated: 0, registrationsProcessed: runners.length };
    }
  }
  return { MCRRCScraperOptimized, scraperOptimized: new MCRRCScraperOptimized() };
});

describe('MCRRCScraper.storeRaceData behavior', () => {

  it('new race: inserts race, links planned, processes runners then results (no delete)', async () => {
    const { sql, calls } = createSqlRecorder({ plannedName: 'Test Race 5K' });
    currentSql = sql;
    const { MCRRCScraper } = await import('../../lib/scraping/mcrrc-scraper');
    const scraper = new MCRRCScraper();
    const scrapedRace = {
      name: 'Test Race 5K',
      date: '2024-03-15',
      distance: 3.1,
      location: 'Test City, ST',
      url: 'https://mcrrc.org/race-result/test-race',
      results: [
        { bibNumber: '101', place: 1, placeGender: 1, placeAgeGroup: 1, gunTime: '00:16:30', chipTime: undefined, pacePerMile: '5:19', isDNF: false, isDQ: false },
        { bibNumber: '102', place: 2, placeGender: 2, placeAgeGroup: 1, gunTime: '00:17:00', chipTime: undefined, pacePerMile: '5:28', isDNF: false, isDQ: false }
      ],
      runners: [
        { bibNumber: '101', firstName: 'Jane', lastName: 'Doe', gender: 'F', age: 30 },
        { bibNumber: '102', firstName: 'John', lastName: 'Smith', gender: 'M', age: 28 }
      ]
    };

    await scraper.storeRaceData(scrapedRace as any, 'series-1');

    const textCalls = calls.map(c => c.text);
    const idxInsertRace = textCalls.findIndex(t => t.includes('INSERT INTO races'));
    const idxPlannedSelect = textCalls.findIndex(t => t.includes('FROM planned_races') && t.includes('SELECT'));
    const idxPlannedUpdate = textCalls.findIndex(t => t.includes('UPDATE planned_races') && t.includes("SET status = 'scraped'"));
    const idxDeleteOld = textCalls.findIndex(t => t.includes('DELETE FROM race_results'));

    expect(idxPlannedSelect).toBeGreaterThanOrEqual(0);
    expect(idxInsertRace).toBeGreaterThan(idxPlannedSelect);
    expect(idxPlannedUpdate).toBeGreaterThan(idxInsertRace);
    // No deletion for new race
    expect(idxDeleteOld).toBe(-1);
    // Optimized calls order: runners then results
    expect(optimizedCalls[0]).toBe('runners');
    expect(optimizedCalls[1]).toBe('results');
  });

  it('existing race: updates race, deletes old results before inserting new ones', async () => {
    const existing = { id: 'race-existing-1', planned_race_id: null };
    const { sql, calls } = createSqlRecorder({ plannedName: 'Existing Race 10K', existingRace: existing });
    currentSql = sql;
    const { MCRRCScraper } = await import('../../lib/scraping/mcrrc-scraper');
    const scraper = new MCRRCScraper();
    const scrapedRace = {
      name: 'Existing Race 10K',
      date: '2024-05-01',
      distance: 6.2,
      location: 'City, ST',
      url: 'https://mcrrc.org/race-result/existing-race',
      results: [
        { bibNumber: '201', place: 1, placeGender: 1, placeAgeGroup: 1, gunTime: '00:35:00', chipTime: undefined, pacePerMile: '5:38', isDNF: false, isDQ: false }
      ],
      runners: [
        { bibNumber: '201', firstName: 'Alex', lastName: 'R', gender: 'M', age: 35 }
      ]
    };

    await scraper.storeRaceData(scrapedRace as any, 'series-1');

    const textCalls = calls.map(c => c.text);
    const idxUpdateRace = textCalls.findIndex(t => t.includes('UPDATE races SET'));
    const idxDeleteOld = textCalls.findIndex(t => t.includes('DELETE FROM race_results') && t.includes('WHERE race_id'));
    expect(idxUpdateRace).toBeGreaterThanOrEqual(0);
    expect(idxDeleteOld).toBeGreaterThan(idxUpdateRace);
    // Optimized calls order: runners then results
    expect(optimizedCalls[0]).toBe('runners');
    expect(optimizedCalls[1]).toBe('results');
  });
});


