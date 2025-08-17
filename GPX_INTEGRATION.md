# GPX Integration for Course Maps

## Overview
The course page now supports GPX file integration to display interactive course maps and elevation profiles using react-leaflet and custom elevation analysis.

## Features Implemented

### 🗺️ **Interactive Course Maps**
- **Track visualization** - GPX track rendered as a polyline on the map
- **Start/Finish markers** - Green (S) and Red (F) markers
- **Loop detection** - Special Start/Finish (S/F) marker for loop courses
- **Elevation popups** - Click markers to see elevation data
- **Auto-fit bounds** - Map automatically zooms to show entire course

### 📈 **Elevation Profiles**
- **Visual elevation chart** - SVG-based elevation profile
- **Elevation statistics** - Total gain, loss, min/max elevation
- **Interactive data points** - Hover to see specific elevation values
- **Metric conversion** - Displays in feet (Imperial) by default

### 📊 **Course Statistics**
- **Total Elevation Gain** - Cumulative uphill elevation
- **Total Elevation Loss** - Cumulative downhill elevation  
- **Lowest Point** - Minimum elevation on course
- **Highest Point** - Maximum elevation on course

## Adding New GPX Files

### 1. Add GPX File
```bash
# Copy your GPX file to the public directory
cp your_course.gpx public/gpx/
```

### 2. Update Course Mapping
Edit `src/utils/courseGpxMapping.ts`:
```typescript
export const COURSE_GPX_MAPPING: Record<string, string> = {
  'Eastern County 8k': 'eastern_county_8k.gpx',
  'Piece of Cake 10k': 'piece_of_cake_10k.gpx',     // ← Add new mapping
  'Riley\'s Rumble Half Marathon': 'rileys_rumble_half.gpx',  // ← Add new mapping
  // Add more courses here...
};
```

### 3. GPX File Requirements
- **Standard GPX format** with track points (`<trkpt>`)
- **Elevation data** in meters (`<ele>` tags)
- **Coordinates** in decimal degrees (`lat` and `lon` attributes)

Example GPX structure:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Course Name</name>
    <trkseg>
      <trkpt lat="39.0556" lon="-76.9894">
        <ele>108.4</ele>
      </trkpt>
      <!-- More track points... -->
    </trkseg>
  </trk>
</gpx>
```

## Technical Implementation

### Components Created
- **`CourseMap.tsx`** - React-leaflet map component
- **`ElevationProfile.tsx`** - SVG-based elevation chart
- **`gpx.ts`** - GPX parsing and elevation analysis utilities
- **`courseGpxMapping.ts`** - Course name to filename mapping

### Dependencies Added
- `react-leaflet` - React wrapper for Leaflet maps
- `leaflet` - Core mapping library
- `@types/leaflet` - TypeScript definitions

### Map Features
- **OpenStreetMap tiles** for base map
- **Custom markers** with elevation data
- **Responsive design** that works on mobile
- **Print-friendly styles** for documentation

### Elevation Analysis
- **Noise filtering** - 1-meter threshold to ignore GPS noise
- **Smart sampling** - Up to 200 points for performance
- **Statistical analysis** - Gain/loss calculations
- **Visual rendering** - Interactive SVG charts

## Course Page Integration

The map tab appears automatically when GPX data is available for a course:

1. **Tab visibility** - "Course Map" tab only shows if GPX data exists
2. **Automatic loading** - GPX data loads when course page loads
3. **Error handling** - Graceful fallback if GPX loading fails
4. **Performance** - GPX processing happens asynchronously

## File Locations

```
├── public/gpx/                          # GPX files (HTTP accessible)
│   └── eastern_county_8k.gpx
├── src/components/ui/
│   ├── CourseMap.tsx                    # Map component
│   └── ElevationProfile.tsx             # Elevation chart
├── src/utils/
│   ├── gpx.ts                          # GPX parsing utilities
│   └── courseGpxMapping.ts             # Course mappings
└── src/pages/course/CoursePage.tsx     # Integration point
```

## Future Enhancements

### Potential Features
- **Course segments** - Split analysis (mile splits, segments)
- **Multiple map layers** - Satellite, terrain, etc.
- **3D elevation view** - Enhanced visualization
- **Course difficulty rating** - Based on elevation profile
- **Waypoint markers** - Mile markers, aid stations
- **Historical weather** - Race day conditions
- **Pace recommendations** - Based on elevation changes

### Data Sources
- **Garmin Connect** exports
- **Strava** route exports  
- **Manual GPS tracking** during course surveys
- **Race director** provided files

This creates a rich, interactive experience for exploring MCRRC courses with detailed geographic and elevation information!
