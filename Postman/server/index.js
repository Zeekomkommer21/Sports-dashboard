const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const stravaRoutes = require('./routes/strava');
const osmRoutes = require('./routes/osm');
const optimizationRoutes = require('./routes/optimization');
const gpxRoutes = require('./routes/gpx');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// API Routes
app.use('/api/strava', stravaRoutes);
app.use('/api/osm', osmRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/gpx', gpxRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 