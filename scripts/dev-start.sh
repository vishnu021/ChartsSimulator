#!/bin/bash
# Development startup script - runs frontend and backend concurrently

set -e

echo "🚀 Starting ChartsSimulator Development Environment"

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo "❌ Maven is required but not installed."; exit 1; }

# Set development environment
export APP_ENVIRONMENT=development
export SPRING_PROFILES_ACTIVE=dev

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down development servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

echo "📦 Installing frontend dependencies..."
cd frontend
npm install

echo "🎯 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 3

echo "☕ Starting backend development server..."
cd ..
mvn spring-boot:run -Pdev &
BACKEND_PID=$!

echo ""
echo "✅ Development environment started!"
echo "📱 Frontend: http://localhost:3000"
echo "🖥️  Backend: http://localhost:9090"
echo "🔗 Integrated: http://localhost:9090 (recommended for testing)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for background processes
wait $FRONTEND_PID $BACKEND_PID