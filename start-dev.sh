#!/bin/bash

# Griham Full Stack Startup Script
# This script starts both the backend API and frontend development servers

echo "🏠 Starting Griham Home Automation System..."
echo ""

LOCAL_IP=$(ipconfig getifaddr en1)
sleep 1
echo "📡 Local IP Address: $LOCAL_IP"
# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Please run this script from the root griham directory"
    exit 1
fi

# Kill existing processes on ports 8000 and 3001
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1
echo ""

# Start backend
echo -e "${BLUE}Starting PHP Backend API...${NC}"
cd backend
php -S $LOCAL_IP:8000 -t public &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo "   API: http://$LOCAL_IP:8000/api"
echo ""

# Wait a moment for backend to initialize
sleep 2

# Start frontend
echo -e "${BLUE}Starting React Frontend...${NC}"
cd ../frontend
npm run dev -- --host $LOCAL_IP --port 3001 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   UI: http://$LOCAL_IP:3001"
echo ""

echo -e "${GREEN}✅ Both servers are running!${NC}"
echo ""
echo "📍 Access the application at: http://$LOCAL_IP:3001"
echo ""
echo -e "${YELLOW}🔐 Test Credentials:${NC}"
echo "   Email: admin@griham.com"
echo "   Password: admin123"
echo ""
echo "📝 To stop servers, press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script running
wait
