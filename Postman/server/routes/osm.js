const express = require('express');
const axios = require('axios');
const router = express.Router();

// Fetch road data from OpenStreetMap Overpass API
router.post('/roads', async (req, res) => {
  try {
    const { bounds, polygon } = req.body;
    
    // Validate bounds
    if (!bounds && !polygon) {
      return res.status(400).json({ error: 'No bounds or polygon provided' });
    }
    
    // Construct Overpass query to get roads within the polygon
    let query;
    if (polygon && polygon.length > 0) {
      // Use polygon coordinates for more precise area selection
      const polygonCoords = polygon.map(coord => `${coord[1]} ${coord[0]}`).join(' ');
      query = `
        [out:json][timeout:25];
        (
          way["highway"]["highway"!="footway"]["highway"!="path"]["highway"!="pedestrian"]["highway"!="steps"]["highway"!="cycleway"](poly:"${polygonCoords}");
          way["highway"]["highway"!="footway"]["highway"!="path"]["highway"!="pedestrian"]["highway"!="steps"]["highway"!="cycleway"](poly:"${polygonCoords}");
        );
        out body;
        >;
        out skel qt;
      `;
    } else if (bounds) {
      // Validate bounds structure
      const { south, west, north, east } = bounds;
      if (typeof south !== 'number' || typeof west !== 'number' || 
          typeof north !== 'number' || typeof east !== 'number') {
        return res.status(400).json({ error: 'Invalid bounds format' });
      }
      
      if (north <= south || east <= west) {
        return res.status(400).json({ error: 'Invalid bounds: north must be > south, east must be > west' });
      }
      
      query = `
        [out:json][timeout:25];
        (
          way["highway"]["highway"!="footway"]["highway"!="path"]["highway"!="pedestrian"]["highway"!="steps"]["highway"!="cycleway"](${south},${west},${north},${east});
          way["highway"]["highway"!="footway"]["highway"!="path"]["highway"!="pedestrian"]["highway"!="steps"]["highway"!="cycleway"](${south},${west},${north},${east});
        );
        out body;
        >;
        out skel qt;
      `;
    } else {
      return res.status(400).json({ error: 'No valid bounds or polygon provided' });
    }

    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const roadData = processRoadData(response.data);
    res.json(roadData);
  } catch (error) {
    console.error('Error fetching OSM data:', error);
    res.status(500).json({ error: 'Failed to fetch road data from OSM' });
  }
});

// Process and snap road data
function processRoadData(osmData) {
  const nodes = new Map();
  const ways = [];
  const snappedNodes = new Map();
  
  // Extract nodes and ways
  osmData.elements.forEach(element => {
    if (element.type === 'node') {
      nodes.set(element.id, {
        id: element.id,
        lat: element.lat,
        lon: element.lon
      });
    } else if (element.type === 'way') {
      ways.push({
        id: element.id,
        nodes: element.nodes,
        tags: element.tags || {}
      });
    }
  });

  // Snap nearby nodes (within 10 meters)
  const snappedRoads = snapRoadNetwork(nodes, ways);
  
  return {
    nodes: Array.from(snappedNodes.values()),
    ways: snappedRoads,
    originalNodes: Array.from(nodes.values()),
    originalWays: ways
  };
}

// Snap road network by connecting nearby nodes
function snapRoadNetwork(nodes, ways) {
  const snappedWays = [];
  const nodeGroups = new Map();
  const SNAP_DISTANCE = 0.0001; // Approximately 10 meters in degrees
  
  // Group nearby nodes
  const nodeArray = Array.from(nodes.values());
  for (let i = 0; i < nodeArray.length; i++) {
    const node1 = nodeArray[i];
    let groupFound = false;
    
    for (const [groupId, group] of nodeGroups) {
      const groupCenter = group.center;
      const distance = calculateDistance(
        node1.lat, node1.lon,
        groupCenter.lat, groupCenter.lon
      );
      
      if (distance <= SNAP_DISTANCE) {
        group.nodes.push(node1);
        groupFound = true;
        break;
      }
    }
    
    if (!groupFound) {
      const groupId = node1.id;
      nodeGroups.set(groupId, {
        id: groupId,
        center: { lat: node1.lat, lon: node1.lon },
        nodes: [node1]
      });
    }
  }
  
  // Update ways with snapped node references
  ways.forEach(way => {
    const snappedNodes = way.nodes.map(nodeId => {
      for (const [groupId, group] of nodeGroups) {
        const nodeInGroup = group.nodes.find(n => n.id === nodeId);
        if (nodeInGroup) {
          return groupId;
        }
      }
      return nodeId;
    });
    
    // Remove duplicate consecutive nodes
    const uniqueNodes = [];
    for (let i = 0; i < snappedNodes.length; i++) {
      if (i === 0 || snappedNodes[i] !== snappedNodes[i - 1]) {
        uniqueNodes.push(snappedNodes[i]);
      }
    }
    
    if (uniqueNodes.length > 1) {
      snappedWays.push({
        ...way,
        nodes: uniqueNodes
      });
    }
  });
  
  return snappedWays;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
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
}

// Get road network as graph for optimization
router.post('/network-graph', async (req, res) => {
  try {
    const { roads } = req.body;
    
    const graph = buildGraphFromRoads(roads);
    res.json(graph);
  } catch (error) {
    console.error('Error building network graph:', error);
    res.status(500).json({ error: 'Failed to build network graph' });
  }
});

// Build graph representation from road data
function buildGraphFromRoads(roads) {
  const graph = {
    nodes: new Map(),
    edges: []
  };
  
  roads.ways.forEach(way => {
    const nodes = way.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      const node1 = roads.nodes.find(n => n.id === nodes[i]);
      const node2 = roads.nodes.find(n => n.id === nodes[i + 1]);
      
      if (node1 && node2) {
        const distance = calculateDistance(
          node1.lat, node1.lon,
          node2.lat, node2.lon
        );
        
        graph.edges.push({
          id: `${way.id}_${i}`,
          from: nodes[i],
          to: nodes[i + 1],
          distance: distance,
          wayId: way.id,
          tags: way.tags
        });
        
        // Add nodes to graph
        if (!graph.nodes.has(nodes[i])) {
          graph.nodes.set(nodes[i], {
            id: nodes[i],
            lat: node1.lat,
            lon: node1.lon
          });
        }
        if (!graph.nodes.has(nodes[i + 1])) {
          graph.nodes.set(nodes[i + 1], {
            id: nodes[i + 1],
            lat: node2.lat,
            lon: node2.lon
          });
        }
      }
    }
  });
  
  return {
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges
  };
}

module.exports = router; 