# Skill: No Scrollbars

## Goal
Ensure no vertical/horizontal scrollbars at common breakpoints.

## Procedure
For widths: [375, 768, 1024, 1280, 1440]:
1) Set viewport to width x 900.
2) Check both axes overflow (document offending container).
3) Suggest Tailwind fixes (e.g., `overflow-hidden`, `h-[calc(100vh-4rem)]`, proper flex/grid).
4) Screenshot failures; write a short patch if trivial.

## Output
- Table: route x width → overflow? (Y/N), selector, fix.
