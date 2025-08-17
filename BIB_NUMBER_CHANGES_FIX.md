# Fix for Multiple Bib Numbers Per Runner

## Problem Description

Previously, the system assumed that each runner would have exactly one bib number per series. However, in reality, runners can change bib numbers during a season (e.g., bib #123 in Race 1, then bib #456 in Race 2 for the same runner).

This caused several issues:
1. **Split Points**: A runner's points were divided across multiple "identities"
2. **Incorrect Standings**: Runners appeared multiple times in standings or had reduced point totals
3. **Database Constraint Violations**: The `UNIQUE(series_id, runner_id)` constraint prevented proper handling

## Solution Overview

The fix involves three main changes:

### 1. Database Schema Change
- **Removed** `UNIQUE(series_id, runner_id)` constraint from `series_registrations` table
- **Kept** `UNIQUE(series_id, bib_number)` constraint (each bib still unique per series)
- **Added** index on `(runner_id, series_id)` for better query performance

### 2. Scraper Logic Update
- Modified scraper to create **new registrations** when a runner gets a new bib number
- Added detection and logging when runners change bib numbers
- Preserved existing race results by not overwriting existing registrations

### 3. Standings Calculation Fix
- Updated participant query to use `DISTINCT ON (runner_id)` to avoid duplicate processing
- Modified race results aggregation to collect results from **all registrations** for each runner
- Ensured points are properly summed across all bib numbers for the same runner

## Files Changed

### Database Migration
- `migrations/1755400000000_allow-multiple-bibs-per-runner.sql` - Removes constraint and adds index

### Scraper Updates
- `lib/scraping/mcrrc-scraper.ts`:
  - Updated `storeRunnerData()` method to handle multiple registrations
  - Enhanced logging for bib number changes
  - Modified optimized batch processing

### Standings Calculation
- `lib/db/utils.ts`:
  - Updated `calculateMCRRCStandings()` to aggregate across all registrations
  - Fixed participant query to prevent duplicate processing
  - Enhanced race results collection

### Testing
- `scripts/test-bib-number-changes.ts` - Comprehensive test script

## How to Apply the Fix

### Step 1: Run Database Migration
```bash
npm run migrate
```

This will execute the migration to remove the constraint and add the new index.

### Step 2: Test the Fix (Optional but Recommended)
```bash
npm run tsx scripts/test-bib-number-changes.ts
```

This creates test data with bib number changes and verifies the fix works correctly.

### Step 3: Recalculate Existing Standings
If you have existing data that might be affected, recalculate standings:

```bash
npm run calculate-standings
```

### Step 4: Monitor Scraping Logs
During future scraping operations, look for these new log messages:
- `🔄 [Runner] changed bib number: had [old], now also has [new]`
- `⚠️ Bib reassignment: Bib [X] transferring from [Runner1] to [Runner2]`

## Expected Behavior After Fix

### For New Bib Changes
When a runner changes bib numbers:
1. **First Race**: Runner gets bib #100, system creates registration
2. **Later Race**: Runner gets bib #200, system creates NEW registration
3. **Standings**: System aggregates points from BOTH registrations

### For Existing Data
- Existing standings will be recalculated to properly aggregate split results
- No data loss - all race results are preserved
- Runners previously appearing multiple times will be consolidated

### Logging Output
```
   🔄 Alice Smith changed bib number: had 100, now also has 200
   ✅ Created new registration: Alice Smith with bib 200
```

## Verification

After applying the fix, verify it's working by:

1. **Check Database**: Runners can have multiple entries in `series_registrations`
2. **Check Standings**: Each runner appears only once in final standings
3. **Check Points**: Points are properly aggregated across all bib numbers
4. **Run Test Script**: `scripts/test-bib-number-changes.ts` should pass

## Rollback Plan

If issues arise, the migration can be reversed:

```sql
-- Re-add the constraint (will fail if data has multiple registrations per runner)
ALTER TABLE series_registrations ADD CONSTRAINT series_registrations_series_id_runner_id_key UNIQUE(series_id, runner_id);

-- Remove the new index
DROP INDEX IF EXISTS idx_series_registrations_runner_series;
```

**Note**: Rolling back will require cleaning up any multiple registrations first.

## Benefits

✅ **Accurate Points**: Runners get full credit for all races regardless of bib changes  
✅ **Correct Standings**: Each runner appears once with aggregated totals  
✅ **Data Integrity**: All historical race results are preserved  
✅ **Future-Proof**: System can handle any number of bib changes per runner  
✅ **Better Logging**: Clear visibility into bib number changes during scraping  

## Impact Assessment

- **Low Risk**: Changes are additive and preserve existing data
- **High Value**: Fixes a critical scoring accuracy issue
- **Performance**: Minimal impact, actually improves some query patterns
- **Maintenance**: Reduces need to manually fix split runner records
