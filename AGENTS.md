# Repository Guidelines (Agents)

This document aligns agent workflows with our repo’s conventions and best practices. It incorporates selected practices from CLAUDE.md that have proven effective in this codebase.

## Project Structure & Module Organization
- Backend: `src/main/java/com/vish/fno/ChartsSimulator/**`; resources in `src/main/resources`; tests in `src/test/java`.
- Frontend (Next.js 15, React 18): `frontend/` with `app/`, `components/`, `hooks/`, `services/`, `public/`.
- Build outputs: Java `target/`; frontend `.next/` and `out/`.
- Tooling & ops: `pom.xml`, `build.sh`, `Dockerfile`, `docker-compose.yml`, helper scripts in `scripts/`.

## Quick Start
- Integrated dev: `mvn spring-boot:run` (default) or `mvn spring-boot:run -Dspring-boot.run.profiles=local`.
- App runs at `http://localhost:9090` with backend and (when built) frontend.

## Build, Test, and Development Commands
- Full build (frontend + backend): `mvn clean package -Pprod` or `./build.sh prod`.
- Fast backend-only build: `mvn clean package -Pfast` (skips tests and frontend).
- Backend tests: `mvn test`.
- Frontend dev (standalone):
  - Preferred: `cd frontend && pnpm install && pnpm dev` (served at `http://localhost:3000`).
  - Alternative: `npm install && npm run dev`.
  - Env when standalone: `NEXT_PUBLIC_API_URL=http://localhost:9090`, `NEXT_PUBLIC_WS_URL=http://localhost:9090/ws`.
- Frontend build/export: `cd frontend && pnpm build` or `pnpm export` (or `npm run build` / `npm run export`).
- Lint frontend: `cd frontend && pnpm lint`.
- Docker (optional): `docker compose up --build`.

## Architecture Overview
### Backend (Spring Boot)
- Controllers thin; services own business logic (SOLID).
- Models/DTOs favor Java records; use Lombok `@Builder` for complex types.
- Configuration via `@ConfigurationProperties` records bound from `application.yml` (prefer over `@Value` for >2 props).
- Timezone: `Asia/Kolkata` for all time handling.
- WebSocket STOMP endpoints at `/ws` (configured under `config/`).
- Centralized exception handling with `@ControllerAdvice`.

### Frontend (Next.js)
- App Router in `frontend/app` with components in `frontend/components`.
- WebSocket/STOMP client in `services/` or hooks, with automatic reconnect.
- Absolute imports via `@/` prefix (see `frontend/jsconfig.json`).
- Theme-driven styling; Tailwind configured in `tailwind.config.mjs`.

## Frontend Tooling Standards
- ESLint: single config at `frontend/.eslintrc.js` (remove duplicates like `.eslintrc.json`); extends `next/core-web-vitals` with strict rules.
- Prettier: 2-space indentation; run `pnpm format` to write changes.
- Required scripts in `frontend/package.json`: `dev`, `build`, `lint`, `lint:fix`, `format`. CI lint uses `eslint . --max-warnings 0`.
- Import hygiene: prefer absolute `@/` imports; avoid unused exports/vars.
- Logging: do not use `console.*` in app code. Use `@/utils/logger` (`logger.debug/info/warn/error`) with `NEXT_PUBLIC_LOG_LEVEL` controlling verbosity (`debug|info|warn|error|silent`). The logger is no-op below the configured level and permits scoped loggers via `logger.withScope('Scope')`.

Canonical ESLint baseline (ESLint CLI, adapted to `.js`):
```js
// frontend/.eslintrc.js
module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'prefer-const': 'error',
    'no-unused-vars': 'error', // zero-warnings CI: treat as error
    'no-console': 'error',     // use '@/utils/logger' instead of console.*
    'jsx-quotes': ['error', 'prefer-double'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
  },
};
```

Zero-warnings policy: avoid warn-only rules in config (e.g., remove or set `'off'` for noisy rules like `'max-len'`), or ensure code does not trigger them; CI fails on any warnings.

## Backend Configuration Best Practices
- Use `@ConfigurationProperties` records for grouped config; validate with Bean Validation.
- Avoid magic numbers; prefer enums/constants.
- Keep controllers thin and stateless; delegate work to services.

Example pattern (from CLAUDE.md):
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

## Data & Realtime Practices
- WebSocket reliability: implement exponential backoff reconnect on the client.
- Ticker/tick processing: ensure duplicate timestamp handling (e.g., +600ms offsets) for consistency between API and file processing.
- Define clear time windows for processing (e.g., 09:20–13:20 IST) when applicable.

## Testing Guidelines
- Backend: JUnit via `spring-boot-starter-test`. Name files `*Tests.java` mirroring package structure. Run with `mvn test`.
- Scope: add unit tests for new services and critical utilities; mock external calls.
- Frontend: Jest + React Testing Library recommended if/when tests are added (colocate under `frontend/__tests__/`).

## Commit & Pull Request Guidelines
- Commits: imperative mood, concise summary (e.g., "fix: align dashboard x-axis"). Group related changes.
- PRs: clear description, linked issues, steps to validate, and screenshots/GIFs for UI changes. Note config/env changes.
- Quality gates: backend builds (`mvn package`) green and `cd frontend && pnpm lint` passes with zero warnings (CI enforces `--max-warnings 0`).

## Security & Configuration Tips
- Spring profiles: set with `APP_ENV` (`local`, `dev`, `prod`); port via `SERVER_PORT`. CORS/WS origins are configurable.
- Frontend env: use `frontend/.env.local` and avoid committing secrets. Do not hardcode URLs; use env and `application.yml`.
- API docs: Swagger UI at `/swagger-ui.html`; OpenAPI at `/api-docs`.
- Add CSP and security headers where possible; validate inputs on both ends.

## Adoption: What’s Good And What’s Risky
Pros of adopting CLAUDE.md practices here:
- Faster frontend installs and consistent builds with pnpm + frontend-maven-plugin.
- Cleaner configuration with `@ConfigurationProperties` records; easier validation and testing.
- Stricter ESLint/Prettier rules improve readability and reduce drift.
- Unified dev workflow: `mvn spring-boot:run` runs the stack; simpler onboarding.
- WebSocket resiliency patterns reduce flaky UX during reconnects.

Trade‑offs and cautions:
- Spring Boot 4.0.0-SNAPSHOT can change; pin versions as needed to avoid breakage.
- pnpm requirement may surprise npm‑only environments; document the need or provide npm fallbacks.
- Stricter lint rules can slow iteration; tune warnings vs errors pragmatically.
- Integrated frontend build in Maven adds complexity to the Java build; keep profiles (`dev`, `fast`, `prod`) well-documented.
- Enforce a single ESLint source of truth (`frontend/.eslintrc.js`); remove any duplicate configs introduced later.
