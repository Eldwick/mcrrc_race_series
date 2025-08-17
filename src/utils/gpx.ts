/**
 * GPX parsing and elevation analysis utilities
 */

export interface TrackPoint {
  lat: number;
  lon: number;
  elevation: number;
  time?: string;
  distance?: number; // Cumulative distance in miles
}

export interface MileMarker {
  mile: number;
  position: TrackPoint;
  index: number; // Index in the points array
}

export interface ElevationProfile {
  totalGain: number;
  totalLoss: number;
  minElevation: number;
  maxElevation: number;
  points: TrackPoint[];
  mileMarkers: MileMarker[];
}

export interface GPXData {
  name: string;
  points: TrackPoint[];
  elevationProfile: ElevationProfile;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  totalDistance: number; // Total distance in miles
  mileMarkers: MileMarker[];
}

/**
 * Parse GPX file content and extract track data
 */
export function parseGPX(gpxContent: string): GPXData | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('GPX parsing error:', parserError.textContent);
      return null;
    }

    // Extract track name
    const nameElement = xmlDoc.querySelector('trk > name') || xmlDoc.querySelector('metadata > name');
    const name = nameElement?.textContent || 'Unknown Track';

    // Extract track points
    const trackPoints = xmlDoc.querySelectorAll('trkpt');
    const points: TrackPoint[] = [];

    trackPoints.forEach(trkpt => {
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lon = parseFloat(trkpt.getAttribute('lon') || '0');
      const eleElement = trkpt.querySelector('ele');
      const timeElement = trkpt.querySelector('time');
      
      if (lat && lon) {
        points.push({
          lat,
          lon,
          elevation: eleElement ? parseFloat(eleElement.textContent || '0') : 0,
          time: timeElement?.textContent || undefined
        });
      }
    });

    if (points.length === 0) {
      console.error('No valid track points found in GPX');
      return null;
    }

    // Calculate cumulative distances
    const pointsWithDistance = calculateCumulativeDistances(points);
    
    // Calculate total distance
    const totalDistance = pointsWithDistance[pointsWithDistance.length - 1]?.distance || 0;
    
    // Find mile markers
    const mileMarkers = findMileMarkers(pointsWithDistance);

    // Calculate elevation profile (with distance data)
    const elevationProfile = calculateElevationProfile(pointsWithDistance);

    // Calculate bounds
    const bounds = calculateBounds(pointsWithDistance);

    return {
      name,
      points: pointsWithDistance,
      elevationProfile,
      bounds,
      totalDistance,
      mileMarkers
    };
  } catch (error) {
    console.error('Error parsing GPX:', error);
    return null;
  }
}

/**
 * Calculate elevation gain, loss, and other metrics using smoothed data
 */
export function calculateElevationProfile(points: TrackPoint[]): ElevationProfile {
  if (points.length === 0) {
    return {
      totalGain: 0,
      totalLoss: 0,
      minElevation: 0,
      maxElevation: 0,
      points: [],
      mileMarkers: []
    };
  }

  // Smooth the elevation data to reduce GPS noise
  const smoothedPoints = smoothElevationData(points);
  
  let totalGain = 0;
  let totalLoss = 0;
  let minElevation = points[0].elevation;
  let maxElevation = points[0].elevation;

  // Use custom threshold for elevation change detection
  const elevationThreshold = 0.08;

  for (let i = 1; i < smoothedPoints.length; i++) {
    const currentElevation = smoothedPoints[i].elevation;
    const previousElevation = smoothedPoints[i - 1].elevation;
    const elevationChange = currentElevation - previousElevation;

    // Count elevation changes above threshold
    if (Math.abs(elevationChange) > elevationThreshold) {
      if (elevationChange > 0) {
        totalGain += elevationChange;
      } else {
        totalLoss += Math.abs(elevationChange);
      }
    }

    // Track min/max from original data
    if (points[i] && points[i].elevation < minElevation) {
      minElevation = points[i].elevation;
    }
    if (points[i] && points[i].elevation > maxElevation) {
      maxElevation = points[i].elevation;
    }
  }

  // Calculate mile markers from the smoothed data
  const mileMarkers = findMileMarkers(smoothedPoints);

  return {
    totalGain: Math.round(totalGain * 10) / 10, // Round to 1 decimal
    totalLoss: Math.round(totalLoss * 10) / 10,
    minElevation: Math.round(minElevation * 10) / 10,
    maxElevation: Math.round(maxElevation * 10) / 10,
    points: smoothedPoints, // Return smoothed points for display
    mileMarkers
  };
}

/**
 * Smooth elevation data using a moving average to reduce GPS noise
 */
function smoothElevationData(points: TrackPoint[]): TrackPoint[] {
  if (points.length <= 5) return points;

  const smoothed: TrackPoint[] = [];
  const windowSize = 5; // Use 5-point moving average
  
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length - 1, i + Math.floor(windowSize / 2));
    
    let elevationSum = 0;
    let count = 0;
    
    for (let j = start; j <= end; j++) {
      elevationSum += points[j].elevation;
      count++;
    }
    
    smoothed.push({
      ...points[i],
      elevation: elevationSum / count
    });
  }
  
  return smoothed;
}

/**
 * Calculate geographical bounds of the track
 */
export function calculateBounds(points: TrackPoint[]) {
  if (points.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }

  let north = points[0].lat;
  let south = points[0].lat;
  let east = points[0].lon;
  let west = points[0].lon;

  points.forEach(point => {
    if (point.lat > north) north = point.lat;
    if (point.lat < south) south = point.lat;
    if (point.lon > east) east = point.lon;
    if (point.lon < west) west = point.lon;
  });

  return { north, south, east, west };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate cumulative distances for track points
 */
export function calculateCumulativeDistances(points: TrackPoint[]): TrackPoint[] {
  if (points.length === 0) return points;

  const pointsWithDistance = [...points];
  pointsWithDistance[0] = { ...points[0], distance: 0 };

  let cumulativeDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const segmentDistance = calculateDistance(
      points[i-1].lat, points[i-1].lon,
      points[i].lat, points[i].lon
    );
    cumulativeDistance += segmentDistance;
    pointsWithDistance[i] = { ...points[i], distance: cumulativeDistance };
  }

  return pointsWithDistance;
}

/**
 * Find mile markers along the route
 */
export function findMileMarkers(points: TrackPoint[]): MileMarker[] {
  const markers: MileMarker[] = [];
  const totalDistance = points[points.length - 1]?.distance || 0;
  
  // Create mile markers for each whole mile
  for (let mile = 1; mile <= Math.floor(totalDistance); mile++) {
    // Find the closest point to this mile marker
    let closestIndex = 0;
    let closestDistance = Math.abs((points[0]?.distance || 0) - mile);
    
    for (let i = 1; i < points.length; i++) {
      const distance = Math.abs((points[i]?.distance || 0) - mile);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    if (points[closestIndex]) {
      markers.push({
        mile,
        position: points[closestIndex],
        index: closestIndex
      });
    }
  }
  
  return markers;
}

/**
 * Convert elevation from meters to feet
 */
export function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084 * 10) / 10;
}

/**
 * Format elevation for display
 */
export function formatElevation(meters: number, unit: 'metric' | 'imperial' = 'imperial'): string {
  if (unit === 'imperial') {
    return `${metersToFeet(meters)} ft`;
  }
  return `${Math.round(meters * 10) / 10} m`;
}

/**
 * Load GPX file from public directory
 */
export async function loadGPXFile(filename: string): Promise<GPXData | null> {
  try {
    const response = await fetch(`/gpx/${filename}`);
    if (!response.ok) {
      console.error(`Failed to load GPX file: ${filename}`);
      return null;
    }
    
    const gpxContent = await response.text();
    return parseGPX(gpxContent);
  } catch (error) {
    console.error('Error loading GPX file:', error);
    return null;
  }
}
