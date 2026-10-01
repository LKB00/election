# Notes for AI assistants

- Product: fun/fan polls ("election"), not legal elections. Owner is not a developer: explain in easy English.
- Stack: Next.js 15 (App Router) + TypeScript 6 (TypeScript 7 breaks Next 15) + Drizzle + Postgres. No `DATABASE_URL` means a local PGlite database in `.data/`.
- All poll and vote rules live in `src/lib/polls.ts`. One vote per voter is enforced by a unique index; keep it that way.
- Hidden results must never leak: `getPoll` zeroes the numbers when `resultsVisible` is false.
- Look and feel comes from the `LKB00/patricka` repo (tokens in `src/styles/tokens.css`).
- Before pushing run `npm run check`.
- Develop on branch `claude/stoic-volta-r2mir5`. Do not open a PR unless asked.
