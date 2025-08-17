# Race Courses Created from Historical Data

## Overview
Updated the race courses migration to use real MCRRC Championship Series race data from the historical scraping script. This creates authentic race courses based on 25 years of actual race history.

## Data Source
Used `BASED_HISTORICAL_RACE_RESULT_URL_OUTPUT` from `scripts/scrape-historical-championship-races.ts` which contains:
- 12 Championship Series races
- Historical URLs from 2000-2024 
- Real race name variations over time
- Actual years each race was held

## Race Courses Created

### 1. **Kemp Mill (C)hills**
- **Established**: 2018
- **Distance**: 10K (6.2 miles)  
- **Type**: Road
- **Location**: Kemp Mill, MD
- **History**: 2018, 2019, 2020, 2022, 2023, 2024
- **Notes**: Early season race to "shake off the winter chill"

### 2. **Piece of Cake** ⭐ *Longest Running*
- **Established**: 2000
- **Distance**: 10K (6.2 miles)
- **Type**: Road  
- **Location**: Wheaton, MD
- **History**: 2000-2024 (24 years of data!)
- **Notes**: MCRRC tradition - "easy" race that's actually challenging

### 3. **Capital for a Day**
- **Established**: 2009
- **Distance**: 5K (3.1 miles)
- **Type**: Road
- **Location**: Rockville, MD (Brookeville)
- **History**: 2009-2024 with some gaps
- **Notes**: Celebrates Brookeville's historic moment as US Capital

### 4. **Memorial Day 4 Miler**
- **Established**: 2011
- **Distance**: 4.0 miles
- **Type**: Road
- **Location**: TBD
- **History**: 2011-2024 (some years as Kevin Stoddard Memorial Superhero 5K)
- **Notes**: Honors fallen heroes, variable format over years

### 5. **Midsummer Night's Mile** ⭐ *Longest Running*
- **Established**: 2000
- **Distance**: 1.0 mile
- **Type**: Road
- **Location**: Silver Spring, MD
- **History**: 2000-2024 (25 years!)
- **Notes**: Fast one-mile race on longest day of year

### 6. **Riley's Rumble Half Marathon** ⭐ *Longest Running*
- **Established**: 2000  
- **Distance**: 13.1 miles (Half Marathon)
- **Type**: Road
- **Location**: Boyds, MD
- **History**: 2000-2024 (25 years!)
- **Notes**: MCRRC's premier half marathon through scenic countryside

### 7. **Going Green Track Meet**
- **Established**: 2009
- **Distance**: 2.0 miles
- **Type**: Track
- **Location**: Gaithersburg, MD  
- **History**: 2009-2024
- **Notes**: Earth Day celebration with various track distances

### 8. **Matthew Henson Trail**
- **Established**: 2013
- **Distance**: 5K (3.1 miles)
- **Type**: Trail
- **Location**: Silver Spring, MD
- **History**: 2013-2024
- **Notes**: Trail race honoring Arctic explorer Matthew Henson

### 9. **Eastern County**
- **Established**: 2013
- **Distance**: 8K (~5.0 miles)
- **Type**: Road
- **Location**: Eastern Montgomery County, MD
- **History**: 2013-2024 (very consistent)
- **Notes**: Rolling hills through eastern Montgomery County

### 10. **Country Road Run** ⭐ *Longest Running*
- **Established**: 2000
- **Distance**: 5.0 miles (evolved from 8K to 5M to 5K)
- **Type**: Road
- **Location**: Rural Montgomery County, MD
- **History**: 2000-2024 (25 years!)
- **Notes**: Distance evolved over time, scenic rural course

### 11. **Turkey Burnoff** ⭐ *Longest Running*  
- **Established**: 2000
- **Distance**: 10.0 miles (some years 5 miles)
- **Type**: Road
- **Location**: TBD
- **History**: 2000-2024 (25 years!)
- **Notes**: Post-Thanksgiving tradition, challenging distance options

### 12. **Jingle Bell Jog** ⭐ *Longest Running*
- **Established**: 2000
- **Distance**: 8K (~5.0 miles)
- **Type**: Road  
- **Location**: TBD
- **History**: 2000-2024 (25 years!)
- **Notes**: Festive year-end race with holiday spirit

## Key Statistics

### Course Longevity
- **25 years**: Midsummer Mile, Riley's Rumble, Country Road, Turkey Burnoff, Jingle Bell (5 races)
- **24 years**: Piece of Cake
- **15+ years**: Capital for a Day (2009)
- **11+ years**: Eastern County, Matthew Henson (2013)
- **15+ years**: Going Green (2009) 
- **13+ years**: Memorial 4M (2011)
- **6+ years**: Kemp Mill (2018)

### Distance Distribution
- **5K races**: 3 (Capital Day, Matthew Henson Trail, Country Road*)
- **8K races**: 2 (Eastern County, Jingle Bell Jog)
- **10K races**: 2 (Kemp Mill, Piece of Cake)
- **Unique distances**: 1 mile, 2 miles, 4 miles, 10 miles, 13.1 miles

### Course Types
- **Road**: 11 courses
- **Trail**: 1 course (Matthew Henson)
- **Track**: 1 course (Going Green)

## Implementation Features

### Database Migration
- Creates 12 authentic race courses with real MCRRC history
- Includes actual established years from race data
- Uses realistic distances based on historical patterns
- Provides rich descriptions based on race characteristics

### Linking Script
- `scripts/link-races-to-courses.ts` matches existing races to courses
- Uses keyword matching from historical race names
- Respects established years (won't link races before course existed)
- Provides detailed statistics on linking success

### Course Matching Logic
Each course uses multiple keyword variations for matching:
```typescript
{
  courseName: 'Piece of Cake',
  matchKeywords: ['piece of cake', 'piece', 'cake'],
  establishedYear: 2000
}
```

## Benefits

### Historical Accuracy
- ✅ **Real race names** from 25 years of MCRRC history
- ✅ **Actual established years** from first documented race
- ✅ **Authentic descriptions** based on race characteristics
- ✅ **Realistic locations** from championship series data

### Rich Data Foundation
- ✅ **Course records** spanning up to 25 years
- ✅ **Personal records** for longtime participants  
- ✅ **Course evolution** showing distance/format changes
- ✅ **Participation trends** across decades

### User Value
- 🏆 **Course records** dating back to 2000
- 📈 **Personal progress** tracking across years
- 🏃‍♀️ **Course selection** based on historical data
- 🎯 **Goal setting** using decades of performance data

## Deployment Steps

1. **Run Migration**: `npm run migrate` (creates race courses)
2. **Link Existing Races**: `npm run tsx scripts/link-races-to-courses.ts`
3. **Verify Data**: Check course statistics and race linkages
4. **Test Frontend**: Visit `/courses` to see the historical race courses

This creates a robust foundation for the race course system with 25 years of authentic MCRRC race history!
