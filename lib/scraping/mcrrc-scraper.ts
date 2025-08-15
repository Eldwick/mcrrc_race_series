// MCRRC Race Results Scraper
// Scrapes race results from mcrrc.org and processes them for the championship series

import axios from 'axios';
import * as cheerio from 'cheerio';
import { getSql } from '../db/connection';

export interface ScrapedRunner {
  bibNumber: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  age: number;
  club: string;
}

export interface ScrapedRaceResult {
  bibNumber: string;
  place: number;
  placeGender: number;
  placeAgeGroup: number;
  gunTime: string; // Format: "HH:MM:SS" or "MM:SS"
  chipTime?: string;
  pacePerMile: string;
  isDNF: boolean;
  isDQ: boolean;
}

export interface ScrapedRace {
  name: string;
  date: string; // YYYY-MM-DD format
  distance: number; // miles
  location: string;
  url: string;
  results: ScrapedRaceResult[];
  runners: ScrapedRunner[];
}

export class MCRRCScraper {
  private readonly baseUrl = 'https://mcrrc.org';
  private readonly userAgent = 'Mozilla/5.0 (compatible; MCRRC-Championship-Series-Bot)';

  constructor() {
    // Set up axios defaults
    axios.defaults.headers.common['User-Agent'] = this.userAgent;
    axios.defaults.timeout = 30000; // 30 second timeout
  }

  /**
   * Scrape a single race result page
   */
  async scrapeRace(url: string): Promise<ScrapedRace> {
    try {
      console.log(`Scraping race from: ${url}`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Extract race metadata
      const race = this.extractRaceMetadata($, url);
      
      // Extract results table
      const { results, runners } = this.extractResults($);
      
      race.results = results;
      race.runners = runners;

      console.log(`Scraped ${results.length} results for race: ${race.name}`);
      return race;

    } catch (error) {
      console.error('Error scraping race:', error);
      throw new Error(`Failed to scrape race from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract race metadata from the page
   */
  private extractRaceMetadata($: cheerio.CheerioAPI, url: string): ScrapedRace {
    // MCRRC specific selectors
    let name = $('h1').first().text().trim();
    let date = '';
    let distance = 0;
    let location = '';

    // Look for race info in the subtitle/header area
    const headerText = $('body').text();
    
    // Extract date from race header - MCRRC format: "August 9, 2025   Silver Spring, MD"
    const dateLocationMatch = headerText.match(/([A-Za-z]+ \d{1,2}, \d{4})\s+([^,\n]+(?:, [A-Z]{2})?)/);
    if (dateLocationMatch) {
      const dateStr = dateLocationMatch[1];
      const locationStr = dateLocationMatch[2].trim();
      
      // Parse the date
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate.toISOString().split('T')[0];
      }
      
      // Extract location (just city, state)
      location = locationStr.length > 255 ? locationStr.substring(0, 255) : locationStr;
    }

    // Extract distance from race name
    const distanceMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:mile|mi|k|5k|10k)/i);
    if (distanceMatch) {
      const distStr = distanceMatch[1];
      const unit = distanceMatch[0].toLowerCase();
      if (unit.includes('k')) {
        distance = parseFloat(distStr) * 0.621371; // Convert km to miles
      } else {
        distance = parseFloat(distStr);
      }
    }

    // Fallback date extraction from URL or page content
    if (!date) {
      const dateMatch = headerText.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const foundDate = dateMatch[1];
        if (foundDate.includes('/')) {
          const [month, day, year] = foundDate.split('/');
          date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          date = foundDate;
        }
      }
    }

    return {
      name: name || 'Unknown Race',
      date: date || new Date().toISOString().split('T')[0],
      distance: distance || 3.1, // Default to 5K
      location: location || 'Unknown Location',
      url,
      results: [],
      runners: []
    };
  }

  /**
   * Extract results from the race results table
   */
  private extractResults($: cheerio.CheerioAPI): { results: ScrapedRaceResult[], runners: ScrapedRunner[] } {
    const results: ScrapedRaceResult[] = [];
    const runners: ScrapedRunner[] = [];
    const runnerMap = new Map<string, ScrapedRunner>();

    // Find the results table - try different selectors
    let table = $('table').first();
    
    // Look for table with results-specific classes/ids
    const resultTables = $('table:contains("Place"), table:contains("Time"), table:contains("Bib"), table.results, #results-table');
    if (resultTables.length > 0) {
      table = resultTables.first();
    }

    if (table.length === 0) {
      console.warn('No results table found');
      return { results, runners };
    }

    // Find header row to understand column structure
    const headerRow = table.find('tr').first();
    const headers = headerRow.find('th, td').map((i, el) => $(el).text().trim().toLowerCase()).get();
    
    const columnMap = this.mapColumns(headers);
    console.log('Column mapping:', columnMap);

    // Process each result row
    table.find('tr').slice(1).each((rowIndex, row) => {
      try {
        const cells = $(row).find('td');
        if (cells.length < 3) return; // Skip rows with too few cells

        const result = this.parseResultRow(cells, columnMap, $);
        const runner = this.parseRunnerRow(cells, columnMap, $);

        if (result && runner) {
          results.push(result);
          
          // Only add unique runners
          if (!runnerMap.has(runner.bibNumber)) {
            runnerMap.set(runner.bibNumber, runner);
            runners.push(runner);
          }
        }
      } catch (error) {
        console.warn(`Error parsing row ${rowIndex}:`, error);
      }
    });

    return { results, runners };
  }

  /**
   * Map column headers to expected fields
   */
  private mapColumns(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};

    headers.forEach((header, index) => {
      const h = header.toLowerCase().trim();
      
      // MCRRC specific column mappings
      if (h === 'place' || h.includes('place') || h.includes('pos') || h === '#' || h === 'pl') {
        map.place = index;
      } else if (h === 'num' || h.includes('bib') || h === 'number') {
        map.bib = index;
      } else if (h === 'name' || h.includes('name') || h.includes('runner')) {
        map.name = index;
      } else if (h === 'age' || h.includes('age')) {
        map.age = index;
      } else if (h === 'gender' || h.includes('gender') || h.includes('sex') || h === 'm/f') {
        map.gender = index;
      } else if (h === 'gun time' || (h.includes('time') && !h.includes('chip') && !h.includes('net'))) {
        map.gunTime = index;
      } else if (h === 'net time' || h.includes('chip') || h.includes('net')) {
        map.chipTime = index;
      } else if (h.includes('pace')) {
        map.pace = index;
      } else if (h === 'club' || h.includes('club') || h.includes('team')) {
        map.club = index;
      } else if (h === 'hometown' || h.includes('city') || h.includes('town') || h.includes('home')) {
        map.city = index;
      }
    });

    // Debug output (remove in production)
    // console.log('Column headers found:', headers);
    // console.log('Column mapping:', map);

    return map;
  }

  /**
   * Parse a result row into ScrapedRaceResult
   */
  private parseResultRow(cells: cheerio.Cheerio<any>, columnMap: Record<string, number>, $: cheerio.CheerioAPI): ScrapedRaceResult | null {
    try {
      const getText = (key: string) => {
        const index = columnMap[key];
        return index !== undefined ? $(cells[index]).text().trim() : '';
      };

      const bibNumber = getText('bib') || '0';
      const placeText = getText('place');
      const gunTimeText = getText('gunTime');

      if (!placeText || !gunTimeText) return null;

      // Parse place (handle DNF/DQ)
      const isDNF = placeText.toLowerCase().includes('dnf');
      const isDQ = placeText.toLowerCase().includes('dq');
      const place = isDNF || isDQ ? 999 : parseInt(placeText) || 0;

      return {
        bibNumber,
        place,
        placeGender: 0, // Will be calculated later
        placeAgeGroup: 0, // Will be calculated later
        gunTime: this.normalizeTime(gunTimeText),
        chipTime: getText('chipTime') ? this.normalizeTime(getText('chipTime')) : undefined,
        pacePerMile: getText('pace') || '0:00',
        isDNF,
        isDQ
      };
    } catch (error) {
      console.warn('Error parsing result row:', error);
      return null;
    }
  }

  /**
   * Parse a result row into ScrapedRunner
   */
  private parseRunnerRow(cells: cheerio.Cheerio<any>, columnMap: Record<string, number>, $: cheerio.CheerioAPI): ScrapedRunner | null {
    try {
      const getText = (key: string) => {
        const index = columnMap[key];
        return index !== undefined ? $(cells[index]).text().trim() : '';
      };

      const bibNumber = getText('bib') || '0';
      const fullName = getText('name');
      const ageText = getText('age');
      const genderText = getText('gender');
      const clubText = getText('club');
      const cityText = getText('city');

      if (!fullName) return null;

      // Parse name - MCRRC typically uses "First Last" format
      let firstName = '', lastName = '';
      
      const nameParts = fullName.split(',').map(part => part.trim());
      if (nameParts.length >= 2) {
        // Format: "Last, First"
        lastName = nameParts[0];
        firstName = nameParts[1];
      } else {
        // Format: "First Last" or single name
        const parts = fullName.split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      // Parse age
      const age = parseInt(ageText) || 25; // Default age if not found

      // Parse gender
      let gender: 'M' | 'F' = 'M';
      if (genderText && (genderText.toLowerCase().includes('f') || genderText.toLowerCase().includes('w'))) {
        gender = 'F';
      }

      // Determine club - prefer explicit club field, otherwise use default
      let club = 'MCRRC'; // Default for MCRRC races
      if (clubText && clubText.length > 0 && !cityText.includes(clubText)) {
        club = clubText;
      }

      return {
        bibNumber,
        firstName,
        lastName,
        gender,
        age,
        club
      };
    } catch (error) {
      console.warn('Error parsing runner row:', error);
      return null;
    }
  }

  /**
   * Normalize time format to HH:MM:SS
   */
  private normalizeTime(timeStr: string): string {
    if (!timeStr) return '00:00:00';
    
    const cleaned = timeStr.replace(/[^\d:]/g, '');
    const parts = cleaned.split(':');

    if (parts.length === 2) {
      // MM:SS format
      return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }

    return '00:00:00';
  }

  /**
   * Discover race URLs from MCRRC championship series page
   */
  async discoverRaceUrls(year: number = new Date().getFullYear()): Promise<string[]> {
    try {
      const seriesUrl = `${this.baseUrl}/club-race-series/championship-series-cs/`;
      console.log(`Discovering races from: ${seriesUrl}`);
      
      const response = await axios.get(seriesUrl);
      const $ = cheerio.load(response.data);
      
      const urls: string[] = [];
      
      // Look for race result links
      $('a').each((i, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().toLowerCase();
        
        if (href && (
          text.includes('result') || 
          text.includes(year.toString()) ||
          href.includes('result') ||
          href.includes('/races/')
        )) {
          let fullUrl = href;
          if (!href.startsWith('http')) {
            fullUrl = href.startsWith('/') ? `${this.baseUrl}${href}` : `${this.baseUrl}/${href}`;
          }
          
          if (!urls.includes(fullUrl)) {
            urls.push(fullUrl);
          }
        }
      });

      console.log(`Discovered ${urls.length} potential race URLs`);
      return urls.filter(url => url.includes(this.baseUrl)); // Only MCRRC URLs
      
    } catch (error) {
      console.error('Error discovering race URLs:', error);
      return [];
    }
  }

  /**
   * Store scraped race data in database
   */
  async storeRaceData(scrapedRace: ScrapedRace, seriesId: string): Promise<void> {
    const sql = getSql();
    
    try {
      // 1. Check if race already exists
      const existingRace = await sql`
        SELECT id FROM races 
        WHERE series_id = ${seriesId} AND name = ${scrapedRace.name} AND date = ${scrapedRace.date}
      ` as any[];

      let raceId: string;
      
      if (existingRace.length > 0) {
        // Update existing race
        raceId = existingRace[0].id;
        await sql`
          UPDATE races SET
            distance_miles = ${scrapedRace.distance},
            location = ${scrapedRace.location},
            mcrrc_url = ${scrapedRace.url},
            results_scraped_at = NOW(),
            updated_at = NOW()
          WHERE id = ${raceId}
        `;
        console.log(`Updated existing race with ID: ${raceId}`);
      } else {
        // Insert new race
        const raceResult = await sql`
          INSERT INTO races (series_id, name, date, year, distance_miles, location, mcrrc_url, results_scraped_at)
          VALUES (${seriesId}, ${scrapedRace.name}, ${scrapedRace.date}, ${new Date(scrapedRace.date).getFullYear()}, ${scrapedRace.distance}, ${scrapedRace.location}, ${scrapedRace.url}, NOW())
          RETURNING id
        ` as any[];
        
        raceId = raceResult[0].id;
        console.log(`Created new race with ID: ${raceId}`);
      }

      // 2. Process runners and create series registrations
      for (const runner of scrapedRace.runners) {
        await this.storeRunnerData(sql, runner, seriesId);
      }

      // 3. Store race results
      for (const result of scrapedRace.results) {
        await this.storeResultData(sql, result, raceId, seriesId);
      }

      console.log(`Stored ${scrapedRace.results.length} race results`);

    } catch (error) {
      console.error('Error storing race data:', error);
      throw error;
    }
  }

  /**
   * Store or update runner data
   */
  private async storeRunnerData(sql: any, runner: ScrapedRunner, seriesId: string): Promise<void> {
    // Calculate birth year from age (approximate)
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - runner.age;
    
    // Calculate age group
    const ageGroup = this.getAgeGroup(runner.age);

    // Check if runner already exists
    const existingRunner = await sql`
      SELECT id FROM runners 
      WHERE first_name = ${runner.firstName} AND last_name = ${runner.lastName} AND birth_year = ${birthYear}
    ` as any[];

    let runnerId: string;

    if (existingRunner.length > 0) {
      // Update existing runner
      runnerId = existingRunner[0].id;
      await sql`
        UPDATE runners SET
          gender = ${runner.gender},
          club = ${runner.club},
          updated_at = NOW()
        WHERE id = ${runnerId}
      `;
    } else {
      // Insert new runner
      const runnerResult = await sql`
        INSERT INTO runners (first_name, last_name, gender, birth_year, club)
        VALUES (${runner.firstName}, ${runner.lastName}, ${runner.gender}, ${birthYear}, ${runner.club})
        RETURNING id
      ` as any[];
      
      runnerId = runnerResult[0].id;
    }

    // Check if series registration already exists
    const existingRegistration = await sql`
      SELECT id FROM series_registrations 
      WHERE series_id = ${seriesId} AND runner_id = ${runnerId}
    ` as any[];

    if (existingRegistration.length > 0) {
      // Update existing registration
      await sql`
        UPDATE series_registrations SET
          bib_number = ${runner.bibNumber},
          age = ${runner.age},
          age_group = ${ageGroup},
          updated_at = NOW()
        WHERE id = ${existingRegistration[0].id}
      `;
    } else {
      // Create new series registration (bib number mapping)
      await sql`
        INSERT INTO series_registrations (series_id, runner_id, bib_number, age, age_group)
        VALUES (${seriesId}, ${runnerId}, ${runner.bibNumber}, ${runner.age}, ${ageGroup})
      `;
    }
  }

  /**
   * Store race result data
   */
  private async storeResultData(sql: any, result: ScrapedRaceResult, raceId: string, seriesId: string): Promise<void> {
    // Find the series registration for this bib number
    const registrationResult = await sql`
      SELECT id FROM series_registrations 
      WHERE series_id = ${seriesId} AND bib_number = ${result.bibNumber}
    ` as any[];

    if (registrationResult.length === 0) {
      console.warn(`No series registration found for bib ${result.bibNumber}`);
      return;
    }

    const seriesRegistrationId = registrationResult[0].id;

    // Convert times to PostgreSQL intervals
    const gunTimeInterval = this.timeToInterval(result.gunTime);
    const chipTimeInterval = result.chipTime ? this.timeToInterval(result.chipTime) : null;
    const paceInterval = this.timeToInterval(result.pacePerMile);

    // Check if race result already exists
    const existingResult = await sql`
      SELECT id FROM race_results 
      WHERE race_id = ${raceId} AND series_registration_id = ${seriesRegistrationId}
    ` as any[];

    if (existingResult.length > 0) {
      // Update existing result
      await sql`
        UPDATE race_results SET
          place = ${result.place},
          place_gender = ${result.placeGender},
          place_age_group = ${result.placeAgeGroup},
          gun_time = ${gunTimeInterval},
          chip_time = ${chipTimeInterval},
          pace_per_mile = ${paceInterval},
          is_dnf = ${result.isDNF},
          is_dq = ${result.isDQ},
          updated_at = NOW()
        WHERE id = ${existingResult[0].id}
      `;
    } else {
      // Insert new result
      await sql`
        INSERT INTO race_results (
          race_id, series_registration_id, place, place_gender, place_age_group,
          gun_time, chip_time, pace_per_mile, is_dnf, is_dq
        )
        VALUES (
          ${raceId}, ${seriesRegistrationId}, ${result.place}, ${result.placeGender}, ${result.placeAgeGroup},
          ${gunTimeInterval}, ${chipTimeInterval}, ${paceInterval}, ${result.isDNF}, ${result.isDQ}
        )
      `;
    }
  }

  /**
   * Convert time string to PostgreSQL interval
   */
  private timeToInterval(timeStr: string): string {
    const normalized = this.normalizeTime(timeStr);
    return normalized; // PostgreSQL accepts HH:MM:SS format directly
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

export const mcrrcScraper = new MCRRCScraper();
