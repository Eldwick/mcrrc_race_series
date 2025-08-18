import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GPXData, MileMarker } from '../../utils/gpx';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CourseMapProps {
  gpxData: GPXData;
  height?: string;
  className?: string;
}

export function CourseMap({ gpxData, height = '400px', className = '' }: CourseMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Create bounds for the map
  const bounds: L.LatLngBoundsExpression = [
    [gpxData.bounds.south, gpxData.bounds.west],
    [gpxData.bounds.north, gpxData.bounds.east]
  ];

  // Convert track points to leaflet coordinates
  const trackCoordinates: L.LatLngExpression[] = gpxData.points.map(point => [point.lat, point.lon]);

  // Get start and end points
  const startPoint = gpxData.points[0];
  const endPoint = gpxData.points[gpxData.points.length - 1];

  // Check if it's a loop (start and end points are close)
  const isLoop = startPoint && endPoint && 
    Math.abs(startPoint.lat - endPoint.lat) < 0.001 && 
    Math.abs(startPoint.lon - endPoint.lon) < 0.001;

  useEffect(() => {
    // Fit the map to bounds when component mounts
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [bounds]);

  return (
    <div className={`course-map ${className}`} style={{ height }}>
      <MapContainer
        ref={mapRef}
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg overflow-hidden"
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Track polyline */}
        <Polyline
          positions={trackCoordinates}
          color="#e11d48" // Primary red color
          weight={4}
          opacity={0.8}
        />

        {/* Start marker */}
        {startPoint && (
          <Marker 
            position={[startPoint.lat, startPoint.lon]}
            icon={L.divIcon({
              className: 'start-marker',
              html: `
                <div style="
                  background-color: #22c55e;
                  color: white;
                  border-radius: 50%;
                  width: 24px;
                  height: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 12px;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">S</div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Start</strong><br />
                Elevation: {Math.round(startPoint.elevation * 3.28084)} ft
              </div>
            </Popup>
          </Marker>
        )}

        {/* End marker (only if not a loop) */}
        {endPoint && !isLoop && (
          <Marker 
            position={[endPoint.lat, endPoint.lon]}
            icon={L.divIcon({
              className: 'finish-marker',
              html: `
                <div style="
                  background-color: #ef4444;
                  color: white;
                  border-radius: 50%;
                  width: 24px;
                  height: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 12px;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">F</div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Finish</strong><br />
                Elevation: {Math.round(endPoint.elevation * 3.28084)} ft
              </div>
            </Popup>
          </Marker>
        )}

        {/* Loop indicator */}
        {isLoop && endPoint && (
          <Marker 
            position={[endPoint.lat, endPoint.lon]}
            icon={L.divIcon({
              className: 'loop-marker',
              html: `
                <div style="
                  background-color: #8b5cf6;
                  color: white;
                  border-radius: 50%;
                  width: 24px;
                  height: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 10px;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">S/F</div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Start/Finish</strong><br />
                Elevation: {Math.round(endPoint.elevation * 3.28084)} ft<br />
                <em>Loop Course</em>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Mile markers */}
        {gpxData.mileMarkers.map((marker: MileMarker) => (
          <Marker
            key={marker.mile}
            position={[marker.position.lat, marker.position.lon]}
            icon={L.divIcon({
              className: 'mile-marker',
              html: `
                <div style="
                  background-color: #f59e0b;
                  color: white;
                  border-radius: 50%;
                  width: 20px;
                  height: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 10px;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">${marker.mile}</div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Mile {marker.mile}</strong><br />
                Distance: {marker.position.distance?.toFixed(2)} mi<br />
                Elevation: {Math.round(marker.position.elevation * 3.28084)} ft
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
