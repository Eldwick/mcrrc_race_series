import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MCRRCScraper } from '../../lib/scraping/mcrrc-scraper';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface DebugRequest {
  url: string;
}

interface TableInfo {
  index: number;
  rowCount: number;
  columnCount: number;
  headers: string[];
  sampleRows: string[][];
}

interface DebugResponse {
  url: string;
  pageTitle: string;
  hasTable: boolean;
  tableCount: number;
  tableInfo: TableInfo[];
  textContent: {
    fullText: string;
    lines: string[];
    possibleResults: string[];
  };
  extractedData: {
    raceName: string;
    raceDate: string;
    raceLocation: string;
    raceDistance: string;
    resultCount: number;
    sampleResults: any[];
  };
  errors: string[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { url }: DebugRequest = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    console.log(`🔍 Debugging race scraping for: ${url}`);

    const debugInfo: DebugResponse = {
      url,
      pageTitle: '',
      hasTable: false,
      tableCount: 0,
      tableInfo: [],
      textContent: {
        fullText: '',
        lines: [],
        possibleResults: []
      },
      extractedData: {
        raceName: '',
        raceDate: '',
        raceLocation: '',
        raceDistance: '',
        resultCount: 0,
        sampleResults: []
      },
      errors: []
    };

    try {
      // Step 1: Fetch the HTML
      console.log('📥 Fetching HTML...');
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCRRC-Championship-Series-Bot)',
          'Accept': 'text/html,application/xhtml+xml',
        }
      });
      
      const $ = cheerio.load(response.data);

      // Step 2: Basic page analysis
      debugInfo.pageTitle = $('title').text().trim();
      console.log(`📄 Page title: ${debugInfo.pageTitle}`);

      // Step 3: Table analysis
      const tables = $('table');
      debugInfo.tableCount = tables.length;
      debugInfo.hasTable = tables.length > 0;
      
      console.log(`📊 Found ${tables.length} table(s)`);

      // Analyze each table
      tables.each((index, table) => {
        if (index >= 3) return; // Limit to first 3 tables
        
        const $table = $(table);
        const rows = $table.find('tr');
        const firstRow = rows.first();
        const headers = firstRow.find('th, td').map((i, el) => $(el).text().trim()).get();
        
        // Get sample data rows (skip header)
        const sampleRows: string[][] = [];
        rows.slice(1, 4).each((i, row) => {
          const cells = $(row).find('td').map((j, cell) => $(cell).text().trim()).get();
          if (cells.length > 0) {
            sampleRows.push(cells);
          }
        });

        const tableInfo: TableInfo = {
          index,
          rowCount: rows.length,
          columnCount: headers.length,
          headers,
          sampleRows
        };

        debugInfo.tableInfo.push(tableInfo);
        
        console.log(`  Table ${index}: ${rows.length} rows, ${headers.length} columns`);
        console.log(`  Headers: ${headers.join(' | ')}`);
        if (sampleRows.length > 0) {
          console.log(`  Sample row: ${sampleRows[0].join(' | ')}`);
        }
      });

      // Step 4: Text content analysis for non-table formats
      const bodyText = $('body').text();
      debugInfo.textContent.fullText = bodyText;
      debugInfo.textContent.lines = bodyText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Look for patterns that might indicate race results
      const resultPatterns = [
        /\d+\s+\d+:\d+:\d+/,  // Place + time
        /\d+\s+[A-Za-z]+\s+[A-Za-z]+\s+\d+:\d+/,  // Place + name + time
        /[MF]\s+\d+\s+\d+:\d+/,  // Gender + age + time
      ];

      debugInfo.textContent.possibleResults = debugInfo.textContent.lines
        .filter(line => resultPatterns.some(pattern => pattern.test(line)))
        .slice(0, 10); // Take first 10 matches

      if (debugInfo.textContent.possibleResults.length > 0) {
        console.log(`🔍 Found ${debugInfo.textContent.possibleResults.length} lines that might be results`);
      }

      // Step 5: Try actual scraping
      console.log('🚀 Attempting to scrape with current logic...');
      try {
        const scraper = new MCRRCScraper();
        const scrapedRace = await scraper.scrapeRace(url);
        
        debugInfo.extractedData = {
          raceName: scrapedRace.name,
          raceDate: scrapedRace.date,
          raceLocation: scrapedRace.location,
          raceDistance: scrapedRace.distance?.toString() || 'Unknown',
          resultCount: scrapedRace.results.length,
          sampleResults: scrapedRace.results.slice(0, 5).map(result => ({
            bib: result.bibNumber,
            place: result.place,
            time: result.gunTime,
            runner: scrapedRace.runners.find(r => r.bibNumber === result.bibNumber)
          }))
        };

        console.log(`✅ Successfully scraped:`);
        console.log(`  Race: ${debugInfo.extractedData.raceName}`);
        console.log(`  Date: ${debugInfo.extractedData.raceDate}`);
        console.log(`  Location: ${debugInfo.extractedData.raceLocation}`);
        console.log(`  Distance: ${debugInfo.extractedData.raceDistance} miles`);
        console.log(`  Results: ${debugInfo.extractedData.resultCount}`);

      } catch (scrapeError) {
        const errorMsg = scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error';
        debugInfo.errors.push(`Scraping failed: ${errorMsg}`);
        console.log(`❌ Scraping failed: ${errorMsg}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      debugInfo.errors.push(`Page fetch failed: ${errorMsg}`);
      console.log(`❌ Failed to fetch page: ${errorMsg}`);
    }

    res.status(200).json(debugInfo);

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
