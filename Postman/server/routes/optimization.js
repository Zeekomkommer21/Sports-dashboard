const express = require('express');
const router = express.Router();

// Optimize route using Chinese Postman Problem
router.post('/optimize', async (req, res) => {
  try {
    const { network, startPoint, endPoint, existingRoutes } = req.body;
    
    // Build graph from network data
    const graph = buildGraph(network);
    
    // Mark existing routes as already traveled
    const traveledEdges = new Set();
    if (existingRoutes && existingRoutes.length > 0) {
      existingRoutes.forEach(route => {
        route.segments.forEach(segment => {
          traveledEdges.add(`${segment.from}_${segment.to}`);
          traveledEdges.add(`${segment.to}_${segment.from}`);
        });
      });
    }
    
    // Find optimal route using CPP
    const optimalRoute = solveCPP(graph, startPoint, endPoint, traveledEdges);
    
    res.json({
      route: optimalRoute,
      totalDistance: calculateTotalDistance(optimalRoute, graph),
      newDistance: calculateNewDistance(optimalRoute, traveledEdges, graph)
    });
  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({ error: 'Failed to optimize route' });
  }
});

// Build graph from network data
function buildGraph(network) {
  const graph = {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map()
  };
  
  // Add nodes
  network.nodes.forEach(node => {
    graph.nodes.set(node.id, node);
    graph.adjacency.set(node.id, []);
  });
  
  // Add edges
  network.edges.forEach(edge => {
    const edgeId = `${edge.from}_${edge.to}`;
    const reverseEdgeId = `${edge.to}_${edge.from}`;
    
    graph.edges.set(edgeId, {
      ...edge,
      id: edgeId
    });
    
    graph.edges.set(reverseEdgeId, {
      ...edge,
      id: reverseEdgeId,
      from: edge.to,
      to: edge.from
    });
    
    // Add to adjacency list
    graph.adjacency.get(edge.from).push({
      to: edge.to,
      edgeId: edgeId,
      distance: edge.distance
    });
    
    graph.adjacency.get(edge.to).push({
      to: edge.from,
      edgeId: reverseEdgeId,
      distance: edge.distance
    });
  });
  
  return graph;
}

// Solve Chinese Postman Problem
function solveCPP(graph, startPoint, endPoint, traveledEdges) {
  // Find nodes with odd degree (excluding already traveled edges)
  const oddNodes = findOddDegreeNodes(graph, traveledEdges);
  
  // If no odd nodes, the graph is Eulerian
  if (oddNodes.length === 0) {
    return findEulerianPath(graph, startPoint, endPoint);
  }
  
  // Find minimum weight perfect matching for odd nodes
  const matching = findMinimumWeightMatching(graph, oddNodes);
  
  // Add matching edges to create Eulerian graph
  const augmentedGraph = augmentGraph(graph, matching);
  
  // Find Eulerian path
  const eulerianPath = findEulerianPath(augmentedGraph, startPoint, endPoint);
  
  return eulerianPath;
}

// Find nodes with odd degree
function findOddDegreeNodes(graph, traveledEdges) {
  const degrees = new Map();
  
  // Calculate degrees excluding traveled edges
  for (const [nodeId, node] of graph.nodes) {
    degrees.set(nodeId, 0);
  }
  
  for (const [edgeId, edge] of graph.edges) {
    if (!traveledEdges.has(edgeId)) {
      degrees.set(edge.from, degrees.get(edge.from) + 1);
    }
  }
  
  const oddNodes = [];
  for (const [nodeId, degree] of degrees) {
    if (degree % 2 === 1) {
      oddNodes.push(nodeId);
    }
  }
  
  return oddNodes;
}

// Find minimum weight perfect matching using greedy approach
function findMinimumWeightMatching(graph, oddNodes) {
  const matching = [];
  const used = new Set();
  
  // Sort odd nodes by their coordinates for consistent matching
  oddNodes.sort((a, b) => {
    const nodeA = graph.nodes.get(a);
    const nodeB = graph.nodes.get(b);
    if (nodeA.lat !== nodeB.lat) {
      return nodeA.lat - nodeB.lat;
    }
    return nodeA.lon - nodeB.lon;
  });
  
  for (let i = 0; i < oddNodes.length; i += 2) {
    if (i + 1 < oddNodes.length) {
      const node1 = oddNodes[i];
      const node2 = oddNodes[i + 1];
      
      // Find shortest path between these nodes
      const path = findShortestPath(graph, node1, node2);
      
      matching.push({
        from: node1,
        to: node2,
        path: path
      });
    }
  }
  
  return matching;
}

// Find shortest path using Dijkstra's algorithm
function findShortestPath(graph, start, end) {
  const distances = new Map();
  const previous = new Map();
  const queue = [];
  
  // Initialize distances
  for (const [nodeId] of graph.nodes) {
    distances.set(nodeId, Infinity);
    previous.set(nodeId, null);
  }
  distances.set(start, 0);
  
  // Priority queue (simple array for now)
  queue.push({ node: start, distance: 0 });
  
  while (queue.length > 0) {
    queue.sort((a, b) => a.distance - b.distance);
    const { node, distance } = queue.shift();
    
    if (node === end) break;
    
    const neighbors = graph.adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      const newDistance = distance + neighbor.distance;
      
      if (newDistance < distances.get(neighbor.to)) {
        distances.set(neighbor.to, newDistance);
        previous.set(neighbor.to, node);
        queue.push({ node: neighbor.to, distance: newDistance });
      }
    }
  }
  
  // Reconstruct path
  const path = [];
  let current = end;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current);
  }
  
  return path;
}

// Augment graph with matching edges
function augmentGraph(graph, matching) {
  const augmentedGraph = {
    nodes: new Map(graph.nodes),
    edges: new Map(graph.edges),
    adjacency: new Map()
  };
  
  // Copy adjacency list
  for (const [nodeId, neighbors] of graph.adjacency) {
    augmentedGraph.adjacency.set(nodeId, [...neighbors]);
  }
  
  // Add matching edges
  matching.forEach(match => {
    const path = match.path;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edgeId = `${from}_${to}`;
      
      // Find the original edge
      const originalEdge = graph.edges.get(edgeId);
      if (originalEdge) {
        augmentedGraph.edges.set(edgeId, originalEdge);
        
        // Add to adjacency list if not already present
        const existing = augmentedGraph.adjacency.get(from).find(n => n.to === to);
        if (!existing) {
          augmentedGraph.adjacency.get(from).push({
            to: to,
            edgeId: edgeId,
            distance: originalEdge.distance
          });
        }
      }
    }
  });
  
  return augmentedGraph;
}

// Find Eulerian path using Hierholzer's algorithm
function findEulerianPath(graph, start, end) {
  const path = [];
  const usedEdges = new Set();
  
  function dfs(node) {
    const neighbors = graph.adjacency.get(node) || [];
    
    for (const neighbor of neighbors) {
      const edgeId = neighbor.edgeId;
      if (!usedEdges.has(edgeId)) {
        usedEdges.add(edgeId);
        dfs(neighbor.to);
        path.unshift({
          from: node,
          to: neighbor.to,
          edgeId: edgeId,
          distance: neighbor.distance
        });
      }
    }
  }
  
  dfs(start);
  
  // Ensure path starts and ends at specified points
  if (path.length > 0) {
    if (path[0].from !== start) {
      // Find path from start to path[0].from
      const startPath = findShortestPath(graph, start, path[0].from);
      for (let i = 0; i < startPath.length - 1; i++) {
        path.unshift({
          from: startPath[i],
          to: startPath[i + 1],
          edgeId: `${startPath[i]}_${startPath[i + 1]}`,
          distance: 0 // Will be calculated later
        });
      }
    }
    
    if (path[path.length - 1].to !== end) {
      // Find path from path[path.length-1].to to end
      const endPath = findShortestPath(graph, path[path.length - 1].to, end);
      for (let i = 0; i < endPath.length - 1; i++) {
        path.push({
          from: endPath[i],
          to: endPath[i + 1],
          edgeId: `${endPath[i]}_${endPath[i + 1]}`,
          distance: 0 // Will be calculated later
        });
      }
    }
  }
  
  return path;
}

// Calculate total distance of route
function calculateTotalDistance(route, graph) {
  return route.reduce((total, segment) => {
    const edge = graph.edges.get(segment.edgeId);
    return total + (edge ? edge.distance : 0);
  }, 0);
}

// Calculate distance of new (untraveled) segments
function calculateNewDistance(route, traveledEdges, graph) {
  return route.reduce((total, segment) => {
    if (!traveledEdges.has(segment.edgeId)) {
      const edge = graph.edges.get(segment.edgeId);
      return total + (edge ? edge.distance : 0);
    }
    return total;
  }, 0);
}

module.exports = router; 