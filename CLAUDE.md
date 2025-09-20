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
* **Frontend (Next.js with JavaScript tooling):** Interactive chart UI, live updates, theme-driven styling
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

  ```java
  private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");
  ```
* **WebSocket:** Configured in `config/WebSocketConfig.java` (STOMP endpoints at `/ws`)
* **Exceptions:** Domain-specific classes + centralized `@ControllerAdvice`
* **Utils:** Shared helpers live in `utils/` package
* **API Docs:** Swagger/OpenAPI at `/swagger-ui.html`

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
    * E2E via Playwright (mandatory gate)
* **Build Tools:**

    * Managed with `package.json` scripts
    * Integrated with Maven build via `frontend-maven-plugin`
    * Commands: `npm run build`, `npm run export`, `npm run lint`

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

### Build Verification
* **Required**: ESLint JavaScript rules must pass: `npm run lint`
* **Required**: Prettier formatting consistency: `npm run format`
* **Note**: Pure JavaScript approach - no compilation needed

---

## 🔑 Integration Points

* **WebSocket:** `/ws` (STOMP/SockJS)
* **REST APIs:** Historical + configuration endpoints at `/api/...`
* **Static Resources:** Next.js build copied to `src/main/resources/static`
* **CORS:** Configurable origins for local dev

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
./build.sh prod
./scripts/deploy-production.sh
```

Maven uses `frontend-maven-plugin` to:

* Install Node.js & npm (v18.18.0 / 9.8.1)
* Run `npm install`
* Run `npm run export` to build static site
* Copy output from `/frontend/out` and `/frontend/out/_next` into Spring Boot static resources

---

## ✅ Verification Gates (Mandatory)

Every code change **must** satisfy all gates before being marked complete:

1. **Playwright MCP E2E tests**

   ```bash
   cd frontend
   npm ci
   npm run e2e       # playwright test --reporter=list
   ```

    * Must pass locally and in CI
    * Covers: page load, WebSocket flow, no console errors

2. **Maven package**

   ```bash
   mvn clean package
   ```

    * Builds backend + frontend into single JAR
    * No failing unit/integration tests

3. **CHANGELOG updated**

    * `CHANGELOG.md` must include new entry with features/fixes/performance

---

## 📝 CHANGELOG Format

All contributors **must update `CHANGELOG.md`** using this template per session/PR:

```md
## [Session-YYYY-MM-DD] - Brief Description

### 🚀 Features Added
- New feature: Description
- File: `path/to/file.java`

### 🐛 Bugs Fixed
- Fix: Bug description
- Files: `...`

### 🎨 UI/Theme Improvements
- Theme: Improvement description
- Files: `src/app/globals.css`

### 📊 Performance
- Bundle: Before → After (% change)
- Build: ✅ Successful

### ✅ Verification
- Playwright: ✅ PASS (link/run-id)
- Backend Package: ✅ PASS (`target/ChartsSimulator-*.jar`)
```

---

## ⚙️ Maven Profiles

* **prod:** Full build (frontend + backend)
* **dev:** Backend only (faster iteration)
* **fast:** Backend only, skip tests & frontend

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

@ConfigurationProperties("app.cors")
public record CorsProperties(
    String allowedOrigins,
    String allowedMethods,
    String allowedHeaders,
    boolean allowCredentials
) {}
```

**Configuration Validation:**

```java
@ConfigurationProperties("app.security")
public record SecurityProperties(
    @NotBlank String allowedOrigins,
    @Min(1) @Max(1000) int rateLimitRequestsPerMinute,
    @Valid RateLimit rateLimit
) {
    public record RateLimit(
        boolean enabled,
        @Positive int requestsPerMinute
    ) {}
}
```

**Injection Pattern:**

```java
@Service
@RequiredArgsConstructor
public class WebSocketConfigService {
    private final WebSocketProperties properties;
    // Use properties.endpoint(), properties.allowedOrigins(), etc.
}
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

## 📊 Recent Improvements (Highlights)

* Config-driven tick data processing with time filtering
* Automatic timestamp deduplication (600ms increment)
* Enhanced chart UX (granular zoom, adaptive controls)
* Robust WebSocket reconnection + pooling
* React error boundaries + CSP/XSS protection
* Integrated build → one deployable artifact
* Playwright MCP enforcement in pipeline

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
* **Playwright E2E** testing (mandatory verification gate)

### Integration & Deployment
* **Single Command Deployment** with integrated frontend/backend builds
* **Docker Optimization** with multi-stage builds and production configurations
* **Environment-Specific Configuration** with automatic detection
* **Security Enhancements** including CSP headers, XSS protection, and secure CORS
* **Production Monitoring** with health checks and metrics endpoints

---

## 🔧 Troubleshooting Guide

### Common Issues

#### Frontend Build Failures
```bash
# Clear Next.js cache
rm -rf frontend/.next frontend/out
npm run clean && npm run build
```

#### WebSocket Connection Issues
* Check CORS settings in `application.yml`
* Verify `app.websocket.allowed-origins` includes frontend URL
* Test WebSocket endpoint: `wscat -c ws://localhost:9090/ws`

#### Maven Build Issues
```bash
# Skip frontend for backend-only development
mvn spring-boot:run -Pdev
# Force frontend rebuild
mvn clean package -Pprod
```

### Performance Debugging
* Enable debug logging: `logging.level.com.vish.fno.ChartsSimulator: DEBUG`
* Profile frontend: Open Chrome DevTools > Performance tab
* Monitor WebSocket traffic: Network tab > WS filter

---

## 🧪 Enhanced Testing Standards

### Backend Testing Requirements
```bash
# Unit tests (JUnit 5 + Mockito)
mvn test

# Integration tests with @SpringBootTest
mvn test -Dtest="*IntegrationTest"

# WebSocket testing with STOMP test client
@SpringBootTest(webEnvironment = RANDOM_PORT)
class WebSocketIntegrationTest {
    @Test void shouldConnectAndReceiveMessages() { /* */ }
}
```

### Frontend Testing Requirements
```bash
# Unit tests (Jest + React Testing Library)
npm test

# Component integration tests
npm run test:integration

# Visual regression tests (optional)
npm run test:visual
```

### E2E Testing (Mandatory)
```bash
# Playwright tests must cover:
cd frontend && npm run e2e
# - Page load performance
# - WebSocket connectivity
# - Chart rendering accuracy
# - Real-time data updates
# - Cross-browser compatibility (Chrome, Firefox, Safari)
```

---

## 🚀 Production Deployment

### Environment Configuration
```bash
# Required environment variables
export APP_ENV=production
export SERVER_PORT=8080
export WS_ALLOWED_ORIGINS=https://yourdomain.com
export CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Optional performance tuning
export JAVA_OPTS="-Xmx2g -XX:+UseG1GC"
```

### Health Checks
* Actuator endpoints: `/actuator/health`, `/actuator/metrics`
* Custom health indicators for data sources
* WebSocket connection monitoring

### Security Considerations
* Enable HTTPS in production
* Configure proper CORS origins (no wildcards)
* Rate limiting configuration
* Input validation on all endpoints

### Monitoring & Logging
```yaml
# production.yml additions
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true

logging:
  level:
    com.vish.fno.ChartsSimulator: INFO
  appenders:
    file:
      enabled: true
      location: /var/log/charts-simulator/
```

---

## 📊 Performance Standards

### Backend Performance
* WebSocket message latency: < 50ms
* REST API response time: < 200ms (95th percentile)
* Memory usage: < 1GB under normal load
* CPU usage: < 70% sustained

### Frontend Performance
* Initial page load: < 3 seconds
* Chart rendering: 60 FPS for real-time updates
* Bundle size: < 500KB gzipped
* Lighthouse score: > 90 (Performance)

### Monitoring Commands
```bash
# Backend metrics
curl http://localhost:9090/actuator/metrics/jvm.memory.used

# Frontend performance
npm run analyze  # Bundle analyzer
npm run lighthouse  # Performance audit
```

---

## 🌟 Development Workflow

### Branch Naming Convention
* `feature/add-dark-mode-toggle`
* `fix/websocket-connection-timeout`
* `perf/optimize-chart-rendering`
* `docs/update-api-documentation`

### Pre-commit Requirements
```bash
# Install pre-commit hooks
npm run prepare  # Runs husky install

# Pre-commit checklist (automated):
# ✅ ESLint passes (frontend)
# ✅ Java compilation (backend)
# ✅ Unit tests pass
# ✅ Code formatting (Prettier)
```

### Pull Request Template
```markdown
## 🎯 Changes Made
- [ ] Backend changes
- [ ] Frontend changes
- [ ] Configuration changes
- [ ] Database/API changes

## ✅ Verification Checklist
- [ ] Playwright E2E tests pass
- [ ] Maven package builds successfully
- [ ] CHANGELOG.md updated
- [ ] Manual testing completed

## 📊 Performance Impact
- Bundle size: Before → After
- Build time: Before → After
- Any breaking changes: Yes/No
```

---

## 🔧 Development Environment

### Required IDE Extensions
#### VS Code
```json
{
  "recommendations": [
    "ms-vscode.vscode-java-pack",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "redhat.java",
    "vscjava.vscode-spring-boot-dashboard"
  ]
}
```

### Code Formatting
* **Java**: Google Java Style (enforced by Maven Checkstyle)
* **JavaScript**: Prettier with 2-space indentation
* **Configuration files**: YAML 2-space indentation

### Hot Reload Setup
```bash
# Backend hot reload (Spring Boot DevTools)
mvn spring-boot:run

# Frontend hot reload
cd frontend && npm run dev

# Full-stack development
# Terminal 1: mvn spring-boot:run -Pdev
# Terminal 2: cd frontend && npm run dev
```

---

## 🚀 Quick Reference

### Essential Commands
| Task | Command |
|------|---------|
| Full development | `mvn spring-boot:run` |
| Backend only | `mvn spring-boot:run -Pdev` |
| Frontend only | `cd frontend && npm run dev` |
| Production build | `mvn clean package -Pprod` |
| Run tests | `mvn test && cd frontend && npm test` |
| E2E tests | `cd frontend && npm run e2e` |

### Key URLs
| Service | URL |
|---------|-----|
| Application | http://localhost:9090 |
| API Docs | http://localhost:9090/swagger-ui.html |
| Health Check | http://localhost:9090/actuator/health |
| Frontend Dev | http://localhost:3000 |

### Configuration Hierarchy
1. `application.yml` (base)
2. `application-{profile}.yml` (environment)
3. Environment variables (highest priority)

---

### Pre-deployment Checklist

Run these commands in order:

1. **Backend Verification**
   ```bash
   mvn clean test  # Must pass with 0 failures
   mvn package     # Must build successfully
   ```

2. **Frontend Verification**
   ```bash
   cd frontend
   npm ci                    # Clean install
   npm run lint             # 0 warnings allowed
   npm run e2e              # Playwright tests
   ```

3. **Integration Verification**
   ```bash
   mvn spring-boot:run &    # Start backend
   cd frontend && npm run build && npm run start  # Test production build
   # Verify: http://localhost:3000 loads correctly
   ```

4. **Documentation Update**
   ```bash
   # Update CHANGELOG.md with session entry
   # Commit changes: git add . && git commit -m "feat: description"
   ```

❌ **STOP**: If any step fails, do not proceed to deployment.

---

## 🚨 MANDATORY VERIFICATION GATES

**⚠️ CRITICAL: Every code change is INCOMPLETE and INVALID without ALL verification gates passing.**

### ✅ Required Gates (All Must Pass)

1. **CHANGELOG.md Update** (MANDATORY)
   ```bash
   # Must add detailed entry to CHANGELOG.md using the template format
   # Include: features, fixes, performance, files changed, verification status
   ```

2. **Playwright E2E Tests** (MANDATORY)
   ```bash
   cd frontend
   npm ci
   npm run e2e  # Must be configured and must PASS
   # If script missing: Add "e2e": "playwright test" to package.json
   ```

3. **Maven Package Build** (MANDATORY)
   ```bash
   mvn clean package
   # Must build successfully with 0 errors
   ```

4. **Frontend Linting** (MANDATORY)
   ```bash
   cd frontend
   npm run lint  # Must pass with 0 warnings
   ```

### 🛑 ENFORCEMENT RULES

- **NO EXCEPTIONS**: Every commit/session must satisfy ALL gates
- **NO SHORTCUTS**: Cannot skip any verification step
- **NO PARTIAL COMPLETION**: All gates must pass or change is invalid
- **CHANGELOG FIRST**: Update CHANGELOG.md before marking any task complete

### 📋 CHANGELOG Template (MANDATORY FORMAT)

```markdown
## [Session-YYYY-MM-DD] - Brief Description

### 🚀 Features Added
- Feature: Description
- Files: `path/to/file.ext`

### 🐛 Bugs Fixed
- Fix: Description
- Files: `path/to/file.ext`

### 🔧 Configuration Changes
- Config: Description
- Files: `path/to/config.file`

### 📊 Performance
- Improvement: Description with metrics

### ✅ Verification
- Playwright E2E: ✅ PASS / ❌ FAIL / ⏳ PENDING
- Maven Package: ✅ PASS / ❌ FAIL / ⏳ PENDING
- Frontend Lint: ✅ PASS / ❌ FAIL / ⏳ PENDING
- Manual Testing: ✅ PASS / ❌ FAIL / ⏳ PENDING
```

---

✅ **This file is binding: NO CHANGE IS COMPLETE without CHANGELOG update, Playwright E2E PASS, Maven package PASS, and Frontend linting PASS.**
