#!/usr/bin/env tsx

/**
 * Scrape Historical Race Results
 * 
 * This script takes the discovered historical race URLs and scrapes the actual
 * race results data (runners, times, etc.) from each URL for 2023 and earlier.
 * 
 * Usage:
 *   DATABASE_URL="..." npm run scrape:historical:results
 *   DATABASE_URL="..." tsx scripts/scrape-historical-race-results.ts
 * 
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 */

import { getSql } from '../lib/db/connection.js';
import { MCRRCScraper } from '../lib/scraping/mcrrc-scraper.js';
import 'dotenv/config';

// Historical race URLs discovered by the scraping script
const BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT = [
    {
      "name": "Kemp Mill (C)hills",
      "result_urls": {
        "2018": "https://mcrrc.org/race-result/kemp-mill-chills-10k/",
        "2019": "https://mcrrc.org/race-result/kemp-mill-chills-10k-2/",
        "2020": "https://mcrrc.org/race-result/kemp-mill-chill-10k/",
        "2022": "https://mcrrc.org/race-result/kemp-mill-chill-10k-2/",
        "2023": "https://mcrrc.org/race-result/kemp-mill-chill-10k-3/",
        "2024": "https://mcrrc.org/race-result/kemp-mill-chill-10k-4/"
      }
    },
    {
      "name": "Piece of Cake",
      "result_urls": {
        "2000": "https://mcrrc.org/race-result/mcrrc-piece-of-cake-10k2-78k-2/",
        "2001": "https://mcrrc.org/race-result/piece-of-cake/",
        "2002": "https://mcrrc.org/race-result/piece-of-cake-2/",
        "2003": "https://mcrrc.org/race-result/piece-of-cake-10k-cs/",
        "2004": "https://mcrrc.org/race-result/piece-of-cake-10k-cs-2/",
        "2005": "https://mcrrc.org/race-result/piece-of-cake-10k-cs-3/",
        "2006": "https://mcrrc.org/race-result/piece-of-cake-10k-cs-4/",
        "2008": "https://mcrrc.org/race-result/piece-of-cake-10k-4/",
        "2009": "https://mcrrc.org/race-result/piece-of-cake-10k-and-2-78k/",
        "2010": "https://mcrrc.org/race-result/piece-of-cake-3/",
        "2011": "https://mcrrc.org/race-result/piece-of-cake-10k-5/",
        "2012": "https://mcrrc.org/race-result/piece-of-cake-10k-6/",
        "2013": "https://mcrrc.org/race-result/piece-of-cake-10k-cs-5/",
        "2014": "https://mcrrc.org/race-result/piece-of-cake-10k-7/",
        "2015": "https://mcrrc.org/race-result/piece-of-cake-10k-8/",
        "2016": "https://mcrrc.org/race-result/piece-cake-10k/",
        "2017": "https://mcrrc.org/race-result/piece-cake-10k-2/",
        "2018": "https://mcrrc.org/race-result/piece-of-cake-10k-2018/",
        "2019": "https://mcrrc.org/race-result/piece-of-cake-10k-9/",
        "2021": "https://mcrrc.org/race-result/piece-of-cake-10k-10/",
        "2022": "https://mcrrc.org/race-result/piece-of-cake-10k-11/",
        "2023": "https://mcrrc.org/race-result/piece-of-cake-10k-12/",
        "2024": "https://mcrrc.org/race-result/piece-of-cake-10k-13/"
      }
    },
    {
      "name": "Capital for a Day",
      "result_urls": {
        "2009": "https://mcrrc.org/race-result/capital-for-a-day/",
        "2010": "https://mcrrc.org/race-result/brookeville-capital-for-a-day-5k/",
        "2011": "https://mcrrc.org/race-result/brookeville-capital-for-a-day/",
        "2013": "https://mcrrc.org/race-result/brookeville-5k-capital-for-a-day/",
        "2014": "https://mcrrc.org/race-result/capital-for-a-day-5k/",
        "2015": "https://mcrrc.org/race-result/capital-for-a-day-5k-2/",
        "2016": "https://mcrrc.org/race-result/capital-day-5k-3/",
        "2017": "https://mcrrc.org/race-result/capital-day-5k/",
        "2018": "https://mcrrc.org/race-result/capital-for-a-day-5k-3/",
        "2019": "https://mcrrc.org/race-result/capital-for-a-day-5k-4/",
        "2022": "https://mcrrc.org/race-result/capital-for-a-day-2/",
        "2023": "https://mcrrc.org/race-result/capital-for-a-day-5k-5/",
        "2024": "https://mcrrc.org/race-result/capital-for-a-day-5k-6/"
      }
    },
    {
      "name": "Memorial Day 4 Miler",
      "result_urls": {
        "2011": "https://mcrrc.org/race-result/memorial-4-mile/",
        "2012": "https://mcrrc.org/race-result/memorial-day-4-miler/",
        "2013": "https://mcrrc.org/race-result/memorial-day-4-miler-2/",
        "2014": "https://mcrrc.org/race-result/memorial-4-mile-2/",
        "2015": "https://mcrrc.org/race-result/memorial-day-4-mile/",
        "2016": "https://mcrrc.org/race-result/memorial-day-4-mile-2/",
        "2017": "https://mcrrc.org/race-result/memorial-day-4-mile-3/",
        "2018": "https://mcrrc.org/race-result/memorial-day-4-mile-4/",
        "2019": "https://mcrrc.org/race-result/memorial-4-mile-3/",
        "2022": "https://mcrrc.org/race-result/memorial-day-4-miler-3/",
        "2023": "https://mcrrc.org/race-result/memorial-day-4-miler-4/",
        "2024": "https://mcrrc.org/race-result/memorial-4-mile-4/"
      }
    },
    {
      "name": "Midsummer Night's Mile",
      "result_urls": {
        "2000": "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-3/",
        "2001": "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-4/",
        "2002": "https://mcrrc.org/race-result/midsummer-nights-mile-csjp/",
        "2003": "https://mcrrc.org/race-result/midsummer-nights-mile-cs/",
        "2004": "https://mcrrc.org/race-result/midsummer-nights-mile-cs-2/",
        "2005": "https://mcrrc.org/race-result/midsummer-nights-mile-cs-3/",
        "2006": "https://mcrrc.org/race-result/midsummer-nights-mile-cs-jp/",
        "2007": "https://mcrrc.org/race-result/midsummer-nights-mile-rockville/",
        "2008": "https://mcrrc.org/race-result/midsummer-nights-mile-3/",
        "2009": "https://mcrrc.org/race-result/midsummer-nights-mile-4/",
        "2010": "https://mcrrc.org/race-result/midsummer-nights-mile-5/",
        "2011": "https://mcrrc.org/race-result/midsummer-nights-mile-6/",
        "2012": "https://mcrrc.org/race-result/midsummers-night-mile/",
        "2013": "https://mcrrc.org/race-result/midsummer-nights-mile-7/",
        "2014": "https://mcrrc.org/race-result/midsummer-nights-mile-8/",
        "2015": "https://mcrrc.org/race-result/midsummer-nights-mile-9/",
        "2016": "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-5/",
        "2017": "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-6/",
        "2018": "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-7/",
        "2019": "https://mcrrc.org/race-result/midsummer-nights-mile-cs-4/",
        "2021": "https://mcrrc.org/race-result/midsummer-nights-mile-11/",
        "2022": "https://mcrrc.org/race-result/mcrrc-midsummer-nights-mile-8/",
        "2023": "https://mcrrc.org/race-result/midsummer-nights-mile-10/",
        "2024": "https://mcrrc.org/race-result/midsummer-nights-mile-12/"
      }
    },
    {
      "name": "Riley's Rumble Half Marathon",
      "result_urls": {
        "2000": "https://mcrrc.org/race-result/mcrrc-rileys-rumble/",
        "2001": "https://mcrrc.org/race-result/mcrrc-rileys-rumble-2/",
        "2002": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-cs/",
        "2003": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-cs-2/",
        "2004": "https://mcrrc.org/race-result/rileys-rumble-half-marathon/",
        "2005": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-cs-3/",
        "2006": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-cs-4/",
        "2007": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-2/",
        "2008": "https://mcrrc.org/race-result/rileys-rumble/",
        "2009": "https://mcrrc.org/race-result/rileys-rumble-2/",
        "2011": "https://mcrrc.org/race-result/rileys-rumble-3/",
        "2012": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-3/",
        "2013": "https://mcrrc.org/race-result/riley-rumble-half-marathon/",
        "2014": "https://mcrrc.org/race-result/rileys-rumble-4/",
        "2015": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-4/",
        "2016": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-5/",
        "2017": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-6/",
        "2019": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-8/",
        "2021": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-9/",
        "2022": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-10/",
        "2023": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-11/",
        "2024": "https://mcrrc.org/race-result/rileys-rumble-half-marathon-12/"
      }
    },
    {
      "name": "Going Green Track Meet",
      "result_urls": {
        "2010": "https://mcrrc.org/race-result/going-green-2-mile/",
        "2011": "https://mcrrc.org/race-result/going-green-2-mile-2/",
        "2016": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile/",
        "2017": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run/",
        "2018": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-2/",
        "2019": "https://mcrrc.org/race-result/going-green-2-mile-cs/",
        "2021": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-3/",
        "2022": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-4/",
        "2023": "https://mcrrc.org/race-result/going-green-track-meet-2-mile-run/",
        "2024": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-5/"
      }
    },
    {
      "name": "Matthew Henson Trail",
      "result_urls": {
        "2013": "https://mcrrc.org/race-result/matthew-henson-5k/",
        "2014": "https://mcrrc.org/race-result/matthew-henson-trail-5k/",
        "2015": "https://mcrrc.org/race-result/matthew-henson-trail-5k-2/",
        "2016": "https://mcrrc.org/race-result/mcrrc-matthew-henson-trail-5k/",
        "2017": "https://mcrrc.org/race-result/mcrrc-matthew-henson-trail-5k-2/",
        "2018": "https://mcrrc.org/race-result/matthew-henson-trail-5k-3/",
        "2019": "https://mcrrc.org/race-result/matthew-henson-5k-2/",
        "2022": "https://mcrrc.org/race-result/matthew-henson-5k-3/",
        "2023": "https://mcrrc.org/race-result/matthew-henson-5k-4/",
        "2024": "https://mcrrc.org/race-result/matthew-henson-5k-5/"
      }
    },
    {
      "name": "Eastern County",
      "result_urls": {
        "2013": "https://mcrrc.org/race-result/eastern-county-8k/",
        "2014": "https://mcrrc.org/race-result/eastern-county-8k-2/",
        "2015": "https://mcrrc.org/race-result/eastern-county-8k-3/",
        "2016": "https://mcrrc.org/race-result/eastern-county-8k-4/",
        "2017": "https://mcrrc.org/race-result/eastern-county-8k-5/",
        "2018": "https://mcrrc.org/race-result/eastern-county-8k-6/",
        "2019": "https://mcrrc.org/race-result/eastern-county-8k-7/",
        "2021": "https://mcrrc.org/race-result/eastern-county-8k-8/",
        "2022": "https://mcrrc.org/race-result/eastern-county-8k-9/",
        "2023": "https://mcrrc.org/race-result/eastern-county-8k-10/",
        "2024": "https://mcrrc.org/race-result/eastern-county-8k-11/"
      }
    },
    {
      "name": "Country Road Run",
      "result_urls": {
        "2000": "https://mcrrc.org/race-result/mcrrc-country-road-run-8-kilometer/",
        "2001": "https://mcrrc.org/race-result/mcrrc-country-road-run/",
        "2002": "https://mcrrc.org/race-result/country-road-5-mile/",
        "2003": "https://mcrrc.org/race-result/country-road-run-5m-cs/",
        "2004": "https://mcrrc.org/race-result/country-road-run-5m/",
        "2005": "https://mcrrc.org/race-result/country-road-run-5m-cs-2/",
        "2006": "https://mcrrc.org/race-result/country-road-run-5m-cs-3/",
        "2007": "https://mcrrc.org/race-result/country-road-run-5m-olney/",
        "2008": "https://mcrrc.org/race-result/country-road-run-2/",
        "2009": "https://mcrrc.org/race-result/country-road-run-5mi/",
        "2010": "https://mcrrc.org/race-result/country-road-run-3/",
        "2011": "https://mcrrc.org/race-result/country-road-run-5mi-2/",
        "2012": "https://mcrrc.org/race-result/country-road-run-5mi-3/",
        "2013": "https://mcrrc.org/race-result/country-road-run-5m-cs-4/",
        "2014": "https://mcrrc.org/race-result/country-road-run-5-mile/",
        "2015": "https://mcrrc.org/race-result/country-road-run-5m-2/",
        "2016": "https://mcrrc.org/race-result/country-road-run-4/",
        "2017": "https://mcrrc.org/race-result/country-road-run-3-5-mile/",
        "2018": "https://mcrrc.org/race-result/country-road-5-miler/",
        "2019": "https://mcrrc.org/race-result/country-road-5-miler-2/",
        "2020": "https://mcrrc.org/race-result/country-road-run-5/",
        "2022": "https://mcrrc.org/race-result/country-road-5k/",
        "2023": "https://mcrrc.org/race-result/country-road-5k-2/",
        "2024": "https://mcrrc.org/race-result/country-road-5k-3/"
      }
    },
    {
      "name": "Turkey Burnoff",
      "result_urls": {
        "2005": "https://mcrrc.org/race-result/turkey-burnoff-10m-cs/",
        "2010": "https://mcrrc.org/race-result/turkey-burnoff-10-mile/",
        "2011": "https://mcrrc.org/race-result/turkey-burnoff-10mi/",
        "2012": "https://mcrrc.org/race-result/turkey-burnoff-10-mile-2/",
        "2013": "https://mcrrc.org/race-result/turkey-burnoff-10mi-2/",
        "2014": "https://mcrrc.org/race-result/turkey-burnoff-10-mile-3/",
        "2015": "https://mcrrc.org/race-result/turkey-burnoff-10-mile-4/",
        "2016": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile/",
        "2017": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile-cs/",
        "2018": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile-cs-2/",
        "2019": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile-2/",
        "2021": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile-3/",
        "2022": "https://mcrrc.org/race-result/turkey-burnoff-10-mile-5/",
        "2023": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile-4/",
        "2024": "https://mcrrc.org/race-result/turkey-burnoff-10-mile-5-2/"
      }
    },
    {
      "name": "Jingle Bell Jog",
      "result_urls": {
        "2000": "https://mcrrc.org/race-result/mcrrc-jingle-bell-jog/",
        "2001": "https://mcrrc.org/race-result/jingle-bell-jog/",
        "2002": "https://mcrrc.org/race-result/jingle-bell-jog-8k-2/",
        "2004": "https://mcrrc.org/race-result/jingle-bell-jog-8km-2/",
        "2005": "https://mcrrc.org/race-result/jingle-bell-jog-8k-cs/",
        "2006": "https://mcrrc.org/race-result/jingle-bell-jog-8k-cs-2/",
        "2007": "https://mcrrc.org/race-result/jingle-bell-jog-8k-3/",
        "2008": "https://mcrrc.org/race-result/jingle-bell-jog-2/",
        "2009": "https://mcrrc.org/race-result/jingle-bell-jog-8k-4/",
        "2010": "https://mcrrc.org/race-result/jingle-bell-jog-8k-5/",
        "2011": "https://mcrrc.org/race-result/jingle-bell-jog-8k-6/",
        "2012": "https://mcrrc.org/race-result/jingle-bell-jog-8k-7/",
        "2013": "https://mcrrc.org/race-result/jingle-bell-jog-3/",
        "2014": "https://mcrrc.org/race-result/jingle-bell-jog-4/",
        "2015": "https://mcrrc.org/race-result/jingle-bell-jog-5/",
        "2016": "https://mcrrc.org/race-result/jingle-bell-jog-6/",
        "2017": "https://mcrrc.org/race-result/jingle-bell-jog-8k-8/",
        "2018": "https://mcrrc.org/race-result/jingle-bell-jog-8k-9/",
        "2019": "https://mcrrc.org/race-result/jingle-bell-jog-7/",
        "2021": "https://mcrrc.org/race-result/jingle-bell-jog-8/",
        "2022": "https://mcrrc.org/race-result/jingle-bell-jog-8k-10/",
        "2023": "https://mcrrc.org/race-result/jingle-bell-jog-8k-11/",
        "2024": "https://mcrrc.org/race-result/mcrrc-jingle-bell-jog-8k-2/"
      }
    }
  ];

interface HistoricalRaceResult {
  name: string;
  result_urls: {
    [year: string]: string | undefined;
  };
}

interface ScrapingProgress {
  totalRaces: number;
  totalUrls: number;
  completedUrls: number;
  skippedUrls: number;
  errorUrls: number;
  startTime: Date;
}

class HistoricalRaceResultsScraper {
  private sql: any;
  private scraper: MCRRCScraper;
  private progress: ScrapingProgress;

  constructor() {
    this.sql = getSql();
    this.scraper = new MCRRCScraper();
    this.progress = {
      totalRaces: 0,
      totalUrls: 0,
      completedUrls: 0,
      skippedUrls: 0,
      errorUrls: 0,
      startTime: new Date()
    };
  }

  /**
   * Main execution function
   */
  async scrapeAllHistoricalResults(targetYears?: number[]): Promise<void> {
    console.log('🏃‍♂️ MCRRC Historical Race Results Scraper');
    console.log('=' .repeat(60));
    console.log('');

    // Calculate total work
    this.calculateTotalWork(targetYears);
    
    console.log(`📊 Scraping Plan:`);
    console.log(`   Races: ${this.progress.totalRaces}`);
    console.log(`   URLs: ${this.progress.totalUrls}`);
    if (targetYears) {
      console.log(`   Target years: ${targetYears.join(', ')}`);
    } else {
      console.log(`   Target years: All (2000-2024)`);
    }
    console.log('');

    // Process each race
    for (const raceData of BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT) {
      await this.scrapeRaceResults(raceData, targetYears);
    }

    this.printFinalSummary();
  }

  /**
   * Calculate total work to be done
   */
  private calculateTotalWork(targetYears?: number[]): void {
    this.progress.totalRaces = BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT.length;
    this.progress.totalUrls = 0;

    for (const raceData of BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT) {
      const years = Object.keys(raceData.result_urls).filter(year => raceData.result_urls[year] !== undefined);
      const filteredYears = targetYears 
        ? years.filter(year => targetYears.includes(parseInt(year)))
        : years;
      this.progress.totalUrls += filteredYears.length;
    }
  }

  /**
   * Scrape results for a single race across all years
   */
  private async scrapeRaceResults(raceData: HistoricalRaceResult, targetYears?: number[]): Promise<void> {
    console.log(`\n🏁 Processing: ${raceData.name}`);
    console.log('   ' + '='.repeat(50));

    const years = Object.keys(raceData.result_urls).filter(year => raceData.result_urls[year] !== undefined);
    const filteredYears = targetYears 
      ? years.filter(year => targetYears.includes(parseInt(year)))
      : years;

    filteredYears.sort((a, b) => parseInt(b) - parseInt(a)); // Latest first

    console.log(`   📅 Years to process: ${filteredYears.length} (${filteredYears.join(', ')})`);

    for (const year of filteredYears) {
      const url = raceData.result_urls[year];
      if (url) { // Additional safety check
        await this.scrapeAndStoreRaceResult(raceData.name, parseInt(year), url);
      }
    }
  }

  /**
   * Get or create series for a given year
   */
  private async getOrCreateSeries(year: number): Promise<string> {
    // First try to find existing series for this year
    const existingSeries = await this.sql`
      SELECT id FROM series 
      WHERE name = 'MCRRC Championship Series' 
      AND year = ${year}
      LIMIT 1
    `;

    if (existingSeries.length > 0) {
      return existingSeries[0].id;
    }

    // Create new series for this year
    const newSeries = await this.sql`
      INSERT INTO series (name, year, description, is_active)
      VALUES (
        'MCRRC Championship Series',
        ${year},
        ${`Montgomery County Road Runners Club Championship Series for ${year}`},
        ${year === new Date().getFullYear()}
      )
      RETURNING id
    `;

    console.log(`      📅 Created new series for ${year}`);
    return newSeries[0].id;
  }

  /**
   * Scrape and store a single race result
   */
  private async scrapeAndStoreRaceResult(raceName: string, year: number, url: string): Promise<void> {
    try {
      console.log(`   📄 ${year}: Scraping ${url}`);

      // Get or create series for this year
      const seriesId = await this.getOrCreateSeries(year);

      // Check if race already exists in database
      const existingRace = await this.sql`
        SELECT id FROM races 
        WHERE name ILIKE ${`%${raceName}%`} 
        AND year = ${year}
        AND mcrrc_url = ${url}
        LIMIT 1
      `;

      if (existingRace.length > 0) {
        console.log(`      ⏭️  Already exists - skipping`);
        this.progress.skippedUrls++;
        return;
      }

      // Scrape the race
      const scrapedRace = await this.scraper.scrapeRace(url);
      
      // Store in database using the existing scraper methods
      await this.scraper.storeRaceData(scrapedRace, seriesId);
      
      console.log(`      ✅ Scraped ${scrapedRace.results.length} results`);
      this.progress.completedUrls++;

      // Add small delay to be respectful to the server (reduced due to optimizations)
      await this.delay(1000);

    } catch (error) {
      console.log(`      ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.progress.errorUrls++;
    }

    // Print progress every 5 URLs
    if ((this.progress.completedUrls + this.progress.skippedUrls + this.progress.errorUrls) % 5 === 0) {
      this.printProgress();
    }
  }

  /**
   * Print current progress
   */
  private printProgress(): void {
    const completed = this.progress.completedUrls + this.progress.skippedUrls;
    const total = this.progress.totalUrls;
    const percentage = Math.round((completed / total) * 100);
    const elapsed = (Date.now() - this.progress.startTime.getTime()) / 1000;
    const rate = completed / elapsed;
    const remaining = (total - completed) / rate;

    console.log(`\n📊 Progress: ${completed}/${total} (${percentage}%) | ` +
                `✅ ${this.progress.completedUrls} | ⏭️  ${this.progress.skippedUrls} | ❌ ${this.progress.errorUrls} | ` +
                `⏱️  ${Math.round(remaining)}s remaining`);
  }

  /**
   * Print final summary
   */
  private printFinalSummary(): void {
    const elapsed = (Date.now() - this.progress.startTime.getTime()) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Final Results:`);
    console.log(`   Total URLs processed: ${this.progress.totalUrls}`);
    console.log(`   ✅ Successfully scraped: ${this.progress.completedUrls}`);
    console.log(`   ⏭️  Already existed (skipped): ${this.progress.skippedUrls}`);
    console.log(`   ❌ Errors: ${this.progress.errorUrls}`);
    console.log(`   ⏱️  Total time: ${Math.round(elapsed)} seconds`);
    console.log(`   🚀 Average rate: ${Math.round(this.progress.completedUrls / elapsed * 60)} races/minute`);
    
    if (this.progress.errorUrls > 0) {
      console.log(`\n⚠️  Note: ${this.progress.errorUrls} URLs failed to scrape. This is normal for very old races with different page formats.`);
    }
  }

  /**
   * Helper to add delays between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution
 */
async function main() {
  const scraper = new HistoricalRaceResultsScraper();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let targetYears: number[] | undefined;
  
  if (args.includes('--2023-only')) {
    targetYears = [2023];
  } else if (args.includes('--2024-and-before')) {
    targetYears = Array.from({length: 25}, (_, i) => 2024 - i); // 2024 down to 2000
  } else if (args.includes('--recent')) {
    targetYears = [2024, 2023, 2022, 2021, 2020]; // Last 5 years
  }

  try {
    await scraper.scrapeAllHistoricalResults(targetYears);
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { HistoricalRaceResultsScraper };
