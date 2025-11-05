# Skill: UI Verification (Playwright MCP)

## Goal
Prove UI is healthy after any code change.

## Pre-reqs
- Backend: `mvn spring-boot:run -Pdev` (9090)
- Frontend: `cd frontend && pnpm dev` (3000)

## Procedure
1) Use Playwright MCP to open http://localhost:3000.
2) Collect console messages; fail on any error-level logs.
3) Visit and snapshot: `/`, `/backtest`, `/charts`, `/settings`.
4) Toggle theme(s) and resnapshot.
5) Save to `./artifacts/ui/{YYYYMMDD-HHMM}/`.
6) Return PASS/FAIL + links to images + list of broken selectors.
