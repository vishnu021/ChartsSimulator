# ChartsSimulator — Claude Code Guide (Lean)

This file tells Claude how to work in this repo. Procedures live in skills and agents.

## Golden Rules

1. **UI verification is mandatory** — after **any code edit**, Claude must run the `UI Verification` Skill (or `/verify-ui`) using **Playwright MCP** before considering the change complete.
2. **Backend+Frontend dev mode**: run services separately for live UI + MCP tests:

  * Backend (port 9090): `mvn spring-boot:run -Pdev`
  * Frontend (port 3000): `cd frontend && NEXT_PUBLIC_API_URL=http://localhost:9090 NEXT_PUBLIC_WS_URL=http://localhost:9090/ws pnpm dev`
3. **No scrollbars anywhere** (mobile/desktop) — verify with the skill’s viewport sweep.
4. **Changelog upkeep** — every change must update `CHANGELOG.md` using the `/write-changelog` command or **Write Changelog Skill**. Claude never performs git commits; changes are written locally only.

## Post-edit Verification (automatic)

After any **code modification**, automatically:

1. Run the **UI Verification** Skill using **Playwright MCP** against `http://localhost:3000`.
2. Wait for verification to complete and confirm a **PASS** before marking the change finished.
3. If verification fails:

  * Fix the issue,
  * Re-run the skill,
  * Repeat until all pages and console checks pass.
4. Save results and screenshots to `./artifacts/ui/{date}/` for review.

> Use `/edit-and-verify` for a combined edit + Playwright check in one step.

## Maintaining the Changelog

Keep `CHANGELOG.md` current for every feature, bug fix, or visual update.

* Use `/write-changelog` or the **Write Changelog Skill**.
* Each entry should include:

  * **Date** (e.g., `[2025-11-05]`)
  * **Section** (Features / Fixes / UI / Performance / Verification)
  * **Short, descriptive bullet points**
* Do **not** stage or commit via Claude; review and commit manually when ready.

Example:

```markdown
## [2025-11-05]
### Features
- Added dynamic theme toggle to chart settings.
### Fixes
- Corrected scrollbar overflow on mobile viewport.
### Verification
- ✅ UI Verification (Playwright MCP) passed for all pages.
```

## What to use

* **Skills**: see `.claude/skills/*`. Start with:

  * **UI Verification**
  * **No Scrollbars**
  * **Smoke Backtest API**
  * **Write Changelog**
* **Sub-agents**: see `.claude/agents/*`. Common ones:

  * **UI-Verifier** (drives Playwright MCP)
  * **CSS-Sizer** (fixes overflow)
  * **Backtest-Runner** (validates metrics)
  * **Perf-Scout** (bundle / API timings)

## Playwright MCP Endpoint

Always target the **frontend dev server**: `http://localhost:3000` (NOT the Spring static site).

## Repo Quick Commands

* Full app (slow): `mvn spring-boot:run`
* Backend only: `mvn spring-boot:run -Pdev`
* Frontend only: `cd frontend && pnpm dev`
* Package: `mvn clean package -Pprod`

## When done with a change

1. Run **UI Verification** Skill → must pass.
2. Run **No Scrollbars** Skill → must pass at all breakpoints.
3. Run **Smoke Backtest API** Skill → must pass.
4. Run **Write Changelog** Skill → append/update changelog entry.
5. Review results and commit manually when satisfied.

(If any fails: fix, re-run skills, verify, then update changelog.)
