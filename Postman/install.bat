@echo off
echo 🚀 Installing Strava Route Optimizer...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing backend dependencies...
npm install

echo 📦 Installing frontend dependencies...
cd client
npm install
cd ..

echo ✅ Installation complete!
echo.
echo 📝 Next steps:
echo 1. Copy env.example to .env and configure your Strava API credentials
echo 2. Run 'npm run dev' to start the development server
echo 3. Open http://localhost:3000 in your browser
echo.
echo 🔧 For Strava API setup, visit: https://www.strava.com/settings/api
pause 