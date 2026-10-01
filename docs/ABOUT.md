# About Election

This is the one-page reference for the project: what it is, who it is for, what is built, and why.
For the reasons behind each screen and element, see [DESIGN.md](DESIGN.md). To run the app, see the [README](../README.md).

- **Live site:** https://election-three-ruby.vercel.app
- **Repo:** `LKB00/election` (work branch `claude/stoic-volta-r2mir5`, live branch `main`)

---

## 1. What it is

Election lets anyone make a **duel** between 2 or more choices, such as *Modi or Rahul?* or *Virat, Rohit or Dhoni?* People vote with one tap, guess who is winning, and share that they voted.

- **Fun and fan polls, open worldwide.** These are not legal or official elections, and the app says so on every screen and share image ("Fun duel · not official").
- **It feels like a real Indian election.** It uses the EVM button and beep, the VVPAT paper slip and the inked finger, because people already know, trust and share these moments.
- **Launch duel:** *Modi or Rahul?* It is the main duel on the Home page.

## 2. Who it is for

| Person | What they want | What we give them |
|---|---|---|
| **Voter** (opens a link from a friend) | Have a say, see where everyone stands, find out if their friend agrees | One-tap vote, no sign-up; results open right after voting |
| **Sharer** (just voted) | Show they took part, tease friends, start a debate | "Show your ink": WhatsApp message already written, secret ballot, Story image |
| **Creator** | Ask their group or fans a question | Create a duel in under a minute, then share the link |

## 3. Main user journey

1. **Open** the Home page or a shared link. The duel is the first thing on screen, so there is nothing to read first.
2. **Vote** by pressing the blue EVM **Vote** button. The red light turns on and the machine beeps.
3. **VVPAT slip:** your choice shows behind glass for about 2.5 seconds, then drops into the box.
4. **Inked finger:** "Vote cast. Your finger is inked · Voter ID EL-000041".
5. **Exit poll:** "Who's winning right now?" You make your guess, or skip it. You can undo your vote for 30 seconds.
6. **Results open:** percentages, whether your guess was right, and, if a friend sent the link, "your friend agrees" or "your friend disagrees".
7. **Show your ink:** share on WhatsApp, as a Status/Story image, or copy the link.
8. **Next duel**, or come back later through **Me**, which shows your level, right guesses and the duels you voted in.

## 4. Why people engage (human behaviour)

| Trigger | In the app |
|---|---|
| Ritual, taking part | EVM button, beep, VVPAT slip, inked finger, voter number |
| Curiosity | Results stay hidden until you vote; shared links say "Guess who I picked?" |
| Tribe | "Your friend voted. Your turn", then "you agree" or "you disagree" |
| Being right | Exit poll guess and the 🎯 right-guesses count |
| Reciprocity | A friend's dare asks for an answer; after voting they get their own share |
| Urgency | "Polling open · closes in…" and "Polling closed · X won" |

We decided **not to have streaks**: the owner felt they add pressure without fun.

## 5. Sharing (built so fewer people drop off)

- **When:** right after the result, the most exciting moment.
- **Where:** WhatsApp first, then Status/Instagram Story, then Copy link.
- **Secret ballot is on by default.** People click more to find out a friend's pick than to read it.
- **Link preview** (1200×630, in chats): inked finger, "I VOTED", both photos, and either your pick or "Guess who I picked?". It has **no QR code**, because the link can already be tapped.
- **Story image** (1080×1920): the same content plus a **small QR code in the corner** with "Scan to vote", because links in Stories can't be tapped.
- **Shared images never show the split.** Friends have to vote to see it.
- **Link format:** `/p/<duel>?f=<your share code>`, plus `&s=1` when your pick is secret.

## 6. Design rules

- **Look:** the **patricka** ("Good Bot, Bad Bot") design system, copied unchanged into `src/styles/gb/`. Election-only styles go in `src/styles/election.css` and use only patricka's colours, sizes and spacing.
  - Text sizes: 10/12/13/14/16/18/20/30/40.
  - Spacing: 4/8/12/16/24/32/48/64.
- **Every element has a job and a priority.** P1 is the main thing, P2 is supporting, P3 is extra. Each screen has only one P1.
- **Colour meaning:** lime means "you / your progress". The dark (ink) button is the one main action on a screen.
- **Fonts** (Bricolage Grotesque, Lato) are bundled with the app, so they look the same on every phone.
- **Photos:** licensed, with credits shown on screen.
  - Modi: Prime Minister's Office, GODL-India.
  - Rahul Gandhi: Himanshu Arya Khowal, CC BY 4.0.

## 7. Features built

- **Voting**
  - One vote per person, enforced by the database.
  - Undo for 30 seconds.
  - Results hidden until you vote. They are hidden on the server too, so nothing leaks.
- **Exit poll guess** and **friends vs everyone** (agree or disagree).
- **Why you picked it and emoji reactions** (🔥😂😮👏🤔). Both are optional.
- **Pages**
  - **Home:** the duel game, then "More duels".
  - **Duels:** all duels.
  - **Create:** 2 to 10 choices, category, end time, hide results, allow vote change.
  - **Me:** level, right guesses, history.
  - Top bar with the right-guesses and votes counts; bottom nav with Home, Duels, Create and Me.
- **Levels:** Newcomer (0 votes), Voter (3), Regular (10), Opinion maker (25), Duel master (50), Legend (100).
- **Categories:** general, cricket, movies, music, food, tech, sports, friends.

## 8. How it is built

| Part | Choice |
|---|---|
| App | Next.js 15 (App Router) + TypeScript 6. TypeScript 7 breaks Next 15. |
| Database | Postgres through Drizzle. Hosted on Neon; uses a local PGlite file in `.data/` when there is no `DATABASE_URL`. |
| Hosting | Vercel. It goes live automatically when `main` changes. |
| Voter identity | Signed cookie. No login. |
| Share images | `next/og`, plus the `qrcode` package for the Story QR. |
| Tests | Vitest on PGlite, and also on real Postgres via `TEST_DATABASE_URL` |

**Settings on Vercel:** `DATABASE_URL`, `VOTER_SECRET` (16+ characters) and `NEXT_PUBLIC_SITE_URL`.

**Files to know**

- `src/lib/polls.ts`: all voting rules.
- `src/db/schema.ts`: the tables (polls, options, votes, reactions).
- `src/db/seed.ts`: the Modi vs Rahul duel.
- `src/components/DuelGame.tsx`: the voting screen.
- `src/components/ShareSheet.tsx`: the share panel.
- `src/app/api/og` and `src/app/api/card`: the share images.

**Before every push:** `npm run check` (types, tests and build).

## 9. How changes go live

1. Changes are made and checked on the work branch.
2. The owner reviews screenshots.
3. When the owner says **"Make live"**, a pull request goes to `main` and is squash-merged.
4. Vercel deploys, and the live site is checked.

## 10. Open questions for the owner

- Confirm the text that was written for the launch:
  - the role lines "BJP · Prime Minister" and "INC · Leader of Opposition"
  - the reasons list
  - the level names
  - the categories
- When to start making money (ads, sponsored duels, paid creator tools). This is not decided yet.

## 11. Ideas for later (only when asked)

- A **daily duel**, and **topic packs** (cricket, movies…).
- **Brackets / knockouts** (for example, the best captain ever).
- **Badges**, live result moments, reminders before a duel closes.
- **Sign-in and a CAPTCHA** for verified duels, Redis for very large traffic, and tools to moderate and report duels.

## 12. Known limits today

- No accounts, so someone who clears their cookies can vote again. This is fine for fun polls.
- Rate limits are kept per server (in memory).
- No report button or moderation yet.
- Duel creators can't add photos yet. Only the launch duel has photos.
