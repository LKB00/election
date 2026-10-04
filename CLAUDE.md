# Notes for AI assistants

- Product: "Election", a place to see what people think about anything (fun/fan polls, not official, not legal elections). Owner is not a developer: explain in easy English. The plan for this direction is `docs/OPINIONS.md`.
- Stack: Next.js 15 (App Router) + TypeScript 6 (TypeScript 7 breaks Next 15) + Drizzle + Postgres. No `DATABASE_URL` means a local PGlite database in `.data/`.
- All poll and vote rules live in `src/lib/polls.ts`. One vote per voter is enforced by a unique index; keep it that way.
- Hidden results must never leak: `getPoll` zeroes the numbers when `resultsVisible` is false.
- UI = the patricka (Good Bot, Bad Bot) design system, copied unchanged into `src/styles/gb/`. Do not edit gb/; put Election-only styles in `src/styles/election.css` using gb tokens. Reuse patricka markup/classes (tot, today-card, daily-banner, games, level-card). The owner rejected custom designs: stay with patricka.
- Opinions rule: every poll works like a simple, fair vote (secret ballot, one vote each, results after you vote, the inked finger as our signature, "Guess the crowd"). The full booth ritual (EVM beep, VVPAT slip, voter ID, counting day, "Result declared") is **Election mode**: on for politics polls and the flagship, a choice for creators, off otherwise. Never use the words "exit poll" in the product (legal risk, RP Act s.126A). No quiz/game parts from patricka: no steppers, score bubbles, points, levels, trophies or streaks; never money, coins or prizes.
- Every element needs a job and a priority (P1/P2/P3). Read and update `docs/DESIGN.md` before changing any screen. One P1 per screen; lime = "you / your progress"; ink button = the one main action.
- All interface text lives in `src/lib/i18n.ts` (English + Hindi + Hinglish). Never hard-code UI text in components; add a key to all three languages. Share images are English or Hinglish (the image renderer cannot shape Hindi).
- Fonts are bundled (fontsource), not Google Fonts, so screenshots in the sandbox match real phones.
- Tests run on PGlite; also run them on real Postgres with TEST_DATABASE_URL (it caught Date/precision bugs).
- Before pushing run `npm run check`.
- Develop on branch `claude/stoic-volta-r2mir5`. Do not open a PR unless asked.
