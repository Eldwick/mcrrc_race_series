# Available Years API Optimization

## Problem
The DataContext was previously fetching ALL races from the database just to compute the available years for the year selector dropdown. This was inefficient because:

1. **Performance**: Loading all races across all years just to get year values
2. **Network overhead**: Transferring unnecessary race data 
3. **Memory usage**: Storing race data that wasn't needed for the current view
4. **Scalability**: Performance would degrade as more years of data are added

## Solution
Created a dedicated API endpoint for available years and updated the DataContext to fetch years and races separately.

### Changes Made

#### 1. New API Endpoint
**File:** `api/races/years/index.ts`
- `GET /api/races/years` - Returns only the distinct years from the races table
- Lightweight query: `SELECT DISTINCT year FROM races ORDER BY year DESC`
- Returns: `{ success: true, data: [2025, 2024, 2023, ...], count: N }`

#### 2. Updated API Service  
**File:** `src/services/api.ts`
- Added `getAvailableYears(): Promise<number[]>` method
- Calls the new `/api/races/years` endpoint

#### 3. Enhanced DataContext
**File:** `src/contexts/DataContext.tsx`
- Added `availableYears: number[]` to state interface
- Added `SET_AVAILABLE_YEARS` action type
- Added `loadAvailableYears()` function to context interface
- Removed computed `availableYears` (was derived from all races)
- Available years now stored in state and fetched independently
- Updated initial loading to fetch years separately from races

#### 4. Updated Frontend Usage
**File:** `src/pages/leaderboard/LeaderboardPage.tsx`
- Changed from destructuring `availableYears` from context
- Now accesses `availableYears` from `state` object

### Benefits

✅ **Improved Performance**: Only fetches races for the selected year  
✅ **Reduced Network Traffic**: Years endpoint returns minimal data  
✅ **Better UX**: Year selector populates faster on initial load  
✅ **Scalability**: Performance remains constant as data grows  
✅ **Clean Separation**: Years and races are fetched independently  

### API Usage Examples

```typescript
// Old approach (inefficient)
const races = await api.getRaces(); // Gets ALL races across ALL years
const years = [...new Set(races.map(r => r.year))]; // Compute years from races

// New approach (optimized)
const years = await api.getAvailableYears(); // Gets only years (fast)
const races = await api.getRaces(selectedYear); // Gets only selected year's races
```

### Testing

The optimization can be verified by:

1. **Network Tab**: Check that `/api/races/years` returns quickly with minimal data
2. **Performance**: Initial page load should be faster
3. **Functionality**: Year selector should still work correctly
4. **Data Accuracy**: Available years should match actual race data

### Migration Notes

- **Backwards Compatible**: Existing race endpoints unchanged
- **No Breaking Changes**: Frontend components work the same way
- **Progressive Enhancement**: Years load independently of race data
- **Fallback Handling**: Graceful degradation if years endpoint fails

### Future Enhancements

This pattern could be extended to other metadata endpoints:
- `/api/runners/count` - Get total runner count without full data
- `/api/races/locations` - Get available race locations
- `/api/series/list` - Get series metadata without full details

This optimization sets a foundation for efficient metadata retrieval across the application.
