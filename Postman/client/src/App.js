import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styled from 'styled-components';

import Header from './components/Header';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import StravaAuth from './components/StravaAuth';
import DonationModal from './components/DonationModal';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  position: relative;
`;

const MapContainer = styled.div`
  flex: 1;
  position: relative;
`;

const SidebarContainer = styled.div`
  width: 400px;
  background: white;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    transform: translateX(${props => props.$isOpen ? '0' : '100%'});
    transition: transform 0.3s ease;
  }
`;

const MobileToggle = styled.button`
  position: absolute;
  top: 80px;
  right: 10px;
  z-index: 1001;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

function App() {
  const [stravaToken, setStravaToken] = useState(null);
  const [stravaActivities, setStravaActivities] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [roadNetwork, setRoadNetwork] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [isFetchingActivities, setIsFetchingActivities] = useState(false);

  const fetchStravaActivities = useCallback(async (token) => {
    // Prevent multiple simultaneous requests
    if (isFetchingActivities) {
      console.log('Already fetching activities, skipping...');
      return;
    }

    try {
      setIsFetchingActivities(true);
      console.log('Fetching ALL activities from Strava (this may take a moment)...');
      
      let allActivities = [];
      let page = 1;
      const perPage = 200; // Maximum allowed by Strava
      
      // Fetch all activities in batches
      while (true) {
        console.log(`Fetching page ${page}...`);
        
        const response = await fetch(`/api/strava/activities?access_token=${token}&page=${page}&per_page=${perPage}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 429) {
            // Rate limit exceeded
            const retryAfter = errorData.retryAfter || 60;
            toast.error(`Rate limit exceeded. Please wait ${retryAfter} seconds and try again.`);
            return;
          }
          
          throw new Error(errorData.error || 'Failed to fetch Strava activities');
        }
        
        const activities = await response.json();
        
        if (activities.length === 0) {
          break; // No more activities
        }
        
        allActivities = allActivities.concat(activities);
        console.log(`Fetched ${activities.length} activities (total: ${allActivities.length})`);
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
        page++;
        
        // Safety limit to prevent infinite loops
        if (page > 50) {
          console.log('Reached safety limit of 50 pages');
          break;
        }
      }
      
      console.log(`Total activities fetched: ${allActivities.length}`);
      
      // Filter activities that have GPS data (check multiple formats)
      const activitiesWithGPS = allActivities.filter(activity => {
        // Check for polyline data
        const hasPolyline = activity.map && activity.map.polyline;
        // Check for start/end coordinates
        const hasStartEndCoords = activity.start_latlng && activity.end_latlng && 
                                 activity.start_latlng.length === 2 && activity.end_latlng.length === 2;
        // Check for any GPS data
        const hasAnyGPS = hasPolyline || hasStartEndCoords;
        
        return hasAnyGPS;
      });
      console.log(`Activities with GPS data: ${activitiesWithGPS.length}`);
      
      // Fetch detailed data for activities that have start/end coords but no polyline
      const activitiesNeedingDetails = activitiesWithGPS.filter(activity => 
        !activity.map?.polyline && activity.start_latlng && activity.end_latlng
      );
               console.log(`Activities needing detailed fetch: ${activitiesNeedingDetails.length}`);
         console.log('Activity IDs needing details:', activitiesNeedingDetails.map(a => a.id));
         
         // Log sample of activities with summary_polyline
         const activitiesWithSummary = activitiesWithGPS.filter(activity => 
           activity.map?.summary_polyline && !activity.map?.polyline
         );
         console.log(`Activities with summary_polyline only: ${activitiesWithSummary.length}`);
         if (activitiesWithSummary.length > 0) {
           console.log('Sample activity with summary_polyline:', {
             id: activitiesWithSummary[0].id,
             name: activitiesWithSummary[0].name,
             hasSummaryPolyline: !!activitiesWithSummary[0].map?.summary_polyline,
             summaryPolylineLength: activitiesWithSummary[0].map?.summary_polyline?.length || 0
           });
         }
      
      if (activitiesNeedingDetails.length > 0) {
        console.log('Fetching detailed activity data for activities without polylines...');
        const detailedActivities = [];
        
                   for (const activity of activitiesNeedingDetails.slice(0, 25)) { // Increased limit to get more detailed activities
          try {
            console.log(`Fetching details for activity ${activity.id}...`);
            const response = await fetch(`/api/strava/activity/${activity.id}?access_token=${token}`);
            if (response.ok) {
              const detailedActivity = await response.json();
              console.log(`Received detailed activity ${detailedActivity.id}:`, {
                hasMap: !!detailedActivity.map,
                hasPolyline: !!detailedActivity.map?.polyline,
                polylineLength: detailedActivity.map?.polyline?.length || 0
              });
              if (detailedActivity.map?.polyline) {
                console.log(`Activity ${activity.id} now has polyline data!`);
                detailedActivities.push(detailedActivity);
              } else {
                console.log(`Activity ${activity.id} still has no polyline data`);
              }
            } else {
              console.error(`Failed to fetch details for activity ${activity.id}:`, response.status, response.statusText);
            }
            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Error fetching details for activity ${activity.id}:`, error);
          }
        }
        
        // Replace activities with their detailed versions
        const updatedActivities = activitiesWithGPS.map(activity => {
          const detailed = detailedActivities.find(d => 
            d.id === activity.id || 
            d.id === parseInt(activity.id) || 
            d.id === activity.id.toString()
          );
          if (detailed) {
            console.log(`Replacing activity ${activity.id} (${typeof activity.id}) with detailed version ${detailed.id} (${typeof detailed.id})`);
            console.log('Original map data:', activity.map);
            console.log('Detailed map data:', detailed.map);
          }
          return detailed || activity;
        });
        
        console.log(`Updated ${detailedActivities.length} activities with polyline data`);
        console.log('Sample updated activity:', updatedActivities[0]);
        console.log('Sample updated activity map:', updatedActivities[0]?.map);
        
        setStravaActivities(updatedActivities);
        localStorage.setItem('stravaActivities', JSON.stringify(updatedActivities));
      } else {
        setStravaActivities(activitiesWithGPS);
        localStorage.setItem('stravaActivities', JSON.stringify(activitiesWithGPS));
      }
      
      // Debug: Check first few activities for map data
      console.log('First 5 activities map data:');
      allActivities.slice(0, 5).forEach((activity, index) => {
        console.log(`${index + 1}. ${activity.name} (${activity.type}):`, {
          hasMap: !!activity.map,
          mapType: activity.map?.type || 'none',
          hasPolyline: !!(activity.map && activity.map.polyline),
          polylineLength: activity.map?.polyline?.length || 0,
          // Check for other GPS-related fields
          hasStartLatlng: !!(activity.start_latlng && activity.start_latlng.length === 2),
          hasEndLatlng: !!(activity.end_latlng && activity.end_latlng.length === 2),
          startLatlng: activity.start_latlng,
          endLatlng: activity.end_latlng
        });
      });
      
      // Debug: Show sample of activities without GPS
      const activitiesWithoutGPS = allActivities.filter(activity => !activity.map || !activity.map.polyline);
      console.log('Sample activities without GPS:', activitiesWithoutGPS.slice(0, 5).map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        hasMap: !!a.map,
        mapType: a.map?.type || 'none',
        polyline: a.map?.polyline ? 'present' : 'missing'
      })));
      
      // Show activity type breakdown
      const typeBreakdown = {};
      allActivities.forEach(activity => {
        typeBreakdown[activity.type] = (typeBreakdown[activity.type] || 0) + 1;
      });
      console.log('Activity type breakdown:', typeBreakdown);
      
      // Save ALL activities locally for future use
      localStorage.setItem('allStravaActivities', JSON.stringify(allActivities));
      localStorage.setItem('stravaActivities', JSON.stringify(activitiesWithGPS));
      localStorage.setItem('stravaActivitiesTime', new Date().getTime().toString());
      
      if (activitiesWithGPS.length === 0) {
        toast.info(`No GPS activities found. You have ${allActivities.length} total activities. Check console for details.`);
        console.log('🔍 TROUBLESHOOTING: No GPS activities found. Possible reasons:');
        console.log('1. GPS was disabled on your tracking device');
        console.log('2. Activities were recorded indoors (swimming, weight training)');
        console.log('3. Activities were manually entered without GPS');
        console.log('4. Strava privacy settings are hiding GPS data');
        console.log('5. Activities are too old and GPS data was removed');
      } else {
        toast.success(`Successfully loaded ${activitiesWithGPS.length} GPS activities!`);
      }
      
      setStravaActivities(activitiesWithGPS);
    } catch (error) {
      console.error('Error fetching Strava activities:', error);
      toast.error(error.message || 'Failed to fetch your Strava activities');
    } finally {
      setIsFetchingActivities(false);
    }
  }, [isFetchingActivities]);

  // Check for existing Strava token on app load
  useEffect(() => {
    const token = localStorage.getItem('stravaToken');
    const expiresAt = localStorage.getItem('stravaTokenExpires');
    
    if (token && expiresAt && new Date().getTime() < parseInt(expiresAt)) {
      setStravaToken(token);
      
      // Check if we have cached activities
      const cachedActivities = localStorage.getItem('stravaActivities');
      const cacheTime = localStorage.getItem('stravaActivitiesTime');
      const now = new Date().getTime();
      
      // Use cache if it's less than 24 hours old (since we fetch all data at once)
      if (cachedActivities && cacheTime && (now - parseInt(cacheTime)) < 24 * 60 * 60 * 1000) {
        console.log('Using cached activities');
        const parsedActivities = JSON.parse(cachedActivities);
        setStravaActivities(parsedActivities);
      } else {
        console.log('No recent cache found, fetching all activities...');
        fetchStravaActivities(token);
      }
    }
  }, [fetchStravaActivities]);

  const handleStravaAuth = async (code) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/strava/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with Strava');
      }

      const data = await response.json();
      
      // Store token in localStorage
      localStorage.setItem('stravaToken', data.access_token);
      localStorage.setItem('stravaRefreshToken', data.refresh_token);
      localStorage.setItem('stravaTokenExpires', data.expires_at * 1000);
      
      setStravaToken(data.access_token);
      await fetchStravaActivities(data.access_token);
      
      toast.success('Successfully connected to Strava!');
    } catch (error) {
      console.error('Strava authentication error:', error);
      toast.error('Failed to connect to Strava. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePolygonDraw = (polygon) => {
    setSelectedPolygon(polygon);
    setOptimizedRoute(null); // Clear previous route
  };

  const handlePointSelect = (point, type) => {
    if (type === 'start') {
      setStartPoint(point);
    } else if (type === 'end') {
      setEndPoint(point);
    }
  };

  const handleOptimizeRoute = async () => {
    if (!selectedPolygon || !startPoint || !endPoint) {
      toast.warning('Please draw a polygon and set start/end points first');
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch road network from OSM
      const roadResponse = await fetch('/api/osm/roads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          polygon: selectedPolygon,
        }),
      });

      if (!roadResponse.ok) {
        throw new Error('Failed to fetch road data');
      }

      const roadData = await roadResponse.json();
      setRoadNetwork(roadData);

      // Build network graph
      const graphResponse = await fetch('/api/osm/network-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roads: roadData,
        }),
      });

      if (!graphResponse.ok) {
        throw new Error('Failed to build network graph');
      }

      const networkGraph = await graphResponse.json();

      // Optimize route
      const optimizeResponse = await fetch('/api/optimization/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: networkGraph,
          startPoint: startPoint,
          endPoint: endPoint,
          existingRoutes: stravaActivities.map(activity => ({
            segments: activity.route ? activity.route.segments : []
          })),
        }),
      });

      if (!optimizeResponse.ok) {
        throw new Error('Failed to optimize route');
      }

      const optimizationResult = await optimizeResponse.json();
      setOptimizedRoute(optimizationResult);
      
      toast.success('Route optimized successfully!');
    } catch (error) {
      console.error('Route optimization error:', error);
      toast.error('Failed to optimize route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadGPX = async () => {
    if (!optimizedRoute) {
      toast.warning('No optimized route to download');
      return;
    }

    try {
      const response = await fetch('/api/gpx/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: optimizedRoute.route,
          network: roadNetwork,
          startPoint: startPoint,
          endPoint: endPoint,
          routeName: 'Optimized Route',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate GPX file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'optimized_route.gpx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('GPX file downloaded successfully!');
    } catch (error) {
      console.error('GPX download error:', error);
      toast.error('Failed to download GPX file');
    }
  };

  const handleRefreshActivities = async () => {
    if (!stravaToken) {
      toast.error('Please connect to Strava first');
      return;
    }
    
    // Clear all caches and fetch fresh data
    localStorage.removeItem('stravaActivities');
    localStorage.removeItem('allStravaActivities');
    localStorage.removeItem('stravaActivitiesTime');
    
    console.log('🔄 Clearing cache and fetching fresh data...');
    await fetchStravaActivities(stravaToken);
    toast.success('Activities refreshed from Strava');
  };

  const handleDonate = () => {
    setShowDonationModal(true);
  };

  return (
    <Router>
      <AppContainer>
        <Header 
          onDonate={handleDonate}
          isConnected={!!stravaToken}
        />
        
        <MainContent>
          <MapContainer>
            <MapView
              stravaActivities={stravaActivities}
              selectedPolygon={selectedPolygon}
              startPoint={startPoint}
              endPoint={endPoint}
              optimizedRoute={optimizedRoute}
              onPolygonDraw={handlePolygonDraw}
              onPointSelect={handlePointSelect}
            />
          </MapContainer>
          
          <MobileToggle onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </MobileToggle>
          
          <SidebarContainer $isOpen={sidebarOpen}>
            <Sidebar
              selectedPolygon={selectedPolygon}
              startPoint={startPoint}
              endPoint={endPoint}
              optimizedRoute={optimizedRoute}
              isLoading={isLoading}
              onOptimize={handleOptimizeRoute}
              onDownloadGPX={handleDownloadGPX}
              onClearRoute={() => {
                setOptimizedRoute(null);
                setSelectedPolygon(null);
                setStartPoint(null);
                setEndPoint(null);
              }}
            />
          </SidebarContainer>
        </MainContent>

        {!stravaToken && (
          <StravaAuth onAuth={handleStravaAuth} isLoading={isLoading} />
        )}

        {showDonationModal && (
          <DonationModal onClose={() => setShowDonationModal(false)} />
        )}

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </AppContainer>
    </Router>
  );
}

export default App; 