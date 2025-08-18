// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { MCRRCScraper } from '../../lib/scraping/mcrrc-scraper';

// Create a minimal sql mock implementing tagged template behavior
function createSqlMock() {
  const calls: any[] = [];
  const sql = (strings: TemplateStringsArray, ...values: any[]) => {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''), '');
    calls.push(text);
    return Promise.resolve([]);
  };
  return { sql, calls } as any;
}

describe.skip('MCRRCScraper.storeRaceData (integration-lite)', () => {
  it('stores new race, runners, and results via optimized paths', async () => {
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
        { bibNumber: '101', firstName: 'Jane', lastName: 'Doe', gender: 'F' as const, age: 30 },
        { bibNumber: '102', firstName: 'John', lastName: 'Smith', gender: 'M' as const, age: 28 }
      ]
    };

    const sqlMock = createSqlMock();

    // Spy on getSql to return our mock
    const getSqlModule = await import('../../lib/db/connection');
    const originalGetSql = (getSqlModule as any).getSql;
    (getSqlModule as any).getSql = () => sqlMock.sql;

    try {
      await scraper.storeRaceData(scrapedRace as any, 'series-1');
      // Basic assertion: some SQL calls were attempted
      expect(sqlMock.calls.length).toBeGreaterThan(0);
    } finally {
      // restore
      (getSqlModule as any).getSql = originalGetSql;
    }
  });
});


