# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Run complete application (recommended)
mvn spring-boot:run

# Access at http://localhost:9090
# Frontend and backend served together
```

## Project Overview

ChartsSimulator is a full-stack financial charts application with real-time data streaming capabilities. It combines a Spring Boot backend with a Next.js frontend, featuring WebSocket-based real-time chart updates for candle charts, ticker displays, and extrema analysis.

## Architecture

### Backend (Spring Boot)
- **Main Application**: `src/main/java/com/vish/fno/ChartsSimulator/ChartsSimulatorApplication.java`
- **Controllers**: RESTful APIs and WebSocket controllers for candles, tickers, and chart types
- **Services**: Business logic for data processing, chart generation, and WebSocket session management
- **Models**: Data structures for candles, tickers, extrema, and chart metadata
- **WebSocket Configuration**: Real-time bidirectional communication setup in `config/WebSocketConfig.java`
- **API Documentation**: Swagger/OpenAPI integration accessible at `/swagger-ui.html`

### Frontend (Next.js)
- **App Router**: Next.js 15 with app directory structure
- **Charts Components**: Specialized chart components for candles, tickers, and combined views
- **WebSocket Management**: Custom WebSocketManager class handling STOMP over SockJS connections
- **Services**: Data fetching and WebSocket communication services
- **Hooks**: Custom React hooks for chart data, ticker data, and WebSocket state management

### Key Integration Points
- WebSocket endpoints: `/ws` with STOMP protocol
- API base path: REST endpoints for historical data and configuration
- Static resource serving: Frontend build served from Spring Boot's static resources
- CORS configuration: Allows frontend-backend communication during development

## Development Commands

### Integrated Development (Recommended)
```bash
# Run complete application (frontend + backend together)
# This automatically builds frontend and serves it from Spring Boot
mvn spring-boot:run

# Alternative with profile
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Access application at http://localhost:9090
# Frontend is served from the same port as backend
```

### Backend-Only Development (Faster iteration)
```bash
# Run backend only (skip frontend build)
mvn spring-boot:run -Pdev

# Fast backend build (skip frontend and tests)
./build.sh fast

# Development build (backend only)
./build.sh dev
```

### Frontend-Only Development
```bash
cd frontend
npm run dev          # Development server on port 3000
npm run build        # Production build
npm run lint         # ESLint

# Note: When running frontend separately, set these environment variables:
# NEXT_PUBLIC_API_URL=http://localhost:9090
# NEXT_PUBLIC_WS_URL=http://localhost:9090/ws
```

### Full Application Build & Deploy
```bash
# Production build (frontend + backend integrated)
mvn clean package -Pprod

# Run production JAR (includes frontend)
java -jar target/ChartsSimulator-0.0.1-SNAPSHOT.jar

# Using build script
./build.sh prod

# Using deployment script
./scripts/deploy-production.sh
```

### Testing & Quality
```bash
# Run all tests
mvn test

# Frontend linting
cd frontend && npm run lint

# Full build with tests
mvn clean install

# Check application health
curl http://localhost:9090/api/health
```

### Tick Data Processing (Configuration-Based)
```bash
# Configure tick processing in application.yml:
app:
  tickProcessor:
    enabled: true          # Set to true to enable automatic processing on startup
    date: 2025-07-18      # Date to process (required)
    symbol: NIFTY 50      # Symbol to process (required)
    outputPath: output/    # Output directory
    deduplicateTimestamps: true # Handle duplicate timestamps by incrementing by 600ms
    timeFilter:
      enabled: false        # Set to true to enable time range filtering
      startTime: "09:20:00" # Start time (HH:mm:ss format)
      endTime: "13:20:00"   # End time (HH:mm:ss format) - 1:20 PM in 24-hour format

# Examples:

# Process all data (default behavior):
# timeFilter.enabled: false

# Process only data between 9:20 AM to 1:20 PM:
# timeFilter:
#   enabled: true
#   startTime: "09:20:00"
#   endTime: "13:20:00"

# Process only morning session (9:15 AM to 11:30 AM):
# timeFilter:
#   enabled: true
#   startTime: "09:15:00"
#   endTime: "11:30:00"

# Run application - tick processing happens automatically on startup if enabled:
mvn spring-boot:run

# Or build and run JAR:
mvn clean package -Pdev
java -jar target/ChartsSimulator-0.0.1-SNAPSHOT.jar

# Output:
# Creates output/tick_data_NIFTY_50_2025-07-18.json with time-price mappings
# Uses existing DataLoaderService and baseLogPath configuration
# Format includes time filtering info:
# {
#   "symbol": "NIFTY 50", 
#   "date": "2025-07-18", 
#   "timeFilter": {"enabled": true, "startTime": "09:20:00", "endTime": "13:20:00"},
#   "data": [{"time": "09:20:00.000", "ltp": 25144.2}, ...]
# }

# To disable: Set app.tickProcessor.enabled=false in application.yml
```

## Maven Profiles

- **prod** (default): Full build including frontend static generation
- **dev**: Backend-only build, skips frontend for faster development
- **fast**: Backend-only build, skips tests and frontend for rapid iteration

## Configuration

### Application Properties
- **Port**: 9090 (configurable via `SERVER_PORT` env var)
- **WebSocket endpoint**: `/ws`
- **API documentation**: `/swagger-ui.html`
- **Static resources**: Served from classpath:/static/
- **Health checks**: `/api/health`, `/api/health/detailed`
- **Runtime config**: `/api/config` (for dynamic frontend configuration)

### Environment Variables
- `APP_ENV`: Application environment (default: local)
- `APP_ENVIRONMENT`: Application environment for configuration (default: development)
- `SERVER_PORT`: Server port (default: 9090)
- `WS_ALLOWED_ORIGINS`: WebSocket CORS origins
- `CORS_ALLOWED_ORIGINS`: HTTP CORS origins
- `RATE_LIMIT_ENABLED`: Enable rate limiting (default: true)
- `RATE_LIMIT_REQUESTS_PER_MINUTE`: Rate limit threshold (default: 60)

### Development Environment Setup
Copy the environment template and configure:
```bash
cp frontend/.env.example frontend/.env.local
# Edit .env.local with your settings
```

## Recent Improvements

### Production-Ready Features
- **Runtime Configuration**: Dynamic API/WebSocket URL detection for any hosting scenario
- **Environment-Specific Settings**: Automatic configuration based on deployment environment
- **Enhanced Error Handling**: Global exception handling with structured error responses
- **Rate Limiting**: Configurable API rate limiting with security headers
- **Health Monitoring**: Comprehensive health check endpoints with system metrics
- **WebSocket Reliability**: Exponential backoff reconnection with connection pooling

### Development Enhancements
- **Integrated Build**: Single command deploys both frontend and backend
- **Configuration Validation**: Startup validation prevents deployment issues
- **Error Boundaries**: React error boundaries for graceful frontend error handling
- **Security Improvements**: CSP headers, XSS protection, and secure CORS policies
- **Deployment Automation**: Production-ready deployment scripts with Docker optimization

## Key Technologies

### Backend Stack
- Spring Boot 4.0.0-SNAPSHOT
- Spring WebSocket with STOMP
- Swagger/OpenAPI documentation
- Maven with frontend integration
- Jakarta Servlet API (upgraded from javax)
- Rate limiting and security middleware

### Frontend Stack
- Next.js 15 with App Router
- React 18
- TailwindCSS
- STOMP over SockJS for WebSocket communication
- Custom chart components and data management hooks
- Dynamic configuration loading
- Error boundary components