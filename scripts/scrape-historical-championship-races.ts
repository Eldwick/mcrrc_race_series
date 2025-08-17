#!/usr/bin/env tsx
/**
 * Scrape Historical Championship Series Races
 * 
 * This script finds historical versions of the current MCRRC Championship Series races
 * by scraping the race results page and matching race names across multiple years.
 * 
 * Usage:
 *   npm run scrape:historical
 *   npx tsx scripts/scrape-historical-championship-races.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

// Import the championship series races from the existing script
const CHAMPIONSHIP_SERIES_RACES_2025 = [
  {
    name: "Kemp Mill (C)hills",
    distance: 6.2, // 10K
    estimatedMonth: "February",
    location: "Kemp Mill, MD",
    matchKeywords: ["kemp mill", "chill"],
    order: 1
  },
  {
    name: "Piece of Cake",
    distance: 6.2, // 10K
    estimatedMonth: "March", 
    location: "Wheaton, MD",
    matchKeywords: ["piece of cake", "piece", "cake"],
    order: 2
  },
  {
    name: "Capital for a Day",
    distance: 3.1, // 5K
    estimatedMonth: "April",
    location: "Rockville, MD",
    matchKeywords: ["capital for a day"],
    order: 3
  },
  {
    name: "Memorial Day 4 Miler",
    distance: 4.0, // 4 miles
    estimatedMonth: "May",
    location: "TBD",
    matchKeywords: ["memorial"],
    order: 4
  },
  {
    name: "Midsummer Night's Mile",
    distance: 1.0, // 1 mile
    estimatedMonth: "June",
    location: "Silver Spring, MD",
    matchKeywords: ["midsummer", "night's mile"],
    order: 5
  },
  {
    name: "Riley's Rumble Half Marathon",
    distance: 13.1, // Half marathon
    estimatedMonth: "July",
    location: "Boyds, MD",
    matchKeywords: ["riley", "rumble"],
    order: 6
  },
  {
    name: "Going Green Track Meet", 
    distance: 2.0, // 2 miles
    estimatedMonth: "August",
    location: "Gaithersburg, MD",
    matchKeywords: ["going green"],
    order: 7
  },
  {
    name: "Matthew Henson Trail",
    distance: 3.1, // 5K
    estimatedMonth: "August",
    location: "Silver Spring, MD",
    matchKeywords: ["matthew henson"],
    order: 8
  },
  {
    name: "Eastern County",
    distance: 5.0, // 8K (approximately)
    estimatedMonth: "September",
    location: "Eastern Montgomery County, MD",
    matchKeywords: ["eastern county"],
    order: 9
  },
  {
    name: "Country Road Run",
    distance: 3.1, // 5K
    estimatedMonth: "October", 
    location: "Rural Montgomery County, MD",
    matchKeywords: ["country road"],
    order: 10
  },
  {
    name: "Turkey Burnoff",
    distance: 10.0, // 10 miles
    estimatedMonth: "November",
    location: "TBD",
    matchKeywords: ["turkey burnoff"],
    order: 11
  },
  {
    name: "Jingle Bell Jog",
    distance: 5.0, // 8K (approximately)
    estimatedMonth: "December",
    location: "TBD",
    matchKeywords: ["jingle bell"],
    order: 12
  }
];

const BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT = [
    {
      "name": "Kemp Mill (C)hills",
      "result_urls": {
        "2018": "https://mcrrc.org/race-result/kemp-mill-chills-10k/",
        "2019": "https://mcrrc.org/race-result/kemp-mill-chills-5k-2/",
        "2020": "https://mcrrc.org/race-result/kemp-mill-chill-5k/",
        "2022": "https://mcrrc.org/race-result/kemp-mill-chill-5k-2/",
        "2023": "https://mcrrc.org/race-result/kemp-mill-chill-5k-3/",
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
        "2014": "https://mcrrc.org/race-result/piece-of-cake-5k/",
        "2015": "https://mcrrc.org/race-result/piece-of-cake-10k-8/",
        "2016": "https://mcrrc.org/race-result/piece-cake-5k-3/",
        "2017": "https://mcrrc.org/race-result/piece-cake-5k/",
        "2018": "https://mcrrc.org/race-result/piece-of-cake-5k-2018/",
        "2019": "https://mcrrc.org/race-result/piece-of-cake-10k-9/",
        "2021": "https://mcrrc.org/race-result/piece-of-cake-10k-10/",
        "2022": "https://mcrrc.org/race-result/piece-of-cake-5k-4/",
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
        "2018": "https://mcrrc.org/race-result/kevin-stoddard-memorial-superhero-5k/",
        "2019": "https://mcrrc.org/race-result/kevin-stoddard-memorial-superhero-5k-2/",
        "2021": "https://mcrrc.org/race-result/kevin-stoddard-memorial-superhero-5k-3/",
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
        "2018": "https://mcrrc.org/race-result/rileys-rumble-8k-3/",
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
        "2009": "https://mcrrc.org/race-result/going-green-track-meet/",
        "2010": "https://mcrrc.org/race-result/going-green-2-mile/",
        "2011": "https://mcrrc.org/race-result/going-green-1-mile/",
        "2012": "https://mcrrc.org/race-result/going-green-track-meet-2/",
        "2013": "https://mcrrc.org/race-result/going-green-track-meet-3/",
        "2014": "https://mcrrc.org/race-result/going-green-track-meet-4/",
        "2015": "https://mcrrc.org/race-result/going-green-track-meet-6/",
        "2016": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile/",
        "2017": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run/",
        "2018": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-2/",
        "2019": "https://mcrrc.org/race-result/going-green-2-mile-cs/",
        "2021": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-3/",
        "2022": "https://mcrrc.org/race-result/mcrrc-going-green-2-mile-run-4/",
        "2023": "https://mcrrc.org/race-result/going-green-track-meet-2-mile-run/",
        "2024": "https://mcrrc.org/race-result/mcrrc-going-green-4x400-relay-5/"
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
        "2000": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-3/",
        "2001": "https://mcrrc.org/race-result/turkey-burnoff-2/",
        "2002": "https://mcrrc.org/race-result/turkey-burnoff-5m-10m-cs/",
        "2003": "https://mcrrc.org/race-result/turkey-burnoff-5m-10m-cs-2/",
        "2004": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-5mi-and-10mi/",
        "2005": "https://mcrrc.org/race-result/turkey-burnoff-10m-cs/",
        "2006": "https://mcrrc.org/race-result/turkey-burnoff-5m-2k-fun-run-jp/",
        "2007": "https://mcrrc.org/race-result/turkey-burnoff-10m-5m-gaithersburg/",
        "2008": "https://mcrrc.org/race-result/turkey-burnoff-3/",
        "2009": "https://mcrrc.org/race-result/turkey-burnoff-5-mile/",
        "2010": "https://mcrrc.org/race-result/turkey-burnoff-10-mile/",
        "2011": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-5m/",
        "2012": "https://mcrrc.org/race-result/turkey-burnoff-10-mile-2/",
        "2013": "https://mcrrc.org/race-result/turkey-burnoff-10mi-2/",
        "2014": "https://mcrrc.org/race-result/turkey-burnoff-5-mile-4/",
        "2015": "https://mcrrc.org/race-result/turkey-burnoff-5-mile-5/",
        "2016": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-5-mile/",
        "2017": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-10-mile-cs/",
        "2018": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-5-mile-2/",
        "2019": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-5-mile-3/",
        "2021": "https://mcrrc.org/race-result/mcrrc-turkey-burnoff-5-mile-4/",
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
  ]
  

interface HistoricalRaceResult {
  name: string;
  result_urls: {
    [year: string]: string;
  };
}

interface ScrapedRace {
  title: string;
  url: string;
  date: string;
  year: number;
}

/**
 * Scrape race results from a specific page using WordPress REST API
 */
async function scrapeRaceResultsPage(page: number = 1): Promise<ScrapedRace[]> {
  try {
    const url = `https://mcrrc.org/wp-json/wp/v2/race-result?page=${page}&per_page=100`;
    console.log(`   🔍 Fetching: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.log('   📭 No data or invalid format received');
      return [];
    }

    const data = response.data;
    console.log(`   📄 Found ${data.length} race entries`);
    
    const races: ScrapedRace[] = [];
    
    for (const item of data) {
      const title = item.title?.rendered || item.post_title || item.name || '';
      const link = item.link || item.guid?.rendered || item.permalink || '';
      const dateStr = item.date || item.post_date || item.created || '';
      
      // Extract year from date or title
      const year = extractYearFromString(dateStr + ' ' + title);
      
      if (title && link && year >= 2000 && year <= 2024) {
        races.push({
          title: title.trim(),
          url: link.startsWith('http') ? link : `https://mcrrc.org${link}`,
          date: dateStr,
          year
        });
      }
    }
    
    if (races.length > 0) {
      console.log(`   ✅ Found ${races.length} races (2000-2024)`);
    } else {
      console.log(`   📭 No races found in target year range`);
    }
    
    return races;

  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`   📭 Page ${page} - no more data (400 response)`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return [];
  }
}

/**
 * Extract year from a string (looks for 20XX pattern)
 */
function extractYearFromString(text: string): number {
  const yearMatch = text.match(/20(\d{2})/);
  return yearMatch ? parseInt(`20${yearMatch[1]}`) : 0;
}

/**
 * Scrape all race results from MCRRC race results page with pagination
 */
async function scrapeAllRaceResults(): Promise<ScrapedRace[]> {
  console.log('🔍 Scraping MCRRC race results page with pagination...');
  
  const allRaces: ScrapedRace[] = [];
  const maxPages = 50; // Increased limit for 25 years of historical data
  let currentPage = 1;
  let consecutiveEmptyPages = 0;
  
  while (currentPage <= maxPages && consecutiveEmptyPages < 3) {
    console.log(`\n📄 Scraping page ${currentPage}...`);
    
    const pageRaces = await scrapeRaceResultsPage(currentPage);
    
    if (pageRaces.length > 0) {
      console.log(`   ✅ Found ${pageRaces.length} races on page ${currentPage}`);
      allRaces.push(...pageRaces);
      consecutiveEmptyPages = 0;
    } else {
      console.log(`   📭 No races found on page ${currentPage}`);
      consecutiveEmptyPages++;
    }
    
    currentPage++;
    
    // Add small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Remove duplicates based on URL
  const uniqueRaces = allRaces.filter((race, index, arr) => 
    arr.findIndex(r => r.url === race.url) === index
  );
  
  console.log(`\n📊 Scraping complete:`);
  console.log(`   Pages scraped: ${currentPage - 1}`);
  console.log(`   Total races found: ${allRaces.length}`);
  console.log(`   Unique races: ${uniqueRaces.length}`);
  
  // Log sample of found races for debugging
  if (uniqueRaces.length > 0) {
    console.log('\n🔍 Sample of race data:');
    uniqueRaces.slice(0, 5).forEach((race, i) => {
      console.log(`   ${i + 1}. ${race.year}: ${race.title}`);
      console.log(`      URL: ${race.url}`);
    });
  }
  
  return uniqueRaces;
}

/**
 * Match scraped races to championship series races
 */
function matchRacesToChampionshipSeries(scrapedRaces: ScrapedRace[]): HistoricalRaceResult[] {
  console.log('\n🔍 Matching races to championship series...');
  
  const results: HistoricalRaceResult[] = [];
  const targetYears = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000];
  
  for (const championshipRace of CHAMPIONSHIP_SERIES_RACES_2025) {
    console.log(`\n🏁 Looking for: ${championshipRace.name}`);
    
    const raceResult: HistoricalRaceResult = {
      name: championshipRace.name,
      result_urls: {}
    };
    
    for (const year of targetYears) {
      console.log(`   📅 Searching ${year}...`);
      
      // Find races matching this championship race for this year
      const matchingRaces = scrapedRaces.filter(scraped => {
        if (scraped.year !== year) return false;
        
        const scrapedTitle = scraped.title.toLowerCase();
        
        // Check if any keywords match
        return championshipRace.matchKeywords.some(keyword => {
          const match = scrapedTitle.includes(keyword.toLowerCase());
          if (match) {
            console.log(`      ✅ Match found: "${scraped.title}" (keyword: "${keyword}")`);
          }
          return match;
        });
      });
      
      if (matchingRaces.length > 0) {
        // Take the first match (could be improved with better matching logic)
        raceResult.result_urls[year.toString()] = matchingRaces[0].url;
        console.log(`      🎯 Selected: ${matchingRaces[0].title}`);
      } else {
        console.log(`      ❌ No match found for ${year}`);
      }
    }
    
    // Only include races that have at least one year of results
    if (Object.keys(raceResult.result_urls).length > 0) {
      results.push(raceResult);
    }
  }
  
  return results;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🏃‍♂️ MCRRC Historical Championship Series Race Scraper');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    // Step 1: Scrape all race results from MCRRC
    const scrapedRaces = await scrapeAllRaceResults();
    
    if (scrapedRaces.length === 0) {
      console.log('❌ No races found. The website structure may have changed.');
      console.log('   Please check https://mcrrc.org/races-results/ manually.');
      return;
    }
    
    // Step 2: Match to championship series races
    const historicalResults = matchRacesToChampionshipSeries(scrapedRaces);
    
    // Step 3: Output results in requested format
    console.log('\n' + '='.repeat(60));
    console.log('🎯 HISTORICAL CHAMPIONSHIP SERIES RESULTS');
    console.log('='.repeat(60));
    console.log('');
    
    console.log(JSON.stringify(historicalResults, null, 2));
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Championship races: ${CHAMPIONSHIP_SERIES_RACES_2025.length}`);
    console.log(`   Races with historical data: ${historicalResults.length}`);
    console.log(`   Total historical URLs found: ${historicalResults.reduce((sum, race) => sum + Object.keys(race.result_urls).length, 0)}`);
    
    // Races missing historical data
    const missingRaces = CHAMPIONSHIP_SERIES_RACES_2025.filter(championshipRace =>
      !historicalResults.some(result => result.name === championshipRace.name)
    );
    
    if (missingRaces.length > 0) {
      console.log('\n⚠️  Races missing historical data:');
      missingRaces.forEach(race => {
        console.log(`   - ${race.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as scrapeHistoricalChampionshipRaces };
