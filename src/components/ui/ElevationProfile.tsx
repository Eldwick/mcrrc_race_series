import { useMemo } from 'react';
import type { ElevationProfile } from '../../utils/gpx';
import { formatElevation } from '../../utils/gpx';

interface ElevationProfileProps {
  elevationData: ElevationProfile;
  width?: number;
  height?: number;
  className?: string;
}

export function ElevationProfile({ 
  elevationData, 
  width = 600, 
  height = 200, 
  className = '' 
}: ElevationProfileProps) {
  
  const chartData = useMemo(() => {
    const { points, minElevation, maxElevation } = elevationData;
    
    if (points.length === 0) return [];

    // Sample points to avoid overcrowding (max 200 points)
    const sampleRate = Math.max(1, Math.floor(points.length / 200));
    const sampledPoints = points.filter((_, index) => index % sampleRate === 0);
    
    // Add the last point if it wasn't included
    if (sampledPoints[sampledPoints.length - 1] !== points[points.length - 1]) {
      sampledPoints.push(points[points.length - 1]);
    }

    const elevationRange = maxElevation - minElevation;
    const padding = Math.max(5, elevationRange * 0.1); // 10% padding or 5m minimum
    const totalDistance = points[points.length - 1]?.distance || 1;

    return sampledPoints.map((point, index) => {
      const progress = (point.distance || 0) / totalDistance;
      const x = progress * width;
      const y = height - ((point.elevation - minElevation + padding) / (elevationRange + 2 * padding)) * height;
      
      return {
        x,
        y,
        elevation: point.elevation,
        distance: point.distance || 0,
        originalIndex: index * sampleRate
      };
    });
  }, [elevationData, width, height]);

  // Calculate mile marker positions for the chart
  const mileMarkerPositions = useMemo(() => {
    const { mileMarkers, points, minElevation, maxElevation } = elevationData;
    if (!mileMarkers || points.length === 0) return [];

    const elevationRange = maxElevation - minElevation;
    const padding = Math.max(5, elevationRange * 0.1);
    const totalDistance = points[points.length - 1]?.distance || 1;

    return mileMarkers.map(marker => {
      const progress = (marker.position.distance || 0) / totalDistance;
      const x = progress * width;
      const y = height - ((marker.position.elevation - minElevation + padding) / (elevationRange + 2 * padding)) * height;
      
      return {
        mile: marker.mile,
        x,
        y,
        elevation: marker.position.elevation
      };
    });
  }, [elevationData, width, height]);

  // Create SVG path for the elevation profile
  const pathData = useMemo(() => {
    if (chartData.length < 2) return '';
    
    let path = `M ${chartData[0].x} ${chartData[0].y}`;
    
    for (let i = 1; i < chartData.length; i++) {
      path += ` L ${chartData[i].x} ${chartData[i].y}`;
    }
    
    return path;
  }, [chartData]);

  // Create area fill path
  const areaPath = useMemo(() => {
    if (chartData.length < 2) return '';
    
    let path = `M ${chartData[0].x} ${height}`;
    path += ` L ${chartData[0].x} ${chartData[0].y}`;
    
    for (let i = 1; i < chartData.length; i++) {
      path += ` L ${chartData[i].x} ${chartData[i].y}`;
    }
    
    path += ` L ${chartData[chartData.length - 1].x} ${height} Z`;
    
    return path;
  }, [chartData, height]);

  if (chartData.length === 0) {
    return (
      <div className={`elevation-profile ${className}`}>
        <div className="text-center text-gray-500 py-8">
          No elevation data available
        </div>
      </div>
    );
  }

  return (
    <div className={`elevation-profile ${className}`}>
      <div className="bg-white rounded-lg border p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Elevation Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Gain:</span>
              <div className="font-medium text-green-600">
                {formatElevation(elevationData.totalGain)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Total Loss:</span>
              <div className="font-medium text-red-600">
                {formatElevation(elevationData.totalLoss)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Min Elevation:</span>
              <div className="font-medium text-gray-700">
                {formatElevation(elevationData.minElevation)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Max Elevation:</span>
              <div className="font-medium text-gray-700">
                {formatElevation(elevationData.maxElevation)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative overflow-x-auto">
          <svg 
            width={width} 
            height={height} 
            className="border rounded"
            style={{ minWidth: '300px' }}
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Area fill */}
            <path
              d={areaPath}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="none"
            />
            
            {/* Elevation line */}
            <path
              d={pathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Mile markers */}
            {mileMarkerPositions.map((marker) => (
              <g key={marker.mile}>
                {/* Vertical line */}
                <line
                  x1={marker.x}
                  y1={0}
                  x2={marker.x}
                  y2={height}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />
                {/* Mile marker label */}
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r="6"
                  fill="#f59e0b"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={marker.x}
                  y={marker.y + 2}
                  textAnchor="middle"
                  fontSize="8"
                  fill="white"
                  fontWeight="bold"
                >
                  {marker.mile}
                </text>
                {/* Mile marker tooltip */}
                <title>
                  Mile {marker.mile}: {formatElevation(marker.elevation)}
                </title>
              </g>
            ))}

            {/* Data points */}
            {chartData.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="2"
                fill="#3b82f6"
                className="hover:r-3 transition-all cursor-pointer"
              >
                <title>
                  {point.distance.toFixed(2)} mi: {formatElevation(point.elevation)}
                </title>
              </circle>
            ))}
          </svg>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-12">
            <span>{formatElevation(elevationData.maxElevation)}</span>
            <span>{formatElevation((elevationData.maxElevation + elevationData.minElevation) / 2)}</span>
            <span>{formatElevation(elevationData.minElevation)}</span>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Distance: {elevationData.points[elevationData.points.length - 1]?.distance?.toFixed(2) || '0.0'} miles
        </div>
      </div>
    </div>
  );
}
