Perform the requested code change, then run the **UI Verification** Skill (Playwright MCP) against http://localhost:3000.

Rules:
- Treat verification as part of the same task.
- If verification fails, iterate (fix, rerun) until PASS before responding "done".
- Attach a PASS/FAIL summary and links to screenshots under ./artifacts/ui/.
