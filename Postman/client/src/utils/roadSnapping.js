// Road snapping utility functions
// This module handles snapping GPS coordinates from Strava activities to nearby OSM roads

const SNAP_DISTANCE = 50; // meters - maximum distance to snap to a road
const ROAD_TYPES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'service', 'unclassified'];

/**
 * Calculate distance between two points in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Find the closest point on a road segment to a given coordinate
 */
const findClosestPointOnSegment = (point, segmentStart, segmentEnd) => {
  const [px, py] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;

  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return [xx, yy];
};

/**
 * Snap a single coordinate to the nearest road
 */
const snapCoordinateToRoad = async (lat, lon, roads) => {
  let closestPoint = [lat, lon];
  let minDistance = Infinity;

  for (const road of roads) {
    if (!road.geometry || !road.geometry.coordinates) continue;

    const coordinates = road.geometry.coordinates;
    
    // Check each segment of the road
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segmentStart = coordinates[i];
      const segmentEnd = coordinates[i + 1];
      
      const closestOnSegment = findClosestPointOnSegment(
        [lon, lat], // Note: OSM uses [lon, lat] format
        segmentStart,
        segmentEnd
      );
      
      const distance = calculateDistance(
        lat, lon,
        closestOnSegment[1], closestOnSegment[0]
      );
      
      if (distance < minDistance && distance <= SNAP_DISTANCE) {
        minDistance = distance;
        closestPoint = [closestOnSegment[1], closestOnSegment[0]]; // Convert back to [lat, lon]
      }
    }
  }

  return {
    original: [lat, lon],
    snapped: closestPoint,
    distance: minDistance,
    wasSnapped: minDistance < Infinity && minDistance <= SNAP_DISTANCE
  };
};

/**
 * Snap all coordinates from a Strava activity to nearby roads
 */
export const snapActivityToRoads = async (activity, roads) => {
  if (!activity.map?.polyline && !activity.map?.summary_polyline) {
    return activity; // No polyline data to snap
  }

  const polyline = activity.map.polyline || activity.map.summary_polyline;
  
  // Decode the polyline (you'll need to import your existing decoder)
  const coordinates = decodePolyline(polyline);
  
  if (!coordinates || coordinates.length === 0) {
    return activity;
  }

  const snappedCoordinates = [];
  let totalSnappedDistance = 0;
  let snappedPoints = 0;

  for (const coord of coordinates) {
    const snapped = await snapCoordinateToRoad(coord[0], coord[1], roads);
    snappedCoordinates.push(snapped.snapped);
    
    if (snapped.wasSnapped) {
      totalSnappedDistance += snapped.distance;
      snappedPoints++;
    }
  }

  return {
    ...activity,
    snappedCoordinates,
    snapStats: {
      totalSnappedDistance,
      snappedPoints,
      totalPoints: coordinates.length,
      averageSnapDistance: snappedPoints > 0 ? totalSnappedDistance / snappedPoints : 0
    }
  };
};

/**
 * Fetch OSM road data for a given bounding box
 */
export const fetchOSMRoads = async (bounds) => {
  const [minLat, minLon, maxLat, maxLon] = bounds;
  
  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service|unclassified)$"]["area"!="yes"](${minLat},${minLon},${maxLat},${maxLon});
      relation["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service|unclassified)$"]["area"!="yes"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return processOSMData(data);
  } catch (error) {
    console.error('Error fetching OSM roads:', error);
    return [];
  }
};

/**
 * Process raw OSM data into a usable format
 */
const processOSMData = (osmData) => {
  const roads = [];
  const nodes = new Map();

  // First pass: collect all nodes
  osmData.elements.forEach(element => {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lat, element.lon]);
    }
  });

  // Second pass: process ways (roads)
  osmData.elements.forEach(element => {
    if (element.type === 'way' && element.tags && element.tags.highway) {
      const coordinates = element.nodes.map(nodeId => {
        const node = nodes.get(nodeId);
        return node ? [node[1], node[0]] : null; // Convert to [lon, lat] for GeoJSON
      }).filter(coord => coord !== null);

      if (coordinates.length >= 2) {
        roads.push({
          id: element.id,
          type: element.tags.highway,
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          },
          properties: {
            name: element.tags.name || element.tags.ref || `Road ${element.id}`,
            highway: element.tags.highway,
            lanes: element.tags.lanes,
            surface: element.tags.surface
          }
        });
      }
    }
  });

  return roads;
};

/**
 * Polyline decoder using @mapbox/polyline
 */
const decodePolyline = (encoded) => {
  try {
    const polyline = require('@mapbox/polyline');
    return polyline.decode(encoded);
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return [];
  }
};

export default {
  snapActivityToRoads,
  fetchOSMRoads,
  SNAP_DISTANCE
}; 