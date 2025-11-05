# Skill: Smoke Backtest API

## Goal
Validate the backtest pipeline is alive and returning expected keys.

## Procedure
1) Call GET/POST `/api/backtest` with default params.
2) Expect JSON keys: winRate, profitFactor, sharpe, maxDrawdown, trades[].
3) Assert 9:15–15:30 IST filtering occurs on tick cache (log any mismatch).
4) Fail if any key missing or trades array empty for a standard dataset.

## Output
- Minimal metrics summary and status.
