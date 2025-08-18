// @ts-nocheck
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { MCRRCScraper } from '../../lib/scraping/mcrrc-scraper';
import fs from 'node:fs';
import path from 'node:path';

describe('MCRRCScraper.parse', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  afterAll(() => {
    mock.restore();
  });

  it('parses HTML table results (Matthew Henson 5K)', async () => {
    const url = 'https://mcrrc.org/race-result/matthew-henson-5k-6/';
    const html = fs.readFileSync(path.resolve(__dirname, '../fixtures/matthew_henson_5k_6.html'), 'utf8');
    mock.onGet(url).reply(200, html);

    const scraper = new MCRRCScraper();
    const race = await scraper.scrapeRace(url);

    expect(race.name).toContain('Matthew Henson 5K');
    expect(race.results.length).toBeGreaterThanOrEqual(3);
    expect(race.runners.length).toBeGreaterThanOrEqual(3);
    expect(race.results[0]).toMatchObject({ bibNumber: '137', place: 1, placeGender: 1, placeAgeGroup: 1, gunTime: '00:15:38' });
    expect(race.runners[0]).toMatchObject({ bibNumber: '137', firstName: 'Nicolas', lastName: 'Crouzier', gender: 'M', age: 40 });
  });

  it('parses plain text results with decimal seconds (Eastern County 8K)', async () => {
    const url = 'https://mcrrc.org/race-result/eastern-county-8k-4/';
    const plainText = fs.readFileSync(path.resolve(__dirname, '../fixtures/eastern_county_8k_4.txt'), 'utf8');
    mock.onGet(url).reply(200, plainText);

    const scraper = new MCRRCScraper();
    const race = await scraper.scrapeRace(url);

    expect(race.results.length).toBeGreaterThanOrEqual(3);
    // decimal seconds normalized
    expect(race.results[0].gunTime).toBe('00:04:29');
  });
});


