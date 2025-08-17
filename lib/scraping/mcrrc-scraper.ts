// MCRRC Race Results Scraper
// Scrapes race results from mcrrc.org and processes them for the championship series

import axios from 'axios';
import * as cheerio from 'cheerio';
import { getSql } from '../db/connection.js';

export interface ScrapedRunner {
  bibNumber: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  age: number; // Required - fallback provided if not available from scraping
  club?: string; // Optional - only set if available from scraping
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
  distance?: number; // miles - optional, undefined if unparseable
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

    // Extract distance from race name - handle common race types
    const raceName = name.toLowerCase();
    
    // Check for specific race types first
    if (raceName.includes('half marathon') || raceName.includes('half-marathon')) {
      distance = 13.1; // Half marathon
    } else if (raceName.includes('marathon') && !raceName.includes('half')) {
      distance = 26.2; // Full marathon
    } else if (raceName.includes('10k') || raceName.includes('10 k')) {
      distance = 6.2; // 10K
    } else if (raceName.includes('5k') || raceName.includes('5 k')) {
      distance = 3.1; // 5K
    } else if (raceName.includes('15k') || raceName.includes('15 k')) {
      distance = 9.3; // 15K
    } else if (raceName.includes(' mile') && !raceName.includes('miler')) {
      // Handle "Mile" races (e.g., "Midsummer Night's Mile")
      distance = 1.0; // 1 mile
    } else {
      // Try to extract numeric distance with units
      const distanceMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:mile|mi|k)/i);
      if (distanceMatch) {
        const distStr = distanceMatch[1];
        const unit = distanceMatch[0].toLowerCase();
        if (unit.includes('k') && !unit.includes('mile')) {
          distance = parseFloat(distStr) * 0.621371; // Convert km to miles
        } else {
          distance = parseFloat(distStr);
        }
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
      distance: distance || undefined, // No default - leave undefined if unparseable
      location: location || 'Unknown Location',
      url,
      results: [],
      runners: []
    };
  }

  /**
   * Extract results from the race results table or plain text format
   */
  private extractResults($: cheerio.CheerioAPI): { results: ScrapedRaceResult[], runners: ScrapedRunner[] } {
    const results: ScrapedRaceResult[] = [];
    const runners: ScrapedRunner[] = [];
    const runnerMap = new Map<string, ScrapedRunner>();

    // First, check if this is a plain text format (legacy MCRRC format)
    const bodyText = $('body').text();
    if (this.isPlainTextResults(bodyText)) {
      console.log('Detected plain text results format - parsing as fixed-width text');
      return this.extractPlainTextResults(bodyText);
    }

    // Otherwise, parse as HTML table format
    console.log('Detected HTML table format - parsing as structured table');

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
   * Detect if the page contains plain text results format (legacy MCRRC format)
   */
  private isPlainTextResults(bodyText: string): boolean {
    // Look for characteristic patterns of the plain text format
    const hasHeaderPattern = bodyText.includes('Place Sex/Tot') || 
                           (bodyText.includes('Place') && bodyText.includes('Sex/Tot') && bodyText.includes('Name')) ||
                           bodyText.includes('Place Sex/Tot  Div/Tot  Num   Name');
    
    const hasSeparatorLine = bodyText.includes('=====');
    
    // Look for lines that match the result pattern: number, ratio, ratio, number, names, gender, age, etc.
    const lines = bodyText.split('\n');
    const hasResultPattern = lines.some(line => {
      // Match lines like: "1   1/265    1/26     701 Karl Dusen            M 28"
      return /^\s*\d+\s+\d+\/\d+\s+\d+\/\d+\s+\d+\s+[A-Za-z]/.test(line.trim());
    });
    
    console.log('Plain text detection:', {
      hasHeaderPattern,
      hasSeparatorLine,
      hasResultPattern,
      detected: hasHeaderPattern && hasSeparatorLine && hasResultPattern
    });
    
    return hasHeaderPattern && hasSeparatorLine && hasResultPattern;
  }

  /**
   * Extract results from plain text format (legacy MCRRC format)
   * Format: Place Sex/Tot Div/Tot Num Name S Ag Hometown Club Net_Time Pace Gun_Time Pace
   */
  private extractPlainTextResults(bodyText: string): { results: ScrapedRaceResult[], runners: ScrapedRunner[] } {
    const results: ScrapedRaceResult[] = [];
    const runners: ScrapedRunner[] = [];
    const runnerMap = new Map<string, ScrapedRunner>();

    try {
      const lines = bodyText.split('\n');
      
      // Find the header line to understand column positions
      const headerLineIndex = lines.findIndex(line => 
        line.includes('Place') && line.includes('Sex/Tot') && line.includes('Name')
      );
      
      if (headerLineIndex === -1) {
        console.warn('Could not find header line in plain text results');
        return { results, runners };
      }

      const headerLine = lines[headerLineIndex];
      console.log('Header line found:', headerLine);

      // Find separator line (with ====)
      const separatorLineIndex = lines.findIndex((line, index) => 
        index > headerLineIndex && line.includes('=====')
      );

      if (separatorLineIndex === -1) {
        console.warn('Could not find separator line in plain text results');
        return { results, runners };
      }

      // Process result lines (after separator, before any footer content)
      let resultCount = 0;
      for (let i = separatorLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Stop at footer content (Stay Informed, Email:, etc.)
        if (line.includes('Stay Informed') || line.includes('Email:') || 
            line.includes('Copyright') || line.includes('Terms & Conditions')) {
          break;
        }

        // Skip lines that don't start with a number (place)
        if (!/^\d+/.test(line)) continue;

        try {
          const parsed = this.parsePlainTextResultLine(line);
          if (parsed.result && parsed.runner) {
            results.push(parsed.result);
            
            // Only add unique runners
            if (!runnerMap.has(parsed.runner.bibNumber)) {
              runnerMap.set(parsed.runner.bibNumber, parsed.runner);
              runners.push(parsed.runner);
            }
            resultCount++;
          }
        } catch (error) {
          console.warn(`Error parsing plain text line ${i}: "${line}"`, error);
        }
      }

      console.log(`Parsed ${resultCount} results from plain text format`);
      return { results, runners };

    } catch (error) {
      console.error('Error parsing plain text results:', error);
      return { results, runners };
    }
  }

  /**
   * Parse a single line of plain text results
   * Format: Place Sex/Tot Div/Tot Num Name S Ag Hometown Club Net_Time Pace Gun_Time Pace
   */
  private parsePlainTextResultLine(line: string): { result: ScrapedRaceResult | null, runner: ScrapedRunner | null } {
    try {
      // Use regex to parse the fixed-width format
      // This regex attempts to capture the main fields from the fixed-width format
      const regex = /^\s*(\d+)\s+(\d+\/\d+)\s+(\d+\/\d+)\s+(\d+)\s+(.+?)\s+([MF])\s+(\d+)\s+(.+?)\s+(\w*)\s+([\d:]+)\s+([\d:]+)\s+([\d:]+)\s+([\d:]+).*$/;
      const match = line.match(regex);
      
      if (!match) {
        // Try alternative parsing for lines that might have missing club or other variations
        return this.parsePlainTextResultLineAlternative(line);
      }

      const [, place, sexTot, divTot, bib, name, gender, age, hometown, club, netTime, netPace, gunTime, gunPace] = match;

      // Extract gender place from "1/265" format
      const genderPlaceMatch = sexTot.match(/(\d+)\/\d+/);
      const genderPlace = genderPlaceMatch ? parseInt(genderPlaceMatch[1]) : parseInt(place);

      // Extract age group place from "1/26" format  
      const ageGroupPlaceMatch = divTot.match(/(\d+)\/\d+/);
      const ageGroupPlace = ageGroupPlaceMatch ? parseInt(ageGroupPlaceMatch[1]) : parseInt(place);

      // Parse name into first and last
      const nameParts = name.trim().split(' ');
      const firstName = nameParts.shift() || '';
      const lastName = nameParts.join(' ') || '';

      const result: ScrapedRaceResult = {
        bibNumber: bib.trim(),
        place: parseInt(place),
        placeGender: genderPlace,
        placeAgeGroup: ageGroupPlace,
        gunTime: this.normalizeTime(gunTime),
        chipTime: this.normalizeTime(netTime),
        pacePerMile: gunPace || netPace || '',
        isDNF: false,
        isDQ: false
      };

      const runner: ScrapedRunner = {
        bibNumber: bib.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: (gender.trim() === 'M' ? 'M' : 'F') as 'M' | 'F',
        age: parseInt(age) || 25,
        club: club.trim() || undefined
      };

      return { result, runner };

    } catch (error) {
      console.warn('Error parsing plain text result line:', error);
      return { result: null, runner: null };
    }
  }

  /**
   * Alternative parsing for plain text lines that don't match the main regex
   */
  private parsePlainTextResultLineAlternative(line: string): { result: ScrapedRaceResult | null, runner: ScrapedRunner | null } {
    try {
      // Split by whitespace and try to extract fields positionally
      const parts = line.trim().split(/\s+/);
      
      if (parts.length < 8) {
        return { result: null, runner: null };
      }

      const place = parseInt(parts[0]);
      const bib = parts[3];
      
      // Find the gender field (should be M or F)
      let genderIndex = -1;
      for (let i = 4; i < parts.length; i++) {
        if (parts[i] === 'M' || parts[i] === 'F') {
          genderIndex = i;
          break;
        }
      }

      if (genderIndex === -1) {
        return { result: null, runner: null };
      }

      const gender = parts[genderIndex] as 'M' | 'F';
      const age = parseInt(parts[genderIndex + 1]) || 25;
      
      // Name is between bib and gender
      const nameParts = parts.slice(4, genderIndex);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Find time patterns (HH:MM:SS or MM:SS)
      const timePattern = /^\d{1,2}:\d{2}(:\d{2})?$/;
      const times = parts.filter(part => timePattern.test(part));
      const gunTime = times.length > 0 ? times[times.length - 1] : '00:00:00'; // Take last time as gun time

      const result: ScrapedRaceResult = {
        bibNumber: bib,
        place: place,
        placeGender: place, // Fallback to overall place
        placeAgeGroup: place, // Fallback to overall place
        gunTime: this.normalizeTime(gunTime),
        chipTime: this.normalizeTime(times[0] || gunTime),
        pacePerMile: '', // Will be calculated later if needed
        isDNF: false,
        isDQ: false
      };

      const runner: ScrapedRunner = {
        bibNumber: bib,
        firstName: firstName,
        lastName: lastName,
        gender: gender,
        age: age
      };

      return { result, runner };

    } catch (error) {
      return { result: null, runner: null };
    }
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
      } else if (h === 'gen/tot' || h === 'gen' || h.includes('gender total')) {
        map.genderPlace = index;
      } else if (h === 'div/tot' || h === 'div' || h.includes('division') || h.includes('age group')) {
        map.ageGroupPlace = index;
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

      // Parse gender placement from "Gen/Tot" column (e.g., "1/134")
      const genderPlaceText = getText('genderPlace');
      let placeGender = 0;
      if (genderPlaceText && !isDNF && !isDQ) {
        const genderMatch = genderPlaceText.match(/^(\d+)\//);
        placeGender = genderMatch ? parseInt(genderMatch[1]) : 0;
      }

      // Parse age group placement from "Div/Tot" column (e.g., "1/12")
      const ageGroupPlaceText = getText('ageGroupPlace');
      let placeAgeGroup = 0;
      if (ageGroupPlaceText && !isDNF && !isDQ) {
        const ageGroupMatch = ageGroupPlaceText.match(/^(\d+)\//);
        placeAgeGroup = ageGroupMatch ? parseInt(ageGroupMatch[1]) : 0;
      }

      return {
        bibNumber,
        place,
        placeGender,
        placeAgeGroup,
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
      const club = getText('club');

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

      // Parse age - provide fallback if parsing fails to avoid NOT NULL constraint violations
      let age = ageText && !isNaN(parseInt(ageText)) ? parseInt(ageText) : undefined;
      
      // If age parsing failed but we have ageText, try to extract numbers
      if (!age && ageText) {
        const ageMatch = ageText.match(/\d+/);
        age = ageMatch ? parseInt(ageMatch[0]) : undefined;
      }
      
      // If still no age, use fallback based on race performance (very rough estimate)
      // This prevents NOT NULL constraint violations in the database
      if (!age) {
        age = 35; // Fallback age - average adult runner age
      } 

      // Parse gender
      let gender: 'M' | 'F' = 'M';
      if (genderText && (genderText.toLowerCase().includes('f') || genderText.toLowerCase().includes('w'))) {
        gender = 'F';
      }

      const runner: ScrapedRunner = {
        bibNumber,
        firstName,
        lastName,
        gender,
        age // Now guaranteed to have a value (never undefined)
      };
      if (club && club.trim() !== '') {
        runner.club = club.trim();
      }

      return runner;
    } catch (error) {
      console.warn('Error parsing runner row:', error);
      return null;
    }
  }

  /**
   * Normalize time format to HH:MM:SS
   * Handles various time formats including decimal seconds (e.g., "4:29.4")
   */
  private normalizeTime(timeStr: string): string {
    if (!timeStr) return '00:00:00';
    
    // Handle decimal seconds (e.g., "4:29.4" -> "4:29")
    // Remove decimal and everything after it for seconds precision
    let processedTime = timeStr.trim();
    
    // If there's a decimal point, truncate to whole seconds
    if (processedTime.includes('.')) {
      const parts = processedTime.split('.');
      if (parts.length >= 2 && parts[1].match(/^\d/)) {
        // Keep only the integer part of seconds
        processedTime = parts[0];
      }
    }
    
    // Clean up: remove everything except digits and colons
    const cleaned = processedTime.replace(/[^\d:]/g, '');
    const parts = cleaned.split(':').filter(part => part !== ''); // Remove empty parts

    if (parts.length === 1) {
      // Just seconds (e.g., "150" -> "00:02:30")
      const totalSeconds = parseInt(parts[0]) || 0;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (parts.length === 2) {
      // MM:SS format (e.g., "4:29" -> "00:04:29")
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      
      // Validate seconds are in valid range
      const validSeconds = seconds > 59 ? 59 : seconds;
      return `00:${minutes.toString().padStart(2, '0')}:${validSeconds.toString().padStart(2, '0')}`;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      
      // Validate values are in valid ranges
      const validMinutes = minutes > 59 ? 59 : minutes;
      const validSeconds = seconds > 59 ? 59 : seconds;
      
      return `${hours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}:${validSeconds.toString().padStart(2, '0')}`;
    }

    console.warn(`⚠️ Unable to parse time format: "${timeStr}" -> falling back to 00:00:00`);
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
   * Find a matching planned race for this scraped race
   */
  private async findMatchingPlannedRace(sql: any, scrapedRaceName: string, seriesId: string): Promise<any> {
    // Get all planned races for this series
    const plannedRaces = await sql`
      SELECT id, name, estimated_distance, status
      FROM planned_races 
      WHERE series_id = ${seriesId} AND status = 'planned'
    ` as any[];

    // Simple matching logic - can be enhanced based on race name mappings
    const scrapedName = scrapedRaceName.toLowerCase().trim();
    
    // Look for keyword matches
    for (const planned of plannedRaces) {
      const plannedName = planned.name.toLowerCase().trim();
      
      // Check if key words match
      const scrapedWords = scrapedName.split(' ').filter(w => w.length > 3);
      const plannedWords = plannedName.split(' ').filter(w => w.length > 3);
      
      const matchingWords = scrapedWords.filter(word => 
        plannedWords.some(pWord => 
          pWord.includes(word) || word.includes(pWord)
        )
      );
      
      // If at least 50% of significant words match, consider it a match
      if (matchingWords.length >= Math.ceil(Math.min(scrapedWords.length, plannedWords.length) * 0.5)) {
        return planned;
      }
    }
    
    return null;
  }

  /**
   * Store scraped race data in database (idempotent)
   * Note: Transaction safety could be added with proper Neon transaction syntax
   */
  async storeRaceData(scrapedRace: ScrapedRace, seriesId: string): Promise<void> {
    const sql = getSql();
    
    try {
      console.log(`🏁 Processing race: "${scrapedRace.name}" (${scrapedRace.date})`);
      
      // Check if there's a planned race that matches this scraped race
      const matchingPlannedRace = await this.findMatchingPlannedRace(sql, scrapedRace.name, seriesId);
      
      // 1. Check if race already exists - prioritize URL matching, then name/date
      let existingRace = await sql`
        SELECT id, planned_race_id, name, date FROM races 
        WHERE series_id = ${seriesId} AND mcrrc_url = ${scrapedRace.url}
      ` as any[];

      // If no URL match, try name + date match
      if (existingRace.length === 0) {
        existingRace = await sql`
          SELECT id, planned_race_id, name, date FROM races 
          WHERE series_id = ${seriesId} AND name = ${scrapedRace.name} AND date = ${scrapedRace.date}
        ` as any[];
      }

      let raceId: string;
      let isNewRace = false;
      
      if (existingRace.length > 0) {
        // Update existing race
        raceId = existingRace[0].id;
        const currentPlannedRaceId = existingRace[0].planned_race_id;
        
        await sql`
          UPDATE races SET
            name = ${scrapedRace.name},
            date = ${scrapedRace.date},
            year = ${new Date(scrapedRace.date).getFullYear()},
            distance_miles = ${scrapedRace.distance || null},
            location = ${scrapedRace.location},
            mcrrc_url = ${scrapedRace.url},
            planned_race_id = ${matchingPlannedRace?.id || currentPlannedRaceId || null},
            results_scraped_at = NOW(),
            updated_at = NOW()
          WHERE id = ${raceId}
        `;
        
        console.log(`🔄 Updated existing race "${scrapedRace.name}" (ID: ${raceId})`);
        
        // Log what changed if anything
        const existing = existingRace[0];
        if (existing.name !== scrapedRace.name) {
          console.log(`   📝 Name updated: "${existing.name}" → "${scrapedRace.name}"`);
        }
        if (existing.date !== scrapedRace.date) {
          console.log(`   📅 Date updated: ${existing.date} → ${scrapedRace.date}`);
        }
      } else {
        // Insert new race
        const raceResult = await sql`
          INSERT INTO races (series_id, name, date, year, distance_miles, location, mcrrc_url, planned_race_id, results_scraped_at)
          VALUES (${seriesId}, ${scrapedRace.name}, ${scrapedRace.date}, ${new Date(scrapedRace.date).getFullYear()}, ${scrapedRace.distance || null}, ${scrapedRace.location}, ${scrapedRace.url}, ${matchingPlannedRace?.id || null}, NOW())
          RETURNING id
        ` as any[];
        
        raceId = raceResult[0].id;
        isNewRace = true;
        console.log(`✨ Created new race "${scrapedRace.name}" (ID: ${raceId})`);
        
        if (matchingPlannedRace) {
          console.log(`   🔗 Linked to planned race: "${matchingPlannedRace.name}"`);
        }
      }

      // If we found a matching planned race, update its status
      if (matchingPlannedRace && (!existingRace.length || !existingRace[0].planned_race_id)) {
        await sql`
          UPDATE planned_races 
          SET status = 'scraped', updated_at = NOW()
          WHERE id = ${matchingPlannedRace.id}
        `;
        console.log(`📅 Updated planned race "${matchingPlannedRace.name}" status to 'scraped'`);
      }

      // 2. Process runners and create series registrations (OPTIMIZED)
      console.log(`👥 Processing ${scrapedRace.runners.length} runners...`);
      const runnerProcessingResult = await this.storeRunnersDataOptimized(sql, scrapedRace.runners, seriesId);
      console.log(`   ✨ Created ${runnerProcessingResult.runnersCreated} new runners, 🔄 updated ${runnerProcessingResult.runnersUpdated} existing runners`);
      if (runnerProcessingResult.conflictsResolved > 0) {
        console.log(`   🔄 Resolved ${runnerProcessingResult.conflictsResolved} bib conflicts in batch`);
      }

      // 3. Clean up old race results if re-scraping (for data integrity)
      if (!isNewRace) {
        console.log(`🧹 Cleaning up old race results for re-scraping...`);
        const deletedResults = await sql`
          DELETE FROM race_results 
          WHERE race_id = ${raceId}
        ` as any[];
        console.log(`   🗑️ Removed ${deletedResults.length || 0} old results`);
      }

      // 4. Store new race results
      console.log(`🏆 Processing ${scrapedRace.results.length} race results...`);
      let resultsCreated = 0, resultsSkipped = 0;
      for (const result of scrapedRace.results) {
        const { created } = await this.storeResultData(sql, result, raceId, seriesId);
        if (created) resultsCreated++;
        else resultsSkipped++;
      }
      console.log(`   ✨ Created ${resultsCreated} race results, ⏭️ skipped ${resultsSkipped} (missing registrations)`);
      
      console.log(`🎉 Successfully processed race "${scrapedRace.name}" with ${scrapedRace.results.length} results`);

    } catch (error) {
      console.error('Error storing race data:', error);
      throw error;
    }
  }

  /**
   * Store or update runner data (idempotent)
   */
  private async storeRunnerData(sql: any, runner: ScrapedRunner, seriesId: string): Promise<{created: boolean, updated: boolean}> {
    // Calculate birth year from age (approximate) - age is now guaranteed to exist
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - runner.age;
    
    // Calculate age group - age is now guaranteed to exist
    const ageGroup = this.getAgeGroup(runner.age);

    // Check if runner already exists
    const existingRunner = await sql`
      SELECT id FROM runners 
      WHERE first_name = ${runner.firstName} AND last_name = ${runner.lastName} AND birth_year = ${birthYear}
    ` as any[];

    let runnerId: string;
    let runnerCreated = false;
    let runnerUpdated = false;

    if (existingRunner.length > 0) {
      // Update existing runner
      runnerId = existingRunner[0].id;
      await sql`
        UPDATE runners SET
          gender = ${runner.gender},
          club = ${runner.club || null},
          updated_at = NOW()
        WHERE id = ${runnerId}
      `;
      runnerUpdated = true;
    } else {
      // Insert new runner
      const runnerResult = await sql`
        INSERT INTO runners (first_name, last_name, gender, birth_year, club)
        VALUES (${runner.firstName}, ${runner.lastName}, ${runner.gender}, ${birthYear}, ${runner.club || null})
        RETURNING id
      ` as any[];
      
      runnerId = runnerResult[0].id;
      runnerCreated = true;
    }

    // Handle series registration with robust conflict resolution
    try {
      // Check if this exact runner + bib combination already exists in this series
      const existingRunnerBib = await sql`
        SELECT id FROM series_registrations 
        WHERE series_id = ${seriesId} AND runner_id = ${runnerId} AND bib_number = ${runner.bibNumber}
      ` as any[];

      if (existingRunnerBib.length > 0) {
        // This exact runner + bib combination exists - just update age info
        const regId = existingRunnerBib[0].id;
        
        await sql`
          UPDATE series_registrations SET
            age = ${runner.age},
            age_group = ${ageGroup},
            updated_at = NOW()
          WHERE id = ${regId}
        `;
        
        console.log(`   ✅ Updated age info for ${runner.firstName} ${runner.lastName} with bib ${runner.bibNumber}`);
        runnerUpdated = true;
      } else {
        // Check if this bib number is already taken by someone else
        const bibConflict = await sql`
          SELECT id, runner_id FROM series_registrations 
          WHERE series_id = ${seriesId} AND bib_number = ${runner.bibNumber}
        ` as any[];

        if (bibConflict.length > 0) {
          // Bib number already exists - check who owns it
          const conflictRunnerId = bibConflict[0].runner_id;
          
          if (conflictRunnerId !== runnerId) {
            // Different runner has this bib - this is a bib reassignment
            const conflictRunner = await sql`
              SELECT first_name, last_name FROM runners WHERE id = ${conflictRunnerId}
            ` as any[];
            
            if (conflictRunner.length > 0) {
              console.log(`⚠️  Bib reassignment: Bib ${runner.bibNumber} transferring from ${conflictRunner[0].first_name} ${conflictRunner[0].last_name} to ${runner.firstName} ${runner.lastName}`);
              
              // Reassign the bib to the new runner (preserving race results linked to this registration)
              await sql`
                UPDATE series_registrations 
                SET runner_id = ${runnerId}, age = ${runner.age}, age_group = ${ageGroup}, updated_at = NOW()
                WHERE series_id = ${seriesId} AND bib_number = ${runner.bibNumber}
              `;
              console.log(`   🔄 Bib ${runner.bibNumber} reassigned to ${runner.firstName} ${runner.lastName}`);
              runnerUpdated = true;
            }
          } else {
            // Same runner already has this bib - this was handled above in the first condition
            console.log(`   ℹ️  Duplicate processing of ${runner.firstName} ${runner.lastName} with bib ${runner.bibNumber}`);
          }
        } else {
          // No conflicts - create new registration
          await sql`
            INSERT INTO series_registrations (series_id, runner_id, bib_number, age, age_group)
            VALUES (${seriesId}, ${runnerId}, ${runner.bibNumber}, ${runner.age}, ${ageGroup})
          `;
          
          // Check if this runner has other bib numbers in this series (indicating a bib change)
          const otherBibs = await sql`
            SELECT bib_number FROM series_registrations 
            WHERE series_id = ${seriesId} AND runner_id = ${runnerId} AND bib_number != ${runner.bibNumber}
          ` as any[];
          
          if (otherBibs.length > 0) {
            const bibList = otherBibs.map((b: any) => b.bib_number).join(', ');
            console.log(`   🔄 ${runner.firstName} ${runner.lastName} changed bib number: had ${bibList}, now also has ${runner.bibNumber}`);
          } else {
            console.log(`   ✅ New registration: ${runner.firstName} ${runner.lastName} with bib ${runner.bibNumber}`);
          }
        }
      }
    } catch (error) {
      // Last resort: if we still get a constraint error, log and skip
      if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
        console.error(`❌ Failed to resolve bib conflict for ${runner.firstName} ${runner.lastName} (bib ${runner.bibNumber})`);
        console.error(`   Skipping this registration to allow scraping to continue`);
        return { created: runnerCreated, updated: false };
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    return { created: runnerCreated, updated: runnerUpdated };
  }

  /**
   * OPTIMIZED: Store runner data in batch with optimized conflict resolution
   */
  private async storeRunnersDataOptimized(sql: any, runners: ScrapedRunner[], seriesId: string): Promise<{
    runnersCreated: number;
    runnersUpdated: number;
    conflictsResolved: number;
  }> {
    let runnersCreated = 0;
    let runnersUpdated = 0;
    
    // OPTIMIZATION 1: Pre-load all existing registrations to avoid N+1 queries
    // NOTE: Bib numbers are race-specific, not series-wide unique!
    // The same bib number can be used by different people in different races.
    const existingRegistrations = await sql`
      SELECT bib_number, runner_id FROM series_registrations 
      WHERE series_id = ${seriesId}
    ` as any[];
    
    const bibToRunnerMap = new Map<string, string>();
    existingRegistrations.forEach((reg: any) => {
      bibToRunnerMap.set(reg.bib_number, reg.runner_id);
    });

    // OPTIMIZATION 2: Process all runners and cache runner IDs
    const runnerCache = new Map<string, string>(); // fullName -> runnerId
    
    // Pre-process all runners to get/create runner IDs and prepare for bulk operations
    for (const runner of runners) {
      const fullName = `${runner.firstName}|${runner.lastName}`;
      let runnerId = runnerCache.get(fullName);
      
      if (!runnerId) {
        // Calculate values needed for runner
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - runner.age;
        
        // Check if runner exists
        const existingRunner = await sql`
          SELECT id FROM runners 
          WHERE first_name = ${runner.firstName} AND last_name = ${runner.lastName} AND birth_year = ${birthYear}
        ` as any[];

        if (existingRunner.length > 0) {
          runnerId = existingRunner[0].id;
          // Update existing runner info
          await sql`
            UPDATE runners SET
              gender = ${runner.gender},
              club = ${runner.club || null},
              updated_at = NOW()
            WHERE id = ${runnerId}
          `;
          runnersUpdated++;
        } else {
          // Create new runner
          const newRunner = await sql`
            INSERT INTO runners (first_name, last_name, gender, birth_year, club)
            VALUES (${runner.firstName}, ${runner.lastName}, ${runner.gender}, ${birthYear}, ${runner.club || null})
            RETURNING id
          ` as any[];
          runnerId = newRunner[0].id;
          runnersCreated++;
        }
        
        runnerCache.set(fullName, runnerId!);
      }

      // Update the bib-to-runner mapping for registration upserts
      // NOTE: We no longer treat different runners with same bib as "conflicts"
      // because bib numbers are race-specific, not series-wide unique
      if (runnerId) {
        const existingRunnerId = bibToRunnerMap.get(runner.bibNumber);
        if (existingRunnerId && existingRunnerId !== runnerId) {
          // Different runner claiming same bib - this is normal across races
          // Log it for visibility but don't treat as error
          console.log(`ℹ️  Bib ${runner.bibNumber}: ${runner.firstName} ${runner.lastName} (was assigned to different runner in another race)`);
          // Update the mapping to the new runner for this batch
          bibToRunnerMap.set(runner.bibNumber, runnerId);
        } else if (!existingRunnerId) {
          // New bib registration
          bibToRunnerMap.set(runner.bibNumber, runnerId);
        }
        // If existingRunnerId === runnerId, same runner same bib - no action needed
      }
    }

    // OPTIMIZATION 3: No longer doing aggressive conflict resolution
    // Previously this would delete ALL registrations with conflicting bib numbers,
    // which caused cascade deletion of race results across multiple races.
    // Now we use intelligent upsert logic instead.

    // OPTIMIZATION 4: Bulk upsert all registrations
    for (const runner of runners) {
      const fullName = `${runner.firstName}|${runner.lastName}`;
      const runnerId = runnerCache.get(fullName);
      if (!runnerId) {
        console.error(`❌ Runner ID not found in cache for ${runner.firstName} ${runner.lastName}`);
        continue;
      }
      
      const ageGroup = this.getAgeGroup(runner.age);
      
      try {
        await sql`
          INSERT INTO series_registrations (series_id, runner_id, bib_number, age, age_group)
          VALUES (${seriesId}, ${runnerId}, ${runner.bibNumber}, ${runner.age}, ${ageGroup})
          ON CONFLICT (series_id, bib_number) DO UPDATE SET
            runner_id = EXCLUDED.runner_id,
            age = EXCLUDED.age,
            age_group = EXCLUDED.age_group,
            updated_at = NOW()
        -- Note: With the UNIQUE(series_id, runner_id) constraint removed, 
        -- runners can now have multiple registrations if they change bib numbers
        `;
      } catch (error) {
        // Last resort: if we still get a constraint error, log and continue
        if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
          console.error(`❌ Failed to resolve bib conflict for ${runner.firstName} ${runner.lastName} (bib ${runner.bibNumber})`);
          console.error(`   Skipping this registration to allow scraping to continue`);
          continue;
        } else {
          throw error;
        }
      }
    }

    return {
      runnersCreated,
      runnersUpdated,
      conflictsResolved: 0 // No longer doing aggressive conflict resolution
    };
  }

  /**
   * Store race result data (idempotent)
   */
  private async storeResultData(sql: any, result: ScrapedRaceResult, raceId: string, seriesId: string): Promise<{created: boolean}> {
    // Find the series registration for this bib number
    const registrationResult = await sql`
      SELECT id FROM series_registrations 
      WHERE series_id = ${seriesId} AND bib_number = ${result.bibNumber}
    ` as any[];

    if (registrationResult.length === 0) {
      console.warn(`⚠️ No registration found for bib ${result.bibNumber} - skipping result`);
      return { created: false };
    }

    const seriesRegistrationId = registrationResult[0].id;

    // Convert times to PostgreSQL intervals
    const gunTimeInterval = this.timeToInterval(result.gunTime);
    const chipTimeInterval = result.chipTime ? this.timeToInterval(result.chipTime) : null;
    const paceInterval = this.timeToInterval(result.pacePerMile);

    // Insert new result (since we cleaned up old ones at race level)
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

    return { created: true };
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
