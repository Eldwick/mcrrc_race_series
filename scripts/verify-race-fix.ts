#!/usr/bin/env tsx

import 'dotenv/config';
import { MCRRCScraper } from '../lib/scraping/mcrrc-scraper.ts';

/**
 * Quick verification script to test if scraping fixes are working correctly
 * Use this after debugging and fixing scraping issues
 */
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error('❌ Error: Please provide a race URL');
    console.log('Usage: npm run verify-race-fix "https://mcrrc.org/race-result/....."');
    process.exit(1);
  }
  
  console.log(`\n🔍 Verifying scraping fix for: ${url}\n`);
  
  try {
    const scraper = new MCRRCScraper();
    const scrapedData = await scraper.scrapeRace(url);
    
    if (!scrapedData.results.length) {
      console.error('❌ No results scraped - there may still be an issue');
      process.exit(1);
    }
    
    console.log(`✅ Success! Scraped ${scrapedData.results.length} results`);
    console.log(`👥 Found ${scrapedData.runners.length} runners`);
    
    // Show first 10 results to verify names are not truncated
    console.log(`\n📊 Sample results (checking for name truncation):`);
    scrapedData.results.slice(0, 10).forEach((result, index) => {
      const runner = scrapedData.runners.find(r => r.bibNumber === result.bibNumber);
      const name = `${runner?.firstName} ${runner?.lastName}`.trim();
      const nameStatus = name.length > 4 ? '✅' : '❌ (truncated?)';
      console.log(`   ${index + 1}: ${name} (${result.bibNumber}) - ${result.gunTime} ${nameStatus}`);
    });
    
    // Check for suspicious truncation patterns (avoid flagging short but valid names like "Li")
    const isSuspiciousFirstName = (firstName: string | undefined) => {
      if (!firstName) return true;
      const fn = firstName.trim();
      if (fn.length === 0) return true;
      // Legit short names (2 letters) should not be flagged if purely alphabetic
      if (fn.length === 2 && /^[A-Za-z]+$/.test(fn)) return false;
      // Flag if extremely short (1 char) or contains obvious noise
      if (fn.length < 2) return true;
      if (/^[0-9]/.test(fn)) return true;
      if (/\//.test(fn)) return true; // ratios like 1/172 bleeding in
      if (fn.startsWith('las ') || fn.startsWith('an ') || fn.startsWith('ey ')) return true;
      return false;
    };

    const truncatedNames = scrapedData.runners.filter(r => isSuspiciousFirstName(r.firstName));
    
    if (truncatedNames.length > 0) {
      console.log(`\n⚠️  Possible name truncation issues found:`);
      truncatedNames.slice(0, 5).forEach(runner => {
        console.log(`   - "${runner.firstName} ${runner.lastName}" (bib ${runner.bibNumber})`);
      });
      console.log(`\n💡 Consider checking the fixed-width column boundaries`);
    } else {
      console.log(`\n🎉 No obvious name truncation issues detected!`);
    }
    
    console.log(`\n📋 Summary:`);
    console.log(`   Race: ${scrapedData.name || 'Unknown'}`);
    console.log(`   Date: ${scrapedData.date || 'Unknown'}`);
    console.log(`   Results: ${scrapedData.results.length}`);
    console.log(`   Status: ${truncatedNames.length === 0 ? 'LOOKS GOOD' : 'NEEDS REVIEW'}`);

    // Diagnostics: check places coverage
    const places = new Set(scrapedData.results.map(r => r.place));
    const maxPlace = Math.max(...scrapedData.results.map(r => r.place));
    const missingPlaces: number[] = [];
    for (let p = 1; p <= maxPlace; p++) {
      if (!places.has(p)) missingPlaces.push(p);
    }
    console.log(`\n🧪 Diagnostics:`);
    console.log(`   Max place: ${isFinite(maxPlace) ? maxPlace : 'N/A'}`);
    console.log(`   Unique places: ${places.size}`);
    if (missingPlaces.length > 0) {
      console.log(`   Missing places count: ${missingPlaces.length}`);
      console.log(`   First 20 missing: ${missingPlaces.slice(0, 20).join(', ')}`);
    } else {
      console.log(`   No missing places from 1..${maxPlace}`);
    }
    
    if (truncatedNames.length === 0) {
      console.log(`\n✅ The scraping fix appears to be working correctly!`);
      console.log(`💡 To save this race to the database, run:`);
      console.log(`   npm run scrape-single-race "${url}"`);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n❌ Verification cancelled by user');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
