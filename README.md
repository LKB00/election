# Election

Make a fun poll between two or more choices (Virat · Rohit · Dhoni, pizza · biryani), share the link, and watch the votes.
**Just for fun. Not official or legal elections.**

Full project reference (what, who, journey, sharing, design rules, open questions): [docs/ABOUT.md](docs/ABOUT.md).

## Run it on your computer

```bash
npm install
npm run dev        # open http://localhost:3000
```

No database setup needed. It saves to a local folder (`.data/`). To use a real database, copy `.env.example` to `.env.local` and set `DATABASE_URL`.

## Check everything works

```bash
npm run check      # types + tests + production build
```

## What is built (MVP)

Short summary. The full, current list is in [docs/ABOUT.md](docs/ABOUT.md) (counting day, Hindi, real inked-finger photo, app feel).

- Create a poll: question, 2 to 10 choices, category, optional end time.
- Two options per poll: hide results until you vote, and allow changing your vote.
- Vote with one tap. **One vote per person** is enforced by the database, so fast double taps cannot count twice.
- Live results bars, share button, copy link, and a share card image for WhatsApp / X / Slack previews.
- Phone-first design, light and dark mode (look taken from the `patricka` project).

## How it is built

| Part | Choice | Why |
|---|---|---|
| App | Next.js + TypeScript | One codebase for pages, API and share images. Very common, easy to hire for. |
| Database | Postgres (Drizzle) | Safe, proven, handles huge growth. Local file database in development. |
| Voter identity | Signed cookie | No login needed to vote. Can add sign-in later. |
| Rate limits | In memory | Swap for Redis when you run more than one server. |

Files to know: `src/db/schema.ts` (tables), `src/lib/polls.ts` (all poll and vote rules), `src/app/api/` (the API), `src/app/` (pages), `src/styles/` (look).

## When it gets heavy (growth plan)

1. **First deploy**: Vercel + a hosted Postgres (Neon or Supabase). Set `DATABASE_URL`, `VOTER_SECRET` (16+ characters) and `NEXT_PUBLIC_SITE_URL`. The app refuses to start in production without the first two. After deploying, open `/api/health`: `{"ok":true}` means the database is connected.
2. **Viral poll**: add Redis (Upstash) for vote counters and rate limits, so the database is not hit for every refresh.
3. **Cheating**: add Google sign-in and a CAPTCHA (Cloudflare Turnstile) as an option for "verified" polls.
4. **Later**: discovery and trending, comments, report and moderation tools, languages, accounts, paid plans.

## Known limits today

- Rate limiting is per server (in memory).
- No accounts yet: a person who clears cookies can vote again. Fine for fun polls, not for sign-in-only polls (next step).
- No poll moderation or report button yet.
- Candidate images are in the database schema but not in the form yet.
