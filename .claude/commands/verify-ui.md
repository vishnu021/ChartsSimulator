Use Playwright MCP to verify the UI on the frontend dev server.

Steps:
1) Navigate to http://localhost:3000
2) Assert page loads without console errors
3) Click through nav: Home → Backtest → Charts → Settings
4) Take snapshots per page
5) Switch through all app themes and repeat (document any delta)
6) Report: list broken selectors, JS errors, or visual regressions
