# Strava Route Optimizer

A web application that helps runners and cyclists optimize their routes using Strava data and the Chinese Postman Problem (CPP) algorithm. The app allows users to draw a polygon on a map, specify start and finish points, and generates the shortest route to travel all roads within the polygon.

## Features

- **Strava Integration**: Connect your Strava account to import your activity routes
- **Interactive Map**: Draw polygons and set start/finish points using Leaflet maps
- **Route Optimization**: Uses CPP algorithm to find the shortest route covering all roads in the polygon
- **OpenStreetMap Integration**: Fetches road data from OSM with automatic snapping of nearby segments
- **GPX Export**: Download optimized routes as GPX files for your GPS device
- **Donation System**: Optional donation button to support the project

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Strava API credentials
- OpenStreetMap API access

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd strava-route-optimizer
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```
   STRAVA_CLIENT_ID=your_strava_client_id
   STRAVA_CLIENT_SECRET=your_strava_client_secret
   STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback
   PORT=5000
   ```

4. **Get Strava API Credentials**
   - Go to https://www.strava.com/settings/api
   - Create a new application
   - Copy the Client ID and Client Secret to your `.env` file

5. **Run the application**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend client (port 3000).

## Usage

1. **Connect to Strava**: Click the "Connect to Strava" button to authorize the application
2. **View Your Routes**: Your previous Strava activities will be displayed on the map
3. **Draw Polygon**: Use the polygon drawing tool to define the area you want to optimize
4. **Set Start/Finish**: Click on the map to set your start and finish points
5. **Optimize Route**: Click "Optimize Route" to generate the shortest path
6. **Download GPX**: Export the optimized route as a GPX file for your device

## Technical Details

### Backend (Node.js/Express)
- Strava API integration for activity data
- OpenStreetMap data fetching and processing
- CPP algorithm implementation for route optimization
- GPX file generation
- Road network snapping (10m threshold)

### Frontend (React)
- Interactive Leaflet maps
- Polygon drawing tools
- Real-time route visualization
- GPX download functionality
- Responsive design

### Algorithms
- **Chinese Postman Problem (CPP)**: Finds the shortest route that traverses every edge in a graph
- **Road Network Snapping**: Connects road segments within 10 meters to ensure network connectivity
- **Route Optimization**: Minimizes total distance while covering all specified roads

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

If you find this project useful, consider making a donation to support its development. 