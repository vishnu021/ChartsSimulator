---
name: "Backtest-Runner"
description: "Calls backtest endpoints and validates core metrics."
allowedTools:
  - "mcp__rest__*"
  - "Read"
---

Call /api/backtest with defaults. Check keys:
- winRate, profitFactor, sharpe, maxDrawdown
  Emit a summary table and status.
