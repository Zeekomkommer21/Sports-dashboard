const express = require('express');
const axios = require('axios');
const router = express.Router();

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI;

// Get Strava authorization URL
router.get('/auth-url', (req, res) => {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${STRAVA_REDIRECT_URI}&response_type=code&scope=read,activity:read_all,profile:read_all`;
  res.json({ authUrl });
});

// Exchange authorization code for access token
router.post('/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at } = response.data;
    
    res.json({
      access_token,
      refresh_token,
      expires_at
    });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

// Refresh access token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token'
    });

    const { access_token, refresh_token: new_refresh_token, expires_at } = response.data;
    
    res.json({
      access_token,
      refresh_token: new_refresh_token,
      expires_at
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Get user activities
router.get('/activities', async (req, res) => {
  try {
    const { access_token, page = 1, per_page = 200 } = req.query;
    
    console.log(`Fetching activities page ${page} with ${per_page} per page`);
    
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        page,
        per_page
      }
    });

    console.log(`Page ${page}: ${response.data.length} activities`);
    
    // Return all activities - let client filter
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching activities:', error.response?.data || error.message);
    
    // Handle rate limiting specifically
    if (error.response?.data?.message === 'Rate Limit Exceeded') {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait a few minutes and try again.',
        retryAfter: error.response.headers['retry-after'] || 60
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  }
});

// Get user activities with detailed map data
router.get('/activities-detailed', async (req, res) => {
  try {
    const { access_token, per_page = 20 } = req.query;
    
    console.log('Fetching detailed activities with token:', access_token ? 'present' : 'missing');
    
    // Get basic activities first
    const basicResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        page: 1,
        per_page
      }
    });

    const basicActivities = basicResponse.data;
    console.log('Basic activities found:', basicActivities.length);

    // Fetch detailed data for each activity to get map data
    const detailedActivities = [];
    const maxActivities = Math.min(basicActivities.length, 10); // Back to 10 activities
    
    for (let i = 0; i < maxActivities; i++) {
      const activity = basicActivities[i];
      try {
        console.log(`Fetching detailed data for activity ${i + 1}/${maxActivities}: ${activity.id} (${activity.name})`);
        
        const detailedResponse = await axios.get(`https://www.strava.com/api/v3/activities/${activity.id}`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        
        const detailedActivity = detailedResponse.data;
        console.log(`Activity ${activity.id} (${activity.name}):`, {
          hasMap: !!detailedActivity.map,
          hasPolyline: !!(detailedActivity.map && detailedActivity.map.polyline),
          polylineLength: detailedActivity.map?.polyline?.length || 0
        });
        
        if (detailedActivity.map && detailedActivity.map.polyline) {
          detailedActivities.push(detailedActivity);
        }
        
        // Rate limiting - wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching detailed activity ${activity.id}:`, error.message);
      }
    }

    console.log('Final detailed activities with map data:', detailedActivities.length);
    res.json(detailedActivities);
  } catch (error) {
    console.error('Error fetching detailed activities:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch detailed activities' });
  }
});

// Get activity details with route data
router.get('/activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { access_token } = req.query;
    
    console.log(`Fetching detailed activity ${id}`);
    
    const response = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    console.log(`Activity ${id} map data:`, {
      hasMap: !!response.data.map,
      hasPolyline: !!(response.data.map && response.data.map.polyline),
      polylineLength: response.data.map?.polyline?.length || 0
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get activity route (GPX data)
router.get('/activities/:id/export_gpx', async (req, res) => {
  try {
    const { id } = req.params;
    const { access_token } = req.query;
    
    const response = await axios.get(`https://www.strava.com/api/v3/activities/${id}/export_gpx`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    res.set('Content-Type', 'application/gpx+xml');
    res.send(response.data);
  } catch (error) {
    console.error('Error exporting GPX:', error);
    res.status(500).json({ error: 'Failed to export GPX' });
  }
});

// Get detailed activity with full polyline data
router.get('/activity/:id', async (req, res) => {
  try {
    const { access_token } = req.query;
    const { id } = req.params;
    console.log(`Fetching detailed activity ${id}`);
    
    const response = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    console.log(`Activity ${id}: has polyline = ${!!response.data.map?.polyline}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching detailed activity:', error.response?.data || error.message);
    if (error.response?.data?.message === 'Rate Limit Exceeded') {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait a few minutes and try again.',
        retryAfter: error.response.headers['retry-after'] || 60
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch detailed activity' });
    }
  }
});

module.exports = router; 