# CLAUDE.md

This file provides **guidance for Claude Code (claude.ai/code)** and all contributors working in this repository.
It encodes backend/frontend best practices, build requirements, and verification rules.

---

## 🚀 Quick Start

```bash
# Run complete application (frontend + backend integrated)
mvn spring-boot:run

# Access at http://localhost:9090
# Frontend and backend served together
```

---

## 📖 Project Overview

**ChartsSimulator** is a full-stack financial charts application with **real-time data streaming**.

* **Backend (Spring Boot):** APIs, WebSockets, tick data processing
* **Frontend (Next.js with JavaScript):** Interactive chart UI, live updates, theme-driven styling
* **Integration:** Single Maven build packages frontend into Spring Boot resources
* **Package Manager:** pnpm for faster installs and better dependency management
* **Realtime:** WebSocket-based candle/ticker streams, extrema detection
* **Backtesting:** Strategy testing framework with performance metrics and lot-size support

---

## 🔬 Backtesting Framework

The application includes a comprehensive backtesting system for testing trading strategies on historical data.

### Key Features
* **Dedicated Dashboard**: Standalone `/backtest` page accessible from main navigation
* **Configuration-Driven**: All parameters configurable via `application.yml`
* **Lot Size Support**: Quantities automatically rounded to lot multiples (realistic for options/futures)
* **Flexible Position Sizing**: Choose fixed quantity or percentage-based (default: 15% of capital)
* **Risk Management**: Configurable stop-loss (2%) and take-profit (5%) levels
* **Comprehensive Metrics**: Win rate, profit factor, Sharpe ratio, max drawdown, and detailed trade history
* **Modern UI**: Compact design with gray input fields, default value hints, and expanded trade table (500px)

### Configuration (application.yml)
```yaml
app:
  backtest:
    strategyName: "moving-average"      # Strategy to use
    fixedQuantity: 0                     # 0 = percentage-based
    positionSizePercent: 15.0            # 15% of capital per trade
    lotSize: 15                          # Lot size (quantities are multiples)
    stopLossPercent: 2.0                 # 2% stop loss
    takeProfitPercent: 5.0               # 5% take profit
    defaultInitialCapital: 100000.0      # ₹100,000 starting capital
```

### Backend Components
* **BacktestController**: REST API at `/api/backtest`
* **BacktestEngine**: Executes virtual trades and calculates P/L
* **BacktestProperties**: Configuration record with default values
* **MovingAverageStrategy**: Mean reversion strategy with confirmation
* **Lot Size Logic**: Rounds quantities to multiples (e.g., 15, 30, 45, 60...)

### Frontend Page (/backtest)
* **Input Fields**: Gray background (`bg-gray-200`) with black text for visibility
* **Default Hints**: Inline display of default values (e.g., "default: 100,000")
* **Backend Params**: Shows Position Size, Stop Loss, Take Profit from config
* **Compact Report**: Reduced padding/fonts to maximize trade history space
* **Trade Table**: 500px max height (30% more than previous 384px)

### Documentation
See `docs/BACKTESTING_ARCHITECTURE.md` for comprehensive implementation details.

---

## 🏛 Architecture

### Backend (Spring Boot)

* **Main App:** `ChartsSimulatorApplication.java`
* **Controllers:** Thin REST/WebSocket endpoints only
* **Services:** All business logic; SOLID enforced
* **Models/DTOs:** Prefer Java **records**; Lombok `@Builder` for complex structures
* **Config:**
  * Use `@ConfigurationProperties` records bound from `application.yml`
  * Avoid `@Value` for >2 properties
* **Timezone:** Always `Asia/Kolkata`
* **WebSocket:** Configured in `config/WebSocketConfig.java` (STOMP endpoints at `/ws`)
* **Exceptions:** Domain-specific classes + centralized `@ControllerAdvice`
* **Utils:** Shared helpers live in `utils/` package

### Frontend (Next.js, JavaScript)

* **App Router:** Next.js 15 w/ `/app` directory
* **Charts:** Candle, ticker, extrema components under `components/`
* **Theme:** Color palette & typography are theme-driven (dark/light supported via Tailwind config)
* **Services:** Abstract API/WebSocket calls in `services/` layer
* **Hooks:** Custom React hooks for data + connection state
* **Standards:**
  * Pure JavaScript codebase with ESLint + Prettier for best-practice linting and formatting
  * ESLint + Prettier enforced
  * Unit tests (Jest/RTL recommended)
* **Build Tools:**
  * Managed with `package.json` scripts
  * Integrated with Maven build via `frontend-maven-plugin`
  * Package manager: **pnpm** (faster installs, better dependency isolation)
  * Commands: `pnpm build`, `pnpm export`, `pnpm lint`

---

## 🧰 Development Commands

### Integrated Development
```bash
mvn spring-boot:run
# Profile example:
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Backend Only
```bash
mvn spring-boot:run -Pdev   # skips frontend build
./build.sh fast             # skip tests + frontend
```

### Frontend Only
```bash
cd frontend
pnpm dev        # Dev server on port 3000
pnpm build      # Production build
pnpm lint       # ESLint check

# Env vars when running standalone:
NEXT_PUBLIC_API_URL=http://localhost:9090
NEXT_PUBLIC_WS_URL=http://localhost:9090/ws
```

### 🔧 Playwright MCP Debugging Setup
**CRITICAL for UI Testing**: When using Playwright MCP for testing, you MUST run frontend and backend separately to access latest changes:

```bash
# Terminal 1: Backend only (no frontend build)
mvn spring-boot:run -Pdev

# Terminal 2: Frontend dev server (latest changes)
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:9090 NEXT_PUBLIC_WS_URL=http://localhost:9090/ws pnpm dev

# Then use Playwright MCP on: http://localhost:3000
```

**Why this is required:**
- Integrated `mvn spring-boot:run` serves pre-built frontend from `/target/classes/static/`
- Frontend changes aren't visible until Maven rebuilds
- Separate dev server serves live changes from source code

### Full Build & Deploy
```bash
mvn clean package -Pprod
java -jar target/ChartsSimulator-0.0.1-SNAPSHOT.jar
```

---

## 🏗️ Build Process Analysis

### Maven Frontend Integration Process

**How it works:**
```bash
mvn spring-boot:run  # Triggers this sequence:
```

1. **Frontend Build** (`frontend-maven-plugin`):
   ```bash
   pnpm install       # Install Node.js dependencies
   pnpm build         # Next.js production build
   pnpm export        # Static export to /frontend/out/
   ```

2. **Resource Copying** (Maven resources plugin):
   ```bash
   # Copy frontend/out → target/classes/static/
   # Copy frontend/out/_next → target/classes/static/_next/
   ```

3. **JAR Packaging**: Static files embedded in Spring Boot JAR at `/static/**`

4. **Runtime Serving**: Spring Boot serves static files from classpath

### ⚠️ Risks & Limitations

**Development Workflow Issues:**
- **Slow Feedback Loop**: Every frontend change requires full Maven rebuild
- **Resource Intensive**: Each build runs full Next.js compilation (~30-60s)
- **Debugging Complexity**: Frontend errors hidden in Maven output
- **Hot Reload Loss**: No live reload during development

**Production Concerns:**
- **JAR Size Bloat**: Frontend assets increase JAR size significantly
- **Memory Usage**: All static assets loaded into JVM memory
- **Cache Invalidation**: JAR deployment required for frontend updates
- **CDN Limitations**: Can't leverage CDN for static assets easily

**Scaling Issues:**
- **Build Pipeline Coupling**: Frontend/backend deployments are coupled
- **Team Workflow**: Frontend developers need Java/Maven setup
- **CI/CD Complexity**: Single pipeline for different technologies

### 🚀 Better Architectural Approaches

#### 1. **Microservices with Reverse Proxy** (Recommended for Production)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Reverse Proxy  │    │   Backend       │
│   (Nginx/CDN)   │◄──►│  (Nginx/Traefik)│◄──►│  (Spring Boot)  │
│   Port: 80/443  │    │                 │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Advantages:**
- Independent deployments
- CDN integration for frontend
- Horizontal scaling
- Technology stack independence

#### 2. **BFF (Backend for Frontend) Pattern**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   API Gateway   │    │  Microservices  │
│   (Vercel/      │◄──►│   (BFF Layer)   │◄──►│   Ecosystem     │
│    Netlify)     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### 3. **Container Orchestration** (Docker + Kubernetes)
```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
  backend:
    build: ./backend
    ports: ["8080:8080"]
  nginx:
    image: nginx
    ports: ["80:80"]
```

#### 4. **Serverless Architecture**
- **Frontend**: Vercel/Netlify (auto-scaling, CDN)
- **Backend**: AWS Lambda/Google Cloud Functions
- **Database**: Managed services (RDS, DynamoDB)

### 🎯 Recommended Migration Path

**Phase 1: Immediate (Current Project)**
- Keep current Maven integration for simplicity
- Use separate dev servers for development (already implemented)
- Document the limitations

**Phase 2: Short-term (Next 3-6 months)**
```bash
# Option A: Docker Compose Development
docker-compose up  # Runs frontend + backend in containers

# Option B: Separate Deployment Pipeline
# Frontend: Deploy to Vercel/Netlify
# Backend: Deploy as standalone JAR to cloud
```

**Phase 3: Long-term (Production Architecture)**
- Microservices with API Gateway
- CDN for frontend assets
- Container orchestration
- Separate CI/CD pipelines

### 💡 Current Project Justification

**Why we keep Maven integration:**
1. **Simplicity**: Single command deployment
2. **Prototyping**: Faster initial setup
3. **Team Size**: Small team, less deployment complexity
4. **Learning**: Good for understanding full-stack integration

**When to migrate:**
- Team grows beyond 5 developers
- Frontend changes become frequent
- Performance becomes critical
- Need independent scaling

---

## 🔧 Frontend Tooling Standards

### JavaScript Best Practices
* **ESLint Configuration**: `eslint-config-next` with additional best-practice rules
* **Code Formatting**: Prettier with 2-space indentation for consistent code style
* **Import Management**: Absolute imports using `@/` prefix for clean module resolution
* **Code Quality**:
  - JSDoc documentation for utility functions and complex components
  - Consistent naming conventions (camelCase for functions, PascalCase for components)
  - Error boundaries and proper error handling patterns

### Recommended ESLint Rules
```javascript
// .eslintrc.js additions for best practices
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "prefer-const": "error",
    "no-unused-vars": "error",
    "no-console": "warn",
    "jsx-quotes": ["error", "prefer-double"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"]
  }
}
```

### Code Quality Gates
```bash
# Required package.json scripts
"lint": "next lint --max-warnings 0",
"lint:fix": "next lint --fix",
"format": "prettier --write ."

# Run with pnpm
pnpm lint
pnpm lint:fix
pnpm format
```

---

## 🛠 Configuration Guidelines

### @ConfigurationProperties Best Practices

**Use records for configuration binding** (mandatory pattern):

```java
@ConfigurationProperties("app.websocket")
public record WebSocketProperties(
    String endpoint,
    String allowedOrigins,
    int messageDelay,
    int tickerDelay
) {}

@ConfigurationProperties("app.ticker")
public record TickerProperties(
    boolean deduplicateTimestamps,
    long duplicateOffsetMs
) {}
```

### Configuration Rules
* **❌ AVOID:** `@Value` for >2 properties
* **✅ USE:** `@ConfigurationProperties` records for all config groups
* **✅ VALIDATE:** Use Bean Validation annotations
* Never hardcode; avoid magic numbers (constants/enums only)
* Keep controllers thin; delegate to services
* Domain exceptions with clear error payloads
* Consistent timezone: `Asia/Kolkata`

---

## 🏭 Production-Ready Features

### Runtime Configuration
- **Dynamic API/WebSocket URL Detection**: Automatic configuration for any hosting scenario
- **Environment-Specific Settings**: Automatic configuration based on deployment environment
- **Enhanced Error Handling**: Global exception handling with structured error responses
- **Rate Limiting**: Configurable API rate limiting with security headers
- **Health Monitoring**: Comprehensive health check endpoints with system metrics
- **WebSocket Reliability**: Exponential backoff reconnection with connection pooling

### Data Processing Enhancements
- **Tick Data Processing**: Command line tool for processing tick files with time-price mappings
- **Timestamp Deduplication**: Handles duplicate timestamps by incrementing by 600ms in both API and file processing
- **Time Range Filtering**: Configurable time filtering for tick data processing (e.g., 9:20 AM to 1:20 PM)
- **Enhanced Ticker API**: REST API now includes same deduplication logic as file processing for consistent data

### Frontend Chart Improvements
- **Enhanced Zooming**: Improved zoom controls with granular levels (0.1x to 100x horizontal, 0.1x to 20x vertical)
- **Quick Zoom Buttons**: One-click 2x, 5x, and 10x zoom buttons for rapid navigation
- **Adaptive Zoom Speed**: Zoom speed adapts based on current zoom level for smoother experience
- **Dual-axis Zoom**: Horizontal zoom via scroll, vertical zoom via Shift+scroll
- **Better UX**: Enhanced tooltips, visual feedback, and control instructions

### Development Enhancements
- **Integrated Build**: Single command deploys both frontend and backend
- **Configuration Validation**: Startup validation prevents deployment issues
- **Error Boundaries**: React error boundaries for graceful frontend error handling
- **Security Improvements**: CSP headers, XSS protection, and secure CORS policies
- **Deployment Automation**: Production-ready deployment scripts with Docker optimization

---

## 🧱 Enhanced Technology Stack

### Backend Stack
* **Java 17 + Spring Boot 4.0.0-SNAPSHOT** with Jakarta Servlet API (upgraded from javax)
* **WebSocket STOMP** with exponential backoff reconnection and connection pooling
* **Swagger/OpenAPI** documentation with comprehensive API specs
* **Maven** with frontend-maven-plugin integration for unified builds
* **Lombok + Records** for models/configs with validation support
* **Rate Limiting & Security** middleware with configurable policies
* **Global Exception Handling** with structured error responses
* **Health Monitoring** with comprehensive system metrics

### Frontend Stack
* **Next.js 15** with App Router and React 18
* **pnpm** package manager (2-3x faster installs, 50% less disk usage)
* **TailwindCSS** theme system with dark/light mode support
* **Custom Chart Components** with advanced zoom controls and data management hooks
* **STOMP over SockJS** for WebSocket communication with automatic reconnection
* **Dynamic Configuration Loading** for runtime environment detection
* **Error Boundary Components** for graceful error handling
* **ESLint** (with `eslint-config-next`) and Prettier for code quality

### Integration & Deployment
* **Single Command Deployment** with integrated frontend/backend builds
* **pnpm Integration** with Maven for optimized package management
* **Docker Optimization** with multi-stage builds and production configurations
* **Environment-Specific Configuration** with automatic detection
* **Security Enhancements** including CSP headers, XSS protection, and secure CORS
* **Production Monitoring** with health checks and metrics endpoints

---

## 🚨 CRITICAL ENFORCEMENT RULES FOR CLAUDE

### ⚠️ MANDATORY PLAYWRIGHT MCP VERIFICATION

**🔴 ABSOLUTE REQUIREMENT**: Claude MUST use Playwright MCP to verify ALL changes before completion.

#### When to Use Playwright MCP:
- ✅ After editing any UI component
- ✅ After theme-related changes
- ✅ After fixing visual bugs
- ✅ After modifying CSS/styling
- ✅ Before marking tasks as completed

#### Mandatory Development Environment Setup:
**🔴 CRITICAL**: For frontend debugging and Playwright MCP testing, ALWAYS run frontend and backend separately:

```bash
# Terminal 1: Backend only (no frontend build)
mvn spring-boot:run -Pdev

# Terminal 2: Frontend dev server (latest changes)
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:9090 NEXT_PUBLIC_WS_URL=http://localhost:9090/ws pnpm dev
```

**Why This is Required:**
- ✅ Frontend dev server (port 3000) reflects latest code changes immediately
- ✅ Playwright MCP gets most current frontend updates without rebuild delays
- ✅ Debugging is faster with hot reload and instant updates
- ✅ Avoids stale integrated build issues where changes aren't visible
- ❌ Integrated build (`mvn spring-boot:run`) may serve outdated frontend files

#### Mandatory Verification Process:
1. **Navigate to localhost:3000** using Playwright MCP (NOT localhost:9090)
2. **Test affected components** - interact with changed UI elements
3. **Switch themes** - verify changes work across all 5 themes
4. **Check console** - ensure zero browser console errors
5. **Take screenshots** - document visual improvements
6. **Report results** - provide status in completion summary

#### Playwright MCP Commands:
```bash
# Navigate and test (use port 3000 for frontend dev server)
playwright navigate http://localhost:3000
playwright snapshot  # Capture current state
playwright click [element]  # Test interactions
playwright console_messages  # Check for errors
```

#### ⛔ FAILURE CONSEQUENCES:
- Changes cannot be marked complete without Playwright verification
- Visual bugs may go undetected
- Theme compatibility issues missed
- Console errors remain unfixed
- Outdated build results in false testing outcomes

---

### ⚠️ MANDATORY CHANGELOG MANAGEMENT

**🔴 ABSOLUTE REQUIREMENT**: Claude MUST update CHANGELOG.md after EVERY single code modification.

#### When to Update CHANGELOG.md:
- ✅ After editing any file (.js, .jsx, .css, .json, etc.)
- ✅ After adding new features or components
- ✅ After fixing bugs or errors
- ✅ After optimizing performance
- ✅ After theme modifications
- ✅ After dependency changes
- ✅ After configuration updates

#### Mandatory Process:
1. **Make code changes**
2. **Immediately update CHANGELOG.md** (NO EXCEPTIONS)
3. **Test changes with Playwright MCP**
4. **Report completion**

#### CHANGELOG Entry Format:
```markdown
## [Session-YYYY-MM-DD] - Brief Description

### 🚀 Features Added
- New feature: Description of what was added
- File: `path/to/file.jsx`

### 🐛 Bugs Fixed
- Fix: Description of bug fixed
- Files: `path/to/file1.jsx`, `path/to/file2.css`

### 🎨 UI/Theme Improvements
- Theme: Specific improvement description
- Files: `src/app/globals.css`

### 📊 Performance
- Bundle: Before → After (% change)
- Build: ✅ Successful

### ✅ Verification
- Playwright MCP: ✅ PASS / ❌ FAIL / ⏳ PENDING
- Maven Package: ✅ PASS / ❌ FAIL / ⏳ PENDING
- Frontend Lint: ✅ PASS / ❌ FAIL / ⏳ PENDING
- Manual Testing: ✅ PASS / ❌ FAIL / ⏳ PENDING
```

#### ⛔ FAILURE CONSEQUENCES:
- Violates user expectations
- Makes tracking changes impossible
- Breaks project documentation standards
- Creates confusion about what changed

### ⚠️ MANDATORY SCROLLBAR PREVENTION

**🔴 ABSOLUTE REQUIREMENT**: The application MUST NEVER show vertical or horizontal scrollbars.

#### Scrollbar Prevention Rules:
- ✅ All pages must fit within viewport without scrolling
- ✅ Use `overflow: hidden` on containers when necessary
- ✅ Chart components must size correctly within their containers
- ✅ Mobile and desktop views must both prevent scrollbars
- ✅ Use `h-[calc(100vh-4rem)]` or similar viewport-relative heights
- ✅ Content must be properly contained within flex/grid layouts

#### Common Scrollbar Causes to Avoid:
- ❌ Fixed pixel heights that exceed viewport
- ❌ Content overflow from containers
- ❌ Missing `overflow: hidden` on chart containers
- ❌ Improper flex/grid sizing
- ❌ Padding/margins causing container overflow

#### Testing Requirements:
- Test all screen sizes (mobile, tablet, desktop)
- Verify no scrollbars appear in any theme
- Check all pages and components
- Test with different chart data sizes

### Other Enforcement Rules:
1. **Testing**: NEVER skip Playwright MCP verification after changes
2. **JavaScript**: MAINTAIN ESLint compliance and code quality
3. **Themes**: PRESERVE all theme functionality
4. **Build**: ALWAYS verify successful compilation
5. **Scrollbars**: NEVER allow vertical or horizontal scrollbars to appear

---

✅ **This file is binding: NO CHANGE IS COMPLETE without CHANGELOG update, Playwright MCP verification PASS, Maven package PASS, Frontend linting PASS, and NO SCROLLBARS verification.**
