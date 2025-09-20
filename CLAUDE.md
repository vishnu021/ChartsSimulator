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
* **Realtime:** WebSocket-based candle/ticker streams, extrema detection

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
    * Commands: `npm run build`, `npm run export`, `npm run lint`

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
npm run dev     # Dev server on port 3000
npm run build   # Production build
npm run lint    # ESLint check

# Env vars when running standalone:
NEXT_PUBLIC_API_URL=http://localhost:9090
NEXT_PUBLIC_WS_URL=http://localhost:9090/ws
```

### Full Build & Deploy
```bash
mvn clean package -Pprod
java -jar target/ChartsSimulator-0.0.1-SNAPSHOT.jar
```

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
* **TailwindCSS** theme system with dark/light mode support
* **Custom Chart Components** with advanced zoom controls and data management hooks
* **STOMP over SockJS** for WebSocket communication with automatic reconnection
* **Dynamic Configuration Loading** for runtime environment detection
* **Error Boundary Components** for graceful error handling
* **ESLint** (with `eslint-config-next`) and Prettier for code quality

### Integration & Deployment
* **Single Command Deployment** with integrated frontend/backend builds
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

#### Mandatory Verification Process:
1. **Navigate to localhost:3000** using Playwright MCP
2. **Test affected components** - interact with changed UI elements
3. **Switch themes** - verify changes work across all 5 themes
4. **Check console** - ensure zero browser console errors
5. **Take screenshots** - document visual improvements
6. **Report results** - provide status in completion summary

#### Playwright MCP Commands:
```bash
# Navigate and test
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

### Other Enforcement Rules:
1. **Testing**: NEVER skip Playwright MCP verification after changes
2. **JavaScript**: MAINTAIN ESLint compliance and code quality
3. **Themes**: PRESERVE all theme functionality
4. **Build**: ALWAYS verify successful compilation

---

✅ **This file is binding: NO CHANGE IS COMPLETE without CHANGELOG update, Playwright MCP verification PASS, Maven package PASS, and Frontend linting PASS.**
