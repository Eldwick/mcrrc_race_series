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

  it('parses HTML table results (Capital for a Day 5K with Sex/Tot)', async () => {
    const url = 'https://mcrrc.org/race-result/capital-for-a-day-5k/';
    const html = fs.readFileSync(path.resolve(__dirname, '../fixtures/capital_for_a_day_5k.html'), 'utf8');
    mock.onGet(url).reply(200, html);

    const scraper = new MCRRCScraper();
    const race = await scraper.scrapeRace(url);

    expect(race.name).toContain('Capital for a Day');
    // Skip clearly malformed rows if present; ensure we still parse the full field correctly
    expect(race.results.length).toBeGreaterThanOrEqual(233);
    expect(race.runners.length).toBeGreaterThanOrEqual(233);
    expect(race.results[0]).toMatchObject({ bibNumber: '670', place: 1, placeGender: 1, placeAgeGroup: 1, gunTime: '00:16:13' });
    expect(race.runners[0]).toMatchObject({ bibNumber: '670', firstName: 'Nicolas', lastName: 'Crouzier', gender: 'M', age: 29 });
    // Verify female first entry maps correctly from Sex/Tot
    const female = race.runners.find(r => r.firstName.startsWith('Megan'));
    expect(female?.gender).toBe('F');
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

  it('parses plain text results with gender sections (Brookeville Capital For A Day 5K)', async () => {
    const url = 'https://mcrrc.org/race-result/brookeville-capital-for-a-day-5k/';
    const html = fs.readFileSync(path.resolve(__dirname, '../fixtures/brookeville_capital_for_a_day_5k.html'), 'utf8');
    mock.onGet(url).reply(200, html);

    const scraper = new MCRRCScraper();
    const race = await scraper.scrapeRace(url);

    expect(race.results.length).toBeGreaterThanOrEqual(200);
    // First male
    expect(race.runners.find(r => r.bibNumber === '324')?.gender).toBe('M');
    expect(race.results[0].gunTime).toBe('00:17:09');
    // Female section leader Cindy Conant (bib 326)
    expect(race.runners.find(r => r.bibNumber === '326')?.gender).toBe('F');
  });

  it('parses plain text results without bib numbers (Jingle Bell Jog 8K 2009)', async () => {
    const url = 'https://mcrrc.org/race-result/jingle-bell-jog-8k-4/';
    const html = fs.readFileSync(path.resolve(__dirname, '../fixtures/jingle_bell_jog_8k_4.html'), 'utf8');
    mock.onGet(url).reply(200, html);

    const scraper = new MCRRCScraper();
    const race = await scraper.scrapeRace(url);

    expect(race.name).toContain('Jingle Bell Jog');
    // Should parse results even when no bib numbers are present by generating placeholders
    expect(race.results.length).toBeGreaterThanOrEqual(5);
    expect(race.runners.length).toBeGreaterThanOrEqual(5);
    // First place male
    const first = race.results.find(r => r.place === 1);
    expect(first?.gunTime).toBe('00:28:25');
    const firstRunner = race.runners.find(r => r.bibNumber === first?.bibNumber);
    expect(firstRunner?.firstName).toBe('Avi');
  });

  it('parses Turkey Burnoff 2016 (ignores split, uses gun time, sets net as chip)', async () => {
    const url = 'https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile/';
    const html = fs.readFileSync(path.resolve(__dirname, '../fixtures/turkey_burnoff_10m_2016.html'), 'utf8');
    mock.onGet(url).reply(200, html);

    const scraper = new MCRRCScraper();
    const race = await scraper.scrapeRace(url);

    expect(race.name).toContain('Turkey Burnoff');
    // First row: split=28:29, gun=55:26, net=55:25, pace=5:33
    const first = race.results.find(r => r.place === 1)!;
    expect(first.gunTime).toBe('00:55:26');
    expect(first.chipTime).toBe('00:55:25');
    expect(first.pacePerMile).toBe('00:05:33');
  });
});


