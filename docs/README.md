# ChartsSimulator Documentation

## 📚 Documentation Overview

This documentation provides comprehensive guides for understanding the ChartsSimulator application architecture, component relationships, and integration patterns.

## 📁 Directory Structure

```
docs/
├── README.md                          # This file - Documentation index
├── architecture/                      # System architecture documentation
│   ├── frontend-architecture.md       # Frontend component architecture
│   └── backend-architecture.md        # Backend service architecture
├── diagrams/                         # Visual flow diagrams
│   └── component-reuse-flow.md       # Component reuse patterns
└── components/                       # Component-specific guides
    └── chartpanel-integration.md     # ChartPanel integration guide
```

## 🏗️ Architecture Documentation

### Frontend Architecture
**File**: `architecture/frontend-architecture.md`

Covers the complete frontend architecture including:
- **Modular Chart System**: ChartPanel, UnifiedChart, ChartContainer
- **Component Hierarchy**: Page → Layout → Chart components
- **State Management**: React Context, custom hooks, data flow
- **Rendering Pipeline**: Canvas management, renderer system
- **Technology Stack**: Next.js 15, React 18, TailwindCSS
- **Performance Optimizations**: Lazy loading, memoization, canvas optimization

**Key Benefits**:
- 85% code reduction in chart pages (132 → 19 lines)
- Single source of truth for chart logic
- Automatic feature propagation across all pages

### Backend Architecture
**File**: `architecture/backend-architecture.md`

Details the Spring Boot backend architecture including:
- **Layered Architecture**: Controllers, Services, Processors, Models
- **Data Processing Pipeline**: Tick data → Candlesticks → Analysis
- **Real-time Streaming**: WebSocket STOMP, rate limiting
- **Configuration Management**: `@ConfigurationProperties` records
- **Integration Patterns**: Frontend packaging, API gateway
- **Performance Features**: Caching, async processing, monitoring

**Key Features**:
- Real-time WebSocket streaming with exponential backoff
- Timestamp deduplication with 600ms offset handling
- Modular service architecture with SOLID principles

## 🔄 Component Reuse Documentation

### Component Reuse Flow
**File**: `diagrams/component-reuse-flow.md`

Visual diagrams showing:
- **Before/After Refactoring**: Code reduction statistics
- **Component Ecosystem**: How components interact and reuse
- **Configuration Matrix**: Different page configurations
- **Data Flow Patterns**: From API to rendered charts
- **Renderer System**: Pure function reuse across chart types
- **Dashboard Integration**: Multi-chart layouts

**Reuse Statistics**:
```
Page Refactoring Results:
├── Candles Page: 132 → 19 lines (85% reduction)
├── Extrema Page: 107 → 19 lines (82% reduction)
├── Charts Page: 111 → 19 lines (83% reduction)
└── Total: 350 → 57 lines (84% overall reduction)
```

### ChartPanel Integration Guide
**File**: `components/chartpanel-integration.md`

Comprehensive integration patterns including:
- **Configuration Options**: All available props and their effects
- **Integration Patterns**: Standard pages, dashboard, modals, widgets
- **Data Management**: Automatic vs custom data sources
- **State Management**: Theme integration, error handling, loading states
- **Advanced Patterns**: Multi-chart sync, progressive enhancement
- **Performance**: Lazy loading, memoization, virtual scrolling
- **Best Practices**: Configuration over customization

## 🚀 Quick Start Guides

### For Developers Adding New Chart Pages
```javascript
// 1. Create new page (only 19 lines needed!)
export default function NewChartPage() {
  return (
    <PageLayout>
      <ChartPanel
        chartType="extrema"          // Choose chart type
        showControls={true}          // Configure UI
        showModeToggle={false}       // Hide/show features
      />
    </PageLayout>
  );
}

// 2. That's it! Full chart functionality included automatically
```

### For Dashboard Integration
```javascript
// Embed multiple charts easily
<div className="grid grid-cols-2 gap-4">
  <ChartPanel
    chartType="dashboard"
    showControls={false}
    showStats={false}
    className="h-64"
  />
  {/* Repeat for 4-chart grid */}
</div>
```

### For Adding New Chart Features
```javascript
// 1. Add renderer function
export const renderNewFeature = (ctx, data, options) => {
  // Rendering logic
};

// 2. Add to UnifiedChart options
const UnifiedChart = ({ showNewFeature, ...props }) => {
  if (showNewFeature) {
    renderNewFeature(ctx, data, options);
  }
};

// 3. Create preset if needed
export const NewFeatureChart = (props) => (
  <UnifiedChart showNewFeature={true} {...props} />
);

// 4. Available in all chart pages automatically!
```

## 📊 Architecture Benefits

### Code Maintainability
- **Single Source of Truth**: Chart logic centralized in UnifiedChart
- **DRY Principle**: No duplicate code across chart pages
- **Automatic Updates**: Bug fixes apply to all pages automatically
- **Consistent Interface**: All chart pages have identical behavior

### Developer Experience
- **Minimal Code**: New chart pages require only 19 lines
- **Configuration-Driven**: Easy customization through props
- **Type Safety**: Clear interfaces and prop definitions
- **Hot Reload**: Fast development with Next.js

### User Experience
- **Consistent UI**: All chart pages look and behave the same
- **Theme Support**: Dark/light themes across all components
- **Responsive Design**: Works on mobile and desktop
- **Real-time Data**: WebSocket streaming with reconnection

### Performance
- **Canvas Optimization**: Efficient rendering with device pixel ratio
- **Lazy Loading**: Components load only when needed
- **Memory Management**: Proper cleanup and garbage collection
- **Caching**: Smart data caching for better performance

## 🎯 Use Case Examples

### 1. Standard Chart Page
```javascript
// Full-featured chart page with all controls
<ChartPanel
  chartType="extrema"
  showControls={true}
  showStats={true}
  showModeToggle={true}
  showThemeToggle={true}
/>
```

### 2. Dashboard Mini-Chart
```javascript
// Minimal chart for dashboard embedding
<ChartPanel
  chartType="dashboard"
  showControls={false}
  showStats={false}
  showModeToggle={false}
  className="h-48"
/>
```

### 3. Modal Chart
```javascript
// Chart in a popup/modal dialog
<ChartPanel
  chartType="candlestick"
  showControls={false}
  showThemeToggle={false}
  style={{ maxWidth: '600px', height: '400px' }}
/>
```

### 4. Widget Embed
```javascript
// Small chart widget for external embedding
<ChartPanel
  chartType="extrema"
  showControls={false}
  showStats={false}
  showModeToggle={false}
  showThemeToggle={false}
  className="h-32 w-64"
/>
```

## 🔧 Development Workflow

### Adding New Features
1. **Plan**: Review architecture docs to understand integration points
2. **Implement**: Add renderer functions and configuration options
3. **Test**: Use existing pages to verify functionality
4. **Document**: Update integration guide with new options

### Debugging Issues
1. **Check Configuration**: Verify ChartPanel props are correct
2. **Review Data Flow**: Follow data from API through useChartData hook
3. **Inspect Rendering**: Use browser dev tools to check canvas rendering
4. **Test Integration**: Verify theme, loading, and error states

### Performance Optimization
1. **Profile Rendering**: Use React DevTools Profiler
2. **Optimize Canvas**: Check device pixel ratio handling
3. **Memory Usage**: Monitor WebSocket connections and cleanup
4. **Bundle Analysis**: Review code splitting and lazy loading

## 📝 Contributing Guidelines

### Documentation Updates
- Update relevant docs when adding new features
- Include code examples for integration patterns
- Add performance considerations for new components
- Update architecture diagrams when structure changes

### Code Standards
- Follow existing configuration patterns
- Maintain component reusability principles
- Add TypeScript types for new props
- Include error handling and loading states

### Testing Requirements
- Test all ChartPanel configurations
- Verify dashboard integration
- Check theme switching functionality
- Test mobile and desktop responsiveness

## 🔗 Related Resources

- **Project Root**: `/CLAUDE.md` - Development guidelines and build instructions
- **Changelog**: `/CHANGELOG.md` - Recent changes and session history
- **Frontend Code**: `/frontend/components/charts/` - Chart component implementations
- **Backend Code**: `/src/main/java/` - Spring Boot backend services

## 💡 Tips for Success

1. **Start Simple**: Use basic ChartPanel configuration first
2. **Configuration Over Customization**: Use props instead of modifying components
3. **Follow Patterns**: Use existing integration examples as templates
4. **Test Early**: Verify integration with Playwright MCP testing
5. **Performance First**: Consider lazy loading for dashboard scenarios

This documentation provides everything needed to understand, extend, and maintain the ChartsSimulator's modular architecture. The reusable component system ensures that new features benefit all chart pages automatically while maintaining code quality and user experience consistency.