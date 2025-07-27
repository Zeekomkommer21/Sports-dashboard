import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import 'leaflet-draw';
import styled from 'styled-components';

// Test polyline decoding
const testPolyline = () => {
  try {
    const testCoords = polyline.decode('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    console.log('Test polyline decode result:', testCoords);
    return testCoords.length > 0;
  } catch (error) {
    console.error('Test polyline decode failed:', error);
    return false;
  }
};

// Alternative polyline decoding for Strava format
const decodeStravaPolyline = (encoded) => {
  try {
    // Try standard polyline decoding first
    return polyline.decode(encoded);
  } catch (error) {
    console.log('Standard polyline decode failed, trying alternative...');
    try {
      // Some Strava polylines might need different handling
      // This is a fallback method
      const coordinates = [];
      let index = 0, len = encoded.length;
      let lat = 0, lng = 0;
      
      while (index < len) {
        let shift = 0, result = 0;
        
        do {
          let b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (result >= 0x20);
        
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        shift = 0;
        result = 0;
        
        do {
          let b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (result >= 0x20);
        
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        coordinates.push([lat / 1E5, lng / 1E5]);
      }
      
      return coordinates;
    } catch (altError) {
      console.error('Alternative polyline decode also failed:', altError);
      return [];
    }
  }
};


// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapWrapper = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
`;

const MapControls = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  min-width: 200px;
`;

const ControlSection = styled.div`
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ControlTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
`;

const ControlButton = styled.button`
  background: ${props => props.$active ? '#4caf50' : '#f5f5f5'};
  color: ${props => props.$active ? 'white' : '#333'};
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin: 0.25rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$active ? '#45a049' : '#e0e0e0'};
  }
`;

const Instructions = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #666;
`;

const Legend = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  color: #333;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LegendColor = styled.div`
  width: 20px;
  height: 4px;
  background: ${props => props.color};
  margin-right: 0.5rem;
  border-radius: 2px;
`;

// Custom marker icons
const startIcon = L.divIcon({
  className: 'custom-marker start-marker',
  html: '<div style="background: #4caf50; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">S</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const endIcon = L.divIcon({
  className: 'custom-marker end-marker',
  html: '<div style="background: #f44336; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">E</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Shared utility function for calculating bounds
const getActivitiesBounds = (activities) => {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let hasValidActivities = false;
  
  activities.forEach(activity => {
    if (activity.map && activity.map.polyline) {
      try {
        const coordinates = polyline.decode(activity.map.polyline);
        if (coordinates && coordinates.length > 0) {
          hasValidActivities = true;
          coordinates.forEach(coord => {
            minLat = Math.min(minLat, coord[0]);
            maxLat = Math.max(maxLat, coord[0]);
            minLng = Math.min(minLng, coord[1]);
            maxLng = Math.max(maxLng, coord[1]);
          });
        }
      } catch (error) {
        console.error('Error parsing activity polyline:', error);
      }
    }
  });

  // If no valid activities, return null
  if (!hasValidActivities) {
    return null;
  }

  // Add some padding to the bounds
  const padding = 0.01; // About 1km
  const bounds = {
    south: minLat - padding,
    west: minLng - padding,
    north: maxLat + padding,
    east: maxLng + padding
  };

  // Validate bounds
  if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
    console.error('Invalid bounds:', bounds);
    return null;
  }

  return bounds;
};

// Road Network Layer Component
function RoadNetworkLayer({ activities }) {
  const [roadNetwork, setRoadNetwork] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Activities loaded:', activities.length);
    if (activities.length > 0) {
      console.log('Sample activity:', activities[0]);
      fetchRoadNetwork();
    }
  }, [activities]);

  const fetchRoadNetwork = async () => {
    setLoading(true);
    try {
      // Get bounds from all activities
      const bounds = getActivitiesBounds(activities);
      
      if (!bounds) {
        console.log('No valid bounds found from activities');
        setLoading(false);
        return;
      }

      console.log('Fetching roads for bounds:', bounds);
      
      const response = await fetch('/api/osm/roads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bounds: bounds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Road network data:', data);
        setRoadNetwork(data);
      } else {
        console.error('Failed to fetch road network:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching road network:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!roadNetwork || !roadNetwork.ways) {
    console.log('No road network data available');
    return null;
  }

  console.log('Rendering road network with', roadNetwork.ways.length, 'ways');

  return (
    <>
      {roadNetwork.ways.map((way, index) => {
        const wayNodes = way.nodes.map(nodeId => {
          const node = roadNetwork.nodes.find(n => n.id === nodeId);
          return node ? [node.lat, node.lon] : null;
        }).filter(Boolean);

        if (wayNodes.length < 2) return null;

        return (
          <Polyline
            key={`road-${way.id}`}
            positions={wayNodes}
            color="#666"
            weight={2}
            opacity={0.4}
          />
        );
      })}
    </>
  );
}

// Map component with drawing controls
function MapWithControls({ 
  stravaActivities, 
  selectedPolygon, 
  startPoint, 
  endPoint, 
  optimizedRoute, 
  onPolygonDraw, 
  onPointSelect 
}) {
  const map = useMap();
  const drawControlRef = useRef(null);
  const [pointMode, setPointMode] = useState(null);

  useEffect(() => {
    // Initialize draw control
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: '<strong>Oh snap!<strong> you can\'t draw that!'
          },
          shapeOptions: {
            color: '#4caf50',
            fillColor: '#4caf50',
            fillOpacity: 0.2
          }
        },
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Handle draw events
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      drawnItems.addLayer(layer);

      if (event.layerType === 'polygon') {
        const coordinates = layer.getLatLngs()[0].map(latLng => [latLng.lat, latLng.lng]);
        onPolygonDraw(coordinates);
      }
    });

    map.on(L.Draw.Event.DELETED, () => {
      onPolygonDraw(null);
    });

    return () => {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
    };
  }, [map, onPolygonDraw]);

  // Handle map clicks for start/end points
  useEffect(() => {
    const handleMapClick = (e) => {
      if (pointMode) {
        const point = { lat: e.latlng.lat, lng: e.latlng.lng };
        onPointSelect(point, pointMode);
        setPointMode(null);
      }
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [map, pointMode, onPointSelect]);

  return null;
}

const MapView = ({ 
  stravaActivities, 
  selectedPolygon, 
  startPoint, 
  endPoint, 
  optimizedRoute, 
  onPolygonDraw, 
  onPointSelect 
}) => {
  // Test polyline decoding on component mount
  useEffect(() => {
    console.log('Testing polyline decoding...');
    const success = testPolyline();
    console.log('Polyline test result:', success);
    console.log('MapView received activities:', stravaActivities.length);
    if (stravaActivities.length > 0) {
      console.log('First activity:', stravaActivities[0]);
      console.log('First activity map data:', stravaActivities[0].map);
    }
  }, [stravaActivities]);
  const [pointMode, setPointMode] = useState(null);

  const handleSetStartPoint = () => {
    setPointMode('start');
  };

  const handleSetEndPoint = () => {
    setPointMode('end');
  };

  const clearPoints = () => {
    onPointSelect(null, 'start');
    onPointSelect(null, 'end');
  };

  return (
    <MapWrapper>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapWithControls
          stravaActivities={stravaActivities}
          selectedPolygon={selectedPolygon}
          startPoint={startPoint}
          endPoint={endPoint}
          optimizedRoute={optimizedRoute}
          onPolygonDraw={onPolygonDraw}
          onPointSelect={onPointSelect}
        />

        {/* Strava Activities */}
        {stravaActivities.map((activity, index) => {
          console.log('Rendering activity:', activity.id, activity.name);
          
          // Try to get polyline coordinates - prioritize full polyline, then summary_polyline
          let coordinates = null;
          let polylineSource = null;
          
          if (activity.map?.polyline) {
            try {
              console.log(`Activity ${activity.id} using full polyline data`);
              coordinates = decodeStravaPolyline(activity.map.polyline);
              polylineSource = 'polyline';
            } catch (error) {
              console.error('Error parsing full polyline:', error);
            }
          } else if (activity.map?.summary_polyline) {
            try {
              console.log(`Activity ${activity.id} using summary polyline data`);
              coordinates = decodeStravaPolyline(activity.map.summary_polyline);
              polylineSource = 'summary_polyline';
            } catch (error) {
              console.error('Error parsing summary polyline:', error);
            }
          }
          
          // Render polyline if we have coordinates
          if (coordinates && coordinates.length > 1) {
            console.log(`Activity ${activity.id}: Rendering ${coordinates.length} coordinates from ${polylineSource}`);
            console.log(`Activity ${activity.id} first few coordinates:`, coordinates.slice(0, 3));
            
            return (
              <Polyline
                key={`strava-${activity.id}`}
                positions={coordinates}
                color={polylineSource === 'polyline' ? "#fc4c02" : "#FF8C42"}
                weight={polylineSource === 'polyline' ? 4 : 3}
                opacity={polylineSource === 'polyline' ? 0.8 : 0.7}
                dashArray={polylineSource === 'summary_polyline' ? "3, 3" : undefined}
              />
            );
          }
          
          // Check for start/end coordinates (fallback - shows straight line)
          if (activity.start_latlng && activity.end_latlng && 
              activity.start_latlng.length === 2 && activity.end_latlng.length === 2) {
            console.log(`Activity ${activity.id} using start/end coordinates (no polyline available)`);
            return (
              <Polyline
                key={`strava-${activity.id}`}
                positions={[
                  [activity.start_latlng[0], activity.start_latlng[1]],
                  [activity.end_latlng[0], activity.end_latlng[1]]
                ]}
                color="#ff6b35"
                weight={2}
                opacity={0.6}
                dashArray="5, 5"
              />
            );
          }
          
          console.log('Activity has no GPS data:', activity.id);
          return null;
        })}

        {/* Selected Polygon */}
        {selectedPolygon && (
          <Polygon
            positions={selectedPolygon}
            color="#4caf50"
            fillColor="#4caf50"
            fillOpacity={0.2}
            weight={2}
          />
        )}

        {/* Start Point */}
        {startPoint && (
          <Marker
            position={[startPoint.lat, startPoint.lng]}
            icon={startIcon}
          />
        )}

        {/* End Point */}
        {endPoint && (
          <Marker
            position={[endPoint.lat, endPoint.lng]}
            icon={endIcon}
          />
        )}

        {/* Optimized Route */}
        {optimizedRoute && optimizedRoute.route && (
          <Polyline
            positions={optimizedRoute.route.map(segment => {
              // This would need to be implemented based on your route data structure
              // For now, we'll use a placeholder
              return [segment.from.lat, segment.from.lng];
            })}
            color="#4caf50"
            weight={5}
            opacity={0.8}
          />
        )}
      </MapContainer>

      <MapControls>
        <Instructions>
          <strong>Instructions:</strong><br/>
          1. Draw a polygon to define your area<br/>
          2. Set start and end points<br/>
          3. Click "Optimize Route" to generate the shortest path
        </Instructions>

        {stravaActivities.length > 0 && (
          <Legend>
            <strong>Map Legend:</strong>
            <LegendItem>
              <LegendColor color="#fc4c02" />
              <span>Your Strava Activities</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="#4caf50" />
              <span>Optimized Route</span>
            </LegendItem>
          </Legend>
        )}

        <ControlSection>
          <ControlTitle>Debug</ControlTitle>
          <ControlButton
            onClick={() => {
              console.log('=== DEBUG ACTIVITIES ===');
              console.log('Total activities:', stravaActivities.length);
              stravaActivities.forEach((activity, index) => {
                console.log(`Activity ${index + 1}:`, {
                  id: activity.id,
                  name: activity.name,
                  hasMap: !!activity.map,
                  hasPolyline: !!(activity.map && activity.map.polyline),
                  distance: activity.distance,
                  start_date: activity.start_date
                });
              });
            }}
          >
            Debug Activities
          </ControlButton>
        </ControlSection>

        <ControlSection>
          <ControlTitle>Drawing Tools</ControlTitle>
          <ControlButton
            $active={pointMode === 'polygon'}
            onClick={() => setPointMode('polygon')}
          >
            Draw Polygon
          </ControlButton>
        </ControlSection>

        <ControlSection>
          <ControlTitle>Route Points</ControlTitle>
          <ControlButton
            $active={pointMode === 'start'}
            onClick={handleSetStartPoint}
          >
            Set Start Point
          </ControlButton>
          <ControlButton
            $active={pointMode === 'end'}
            onClick={handleSetEndPoint}
          >
            Set End Point
          </ControlButton>
          <ControlButton onClick={clearPoints}>
            Clear Points
          </ControlButton>
        </ControlSection>

        {pointMode && (
          <ControlSection>
            <ControlTitle>Current Mode</ControlTitle>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Click on the map to set {pointMode === 'start' ? 'start' : 'end'} point
            </div>
          </ControlSection>
        )}
      </MapControls>
    </MapWrapper>
  );
};

export default MapView; 