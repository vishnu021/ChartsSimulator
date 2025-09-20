# Dashboard Development Guide

## Overview

The ChartsSimulator includes an advanced multi-chart dashboard with synchronized interactions, real-time updates, and advanced chart management features.

## Production vs Development Mode

### Production Mode (Static Build)

- **Access**: `/dashboard` route shows informational page
- **Features**: Basic navigation and instructions
- **Limitations**: Advanced interactive features disabled for static export compatibility

### Development Mode (Full Features)

- **Command**: `npm run dev`
- **Port**: http://localhost:3000/dashboard
- **Features**: Full interactive dashboard with all capabilities

## Dashboard Features (Development Mode)

### Multi-Chart Management

- **4 synchronized charts** in a 2x2 grid layout
- **Real-time data loading** for multiple symbols simultaneously
- **Synchronized zoom and pan** across all charts
- **Individual chart controls** for symbol selection

### Action Buttons

- **⚡📊 Load All Charts**: Automatically loads data for all symbols entered
- **🧹 Reset All Charts**: Clears all symbols and chart data
- **🔄 Refresh All**: Refreshes current chart data
- **🌙/☀️ Theme Toggle**: Switches between dark and light themes

### Interactive Features

- **Crosshair functionality** with horizontal and vertical lines
- **Mouse wheel zoom** synchronized across all charts
- **Drag to pan** with synchronized movement
- **Real-time clock** display
- **Date navigation** with previous/next day buttons

### Technical Implementation

- **Context-based state management** for synchronization
- **Dynamic imports** for performance optimization
- **Cookie-based persistence** for symbol preferences
- **Event-driven communication** between components

## Running the Full Dashboard

1. **Start Development Server**:

   ```bash
   cd frontend
   npm run dev
   ```

2. **Access Dashboard**:
   Navigate to http://localhost:3000/dashboard

3. **Add Symbols**:
   - Enter stock symbols in each chart panel
   - Click the ⚡ button to load individual charts
   - Or use ⚡📊 to load all charts at once

4. **Navigate**:
   - Use date controls to switch trading days
   - Zoom and pan will be synchronized across all charts
   - Hover over charts to see crosshair functionality

## Troubleshooting

### Build Issues

- The advanced dashboard uses browser-specific APIs that cannot be statically generated
- For production deployment, ensure the backend serves the dashboard dynamically
- Development mode (`npm run dev`) is recommended for full dashboard testing

### Performance

- Charts are dynamically loaded to optimize initial page load
- Use the Reset button if charts become unresponsive
- Refresh All button reloads data without losing zoom/pan state

## Integration with Spring Boot

When running the full application:

```bash
mvn spring-boot:run
```

The dashboard will be available at http://localhost:9090/dashboard with full functionality during development builds.
