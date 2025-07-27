#!/bin/bash

echo "🚀 Installing Strava Route Optimizer..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing backend dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
cd client && npm install && cd ..

echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy env.example to .env and configure your Strava API credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "🔧 For Strava API setup, visit: https://www.strava.com/settings/api" 