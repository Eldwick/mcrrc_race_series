#!/usr/bin/env tsx

/**
 * Race URL Scraping Debugger
 * 
 * This script allows you to test race scraping on specific URLs to debug
 * formatting issues, especially for races that aren't in standard HTML table format.
 * 
 * Usage:
 *   npm run debug-race-scraper <url>
 *   npm run debug-race-scraper --interactive
 * 
 * Features:
 * - Detailed HTML analysis
 * - Format detection (table vs non-table)
 * - Step-by-step scraping debug output
 * - Raw data extraction preview
 * - Error handling and reporting
 */

import { MCRRCScraper } from '../lib/scraping/mcrrc-scraper.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DebugInfo {
  url: string;
  pageTitle: string;
  hasTable: boolean;
  tableCount: number;
  tableInfo: Array<{
    index: number;
    rowCount: number;
    columnCount: number;
    headers: string[];
    sampleRows: string[][];
  }>;
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

class RaceScrapeDebugger {
  private scraper: MCRRCScraper;

  constructor() {
    this.scraper = new MCRRCScraper();
  }

  /**
   * Debug scraping for a specific URL
   */
  async debugRaceUrl(url: string): Promise<DebugInfo> {
    console.log(`\n🔍 Debugging race scraping for: ${url}\n`);

    const debugInfo: DebugInfo = {
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
      const response = await axios.get(url);
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

        const tableInfo = {
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
        console.log(`🔍 Found ${debugInfo.textContent.possibleResults.length} lines that might be results:`);
        debugInfo.textContent.possibleResults.forEach((line, i) => {
          console.log(`  ${i + 1}: ${line}`);
        });
      }

      // Step 5: Try actual scraping
      console.log('\n🚀 Attempting to scrape with current logic...');
      try {
        const scrapedRace = await this.scraper.scrapeRace(url);
        
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
        
        if (debugInfo.extractedData.sampleResults.length > 0) {
          console.log(`  Sample results:`);
          debugInfo.extractedData.sampleResults.forEach(result => {
            console.log(`    ${result.place}: ${result.runner?.firstName} ${result.runner?.lastName} (${result.bib}) - ${result.time}`);
          });
        }

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

    return debugInfo;
  }

  /**
   * Save debug info to file for detailed analysis
   */
  async saveDebugReport(debugInfo: DebugInfo): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debug-race-${timestamp}.json`;
    const filepath = join(__dirname, '../debug-reports', filename);
    
    try {
      // Create debug-reports directory if it doesn't exist
      const { mkdirSync } = await import('fs');
      const { existsSync } = await import('fs');
      const debugDir = join(__dirname, '../debug-reports');
      
      if (!existsSync(debugDir)) {
        mkdirSync(debugDir, { recursive: true });
      }

      writeFileSync(filepath, JSON.stringify(debugInfo, null, 2));
      console.log(`\n💾 Debug report saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.log(`❌ Failed to save debug report: ${error}`);
      return '';
    }
  }

  /**
   * Interactive mode for testing multiple URLs
   */
  async runInteractive(): Promise<void> {
    console.log('\n🔧 Interactive Race Scraping Debugger');
    console.log('Enter race URLs to test (type "exit" to quit)\n');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };

    while (true) {
      const url = await askQuestion('Enter race URL: ');
      
      if (url.toLowerCase() === 'exit') {
        break;
      }

      if (!url.trim()) {
        continue;
      }

      try {
        const debugInfo = await this.debugRaceUrl(url.trim());
        await this.saveDebugReport(debugInfo);
        
        const continueDebug = await askQuestion('\nDebug another URL? (y/n): ');
        if (continueDebug.toLowerCase() !== 'y') {
          break;
        }
        console.log('\n' + '='.repeat(80) + '\n');
      } catch (error) {
        console.log(`❌ Error: ${error}`);
      }
    }

    rl.close();
    console.log('\n👋 Goodbye!');
  }
}

// Main execution
async function main() {
  const raceScrapeDebugger = new RaceScrapeDebugger();
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--interactive') {
    await raceScrapeDebugger.runInteractive();
  } else {
    const url = args[0];
    const debugInfo = await raceScrapeDebugger.debugRaceUrl(url);
    await raceScrapeDebugger.saveDebugReport(debugInfo);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RaceScrapeDebugger };
