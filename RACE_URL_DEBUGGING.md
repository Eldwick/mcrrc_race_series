# Race URL Debugging Guide

This guide explains how to use the race URL debugging system to test and fix scraping issues with specific race result pages.

## Overview

The race URL debugging system helps you:
- Test scraping on specific MCRRC race URLs
- Identify format issues (table vs non-table layouts)
- Debug extraction problems
- Generate detailed reports for troubleshooting

## Usage Methods

### 1. Web Interface (Recommended)

**Access:** `/admin/race-url-tester`

**Features:**
- User-friendly interface
- Quick test buttons for common problematic URLs
- Real-time results display
- Download debug reports as JSON
- View recent test history

**Steps:**
1. Navigate to Admin → Debug Race URLs
2. Enter the race URL you want to test
3. Click "Test URL" to run the analysis
4. Review the detailed results
5. Download the debug report if needed

### 2. Command Line Scripts

**Interactive Mode:**
```bash
npm run debug:race-scraper:interactive
```

**Single URL Test:**
```bash
npm run debug:race-scraper "https://mcrrc.org/race-results/2024-veterans-day-10k/"
```

## What the Debugger Analyzes

### 1. Page Structure
- **Page Title** - Extracted from HTML `<title>` tag
- **HTML Tables** - Counts and analyzes table structure
- **Table Headers** - Identifies column headers
- **Table Data** - Shows sample rows from each table

### 2. Data Extraction
- **Race Metadata** - Name, date, location, distance
- **Results Count** - Number of race results found
- **Sample Results** - First few results with runner info
- **Format Detection** - Identifies table vs non-table formats

### 3. Error Analysis
- **Scraping Failures** - Specific errors during extraction
- **Format Issues** - Problems with data parsing
- **Network Errors** - Connection or timeout issues

## Common Issues and Solutions

### Issue: No HTML Tables Found
**Symptoms:** `hasTable: false`, `tableCount: 0`
**Cause:** Results are in a different format (divs, lists, plain text)
**Solution:** Update scraper to handle non-table formats

### Issue: Wrong Table Headers
**Symptoms:** Headers don't match expected columns
**Cause:** Table structure varies from expected format
**Solution:** Make header detection more flexible

### Issue: Empty Results
**Symptoms:** `resultCount: 0` but page has data
**Cause:** Scraper can't parse the specific format
**Solution:** Add format-specific parsing logic

### Issue: Incorrect Data Extraction
**Symptoms:** Wrong names, times, or placements
**Cause:** Column mapping issues
**Solution:** Debug column order and data parsing

## Debug Report Structure

```json
{
  "url": "https://mcrrc.org/race-results/2024-example/",
  "pageTitle": "Example Race Results",
  "hasTable": true,
  "tableCount": 1,
  "tableInfo": [
    {
      "index": 0,
      "rowCount": 150,
      "columnCount": 6,
      "headers": ["Place", "Name", "Time", "Age", "Gender", "Bib"],
      "sampleRows": [
        ["1", "John Smith", "18:45", "25", "M", "123"]
      ]
    }
  ],
  "extractedData": {
    "raceName": "Example 5K",
    "raceDate": "2024-01-15",
    "raceLocation": "City Park",
    "raceDistance": "3.1",
    "resultCount": 149,
    "sampleResults": [...]
  },
  "errors": []
}
```

## Adding Support for New Formats

### 1. Identify the Format
Use the debugger to understand the page structure:
- Are results in tables or other elements?
- What are the column headers?
- How is race metadata stored?

### 2. Update the Scraper
Modify `lib/scraping/mcrrc-scraper.ts`:
- Add format detection logic
- Implement new extraction methods
- Handle edge cases

### 3. Test the Changes
Use the debugger to verify your fixes:
- Test on the problematic URL
- Verify all data extracts correctly
- Check for regression on working URLs

## File Locations

- **Debugger Script:** `scripts/debug-race-scraper.ts`
- **Web Interface:** `src/pages/admin/RaceUrlTesterPage.tsx`
- **API Endpoint:** `api/debug/race-scraper.ts`
- **Main Scraper:** `lib/scraping/mcrrc-scraper.ts`
- **Debug Reports:** `debug-reports/` (auto-created)

## Tips for Effective Debugging

1. **Start with the web interface** - easier to use and visualize results
2. **Save debug reports** - useful for comparing before/after changes
3. **Test multiple URLs** - ensure fixes don't break other races
4. **Check table structure first** - most issues are format-related
5. **Use sample rows** - help understand data layout quickly

## Example Workflow

1. **Discover Issue:** Notice a race with 0 results after scraping
2. **Get the URL:** Find the MCRRC race results URL
3. **Run Debugger:** Test the URL using the web interface
4. **Analyze Results:** Check table structure and errors
5. **Identify Problem:** No tables found, results in div elements
6. **Update Scraper:** Add div-based extraction logic
7. **Test Fix:** Re-run debugger to verify the fix
8. **Deploy:** Update production with the improved scraper

This system makes it much easier to diagnose and fix race scraping issues quickly and systematically.
