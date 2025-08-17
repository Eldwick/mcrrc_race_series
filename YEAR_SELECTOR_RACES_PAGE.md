# Year Selector for Races Page

## Overview
Added a year selector dropdown to the RacesListPage, allowing users to switch between different years of race data without navigating away from the page.

## Changes Made

### Updated `src/pages/race/RacesListPage.tsx`

#### 1. **Enhanced Imports**
```typescript
// Added Select component
import { Card, CardContent, Badge, Select } from '../../components/ui';
```

#### 2. **Updated Data Context Usage**
```typescript
// Before: only accessed state
const { state } = useData();

// After: also access selectYear function and availableYears
const { state, selectYear } = useData();
const { availableYears } = state;
```

#### 3. **Redesigned Header Layout**
- Changed from simple div to responsive flex layout
- Title and subtitle on the left
- Year selector on the right (stacks on mobile)
- Consistent styling with rest of application

```typescript
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold text-gray-900">Races</h1>
    <p className="text-gray-600 mt-1">
      {state.selectedYear} Championship Series races
    </p>
  </div>
  
  {/* Year Selector */}
  <div className="flex items-center gap-2">
    <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
      Year:
    </label>
    <Select
      id="year-select"
      value={state.selectedYear.toString()}
      onChange={(e) => selectYear(parseInt(e.target.value))}
      className="min-w-[100px]"
    >
      {availableYears.map(year => (
        <option key={year} value={year.toString()}>
          {year}
        </option>
      ))}
    </Select>
  </div>
</div>
```

## Features

✅ **Responsive Design**: Works on both desktop and mobile devices  
✅ **Accessible**: Includes proper labels and IDs for screen readers  
✅ **Integrated**: Uses global DataContext state management  
✅ **Consistent**: Matches design patterns from LeaderboardPage  
✅ **Real-time Updates**: Race data refreshes when year changes  

## User Experience

### Before
- Users could only view races for the currently selected year in DataContext
- Had to navigate to another page (like Leaderboard) to change year, then return
- No visual indication of which year was being viewed

### After  
- **Direct Control**: Users can change year directly on races page
- **Clear Indication**: Header shows current year and allows easy switching
- **Immediate Feedback**: Race list updates automatically when year changes
- **Mobile Friendly**: Year selector stacks properly on smaller screens

## Technical Benefits

1. **Leverages Existing Architecture**: Uses the optimized availableYears from DataContext
2. **Global State Integration**: Changes affect the entire app consistently
3. **Performance Optimized**: Only fetches races for selected year (from previous optimization)
4. **Maintainable**: Follows established patterns from other pages

## Usage Flow

1. User visits `/races` page
2. Sees current year's races with year selector in header
3. Clicks year dropdown to see available years
4. Selects different year
5. `selectYear()` updates global state
6. DataContext automatically refetches races for new year
7. Page updates with new race data
8. Header subtitle reflects new year selection

## Future Enhancements

- Could add keyboard navigation (arrow keys) for year selection
- Could add year range indicators (e.g., "2020-2025")
- Could remember last selected year in localStorage
- Could add loading state specifically for year changes
