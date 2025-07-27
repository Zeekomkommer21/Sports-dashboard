# Setup Guide for Strava Route Optimizer

This guide will walk you through setting up the Strava Route Optimizer application on your local machine.

## Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for version control)

## Quick Start

### 1. Clone or Download the Project

If you have Git:
```bash
git clone <repository-url>
cd strava-route-optimizer
```

Or download and extract the ZIP file to a folder.

### 2. Install Dependencies

**On Windows:**
```bash
install.bat
```

**On macOS/Linux:**
```bash
chmod +x install.sh
./install.sh
```

**Manual installation:**
```bash
npm install
cd client && npm install && cd ..
```

### 3. Configure Strava API

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application:
   - **Application Name**: Route Optimizer (or any name you prefer)
   - **Category**: Other
   - **Website**: http://localhost:3000
   - **Authorization Callback Domain**: localhost

3. Copy your **Client ID** and **Client Secret**

4. Create a `.env` file in the root directory:
```bash
cp env.example .env
```

5. Edit the `.env` file and replace the placeholder values:
```
STRAVA_CLIENT_ID=your_actual_client_id
STRAVA_CLIENT_SECRET=your_actual_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback
PORT=5000
NODE_ENV=development
```

### 4. Start the Application

```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend client (port 3000).

### 5. Access the Application

Open your browser and go to: http://localhost:3000

## Features Overview

### 🔗 Strava Integration
- Connect your Strava account to import activities
- View your previous routes on the map
- Automatic token refresh

### 🗺️ Interactive Map
- Draw polygons to define optimization areas
- Set start and end points
- Real-time route visualization

### 🧮 Route Optimization
- Chinese Postman Problem (CPP) algorithm
- Finds shortest route covering all roads in polygon
- Considers your existing Strava activities

### 🛣️ OpenStreetMap Integration
- Fetches road data from OSM
- Automatic road network snapping (10m threshold)
- Ensures network connectivity

### 📱 GPX Export
- Download optimized routes as GPX files
- Compatible with GPS devices and running watches
- Includes waypoints and route metadata

### 💝 Donation System
- Optional donation button
- PayPal and credit card support
- Helps support development and hosting costs

## Troubleshooting

### Common Issues

**1. "Failed to connect to Strava"**
- Check your Strava API credentials in `.env`
- Ensure the redirect URI matches exactly
- Verify your application is approved on Strava

**2. "Failed to fetch road data"**
- Check your internet connection
- OSM servers might be temporarily unavailable
- Try a smaller polygon area

**3. "Route optimization failed"**
- Ensure your polygon contains roads
- Check that start/end points are accessible
- Try a different area or smaller polygon

**4. Port already in use**
- Change the PORT in your `.env` file
- Kill processes using ports 3000 or 5000

### Development Mode

For development, the app runs in development mode with:
- Hot reloading for frontend changes
- Detailed error messages
- CORS enabled for local development

### Production Deployment

For production deployment:
1. Set `NODE_ENV=production` in your `.env`
2. Build the frontend: `npm run build`
3. Use a process manager like PM2
4. Set up proper SSL certificates
5. Configure a reverse proxy (nginx/Apache)

## API Endpoints

### Strava API
- `GET /api/strava/auth-url` - Get Strava authorization URL
- `POST /api/strava/token` - Exchange code for access token
- `GET /api/strava/activities` - Get user activities
- `GET /api/strava/activities/:id` - Get specific activity

### OSM API
- `POST /api/osm/roads` - Fetch road data from OSM
- `POST /api/osm/network-graph` - Build network graph

### Optimization API
- `POST /api/optimization/optimize` - Optimize route using CPP

### GPX API
- `POST /api/gpx/generate` - Generate GPX file
- `POST /api/gpx/from-strava` - Export Strava activity as GPX

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed information
4. Consider making a donation to support development

## License

This project is licensed under the MIT License - see the LICENSE file for details. 