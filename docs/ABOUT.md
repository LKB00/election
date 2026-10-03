# About Election

This is the one-page reference for the project: what it is, who it is for, what is built, and why.
For the reasons behind each screen and element, see [DESIGN.md](DESIGN.md). For research and the improvement plan, see [UX-RESEARCH.md](UX-RESEARCH.md). To run the app, see the [README](../README.md).

- **Live site:** https://election-three-ruby.vercel.app
- **Repo:** `LKB00/election` (work branch `claude/stoic-volta-r2mir5`, live branch `main`)

---

## 1. What it is

Election lets anyone make a **duel** between 2 or more choices, such as *Modi or Rahul?* or *Virat, Rohit or Dhoni?* People vote with one tap, guess who is winning, and share that they voted.

- **Fun and fan polls, open worldwide.** These are not legal or official elections, and the app says so on every screen and share image ("Fun duel · not official").
- **It feels like a real Indian election.** It uses the EVM button and beep, the VVPAT paper slip, a real photo of an inked finger, exit polls and counting day, because people already know, trust and share these moments.
- **In English, Hindi and Hinglish** (language menu in the top bar).
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
4. **Inked finger:** a real photo of a finger rises in and the real ink is wiped on from the nail down. Then "Vote cast. Your finger is inked. Voter ID EL-000041".
5. **Exit poll:** "Who's winning right now?" You make your guess, or skip it. You can undo your vote for 30 seconds.
6. **Counting day:** results are counted in front of you in 3 real rounds (the lead can swing), with a majority line, "Swing in 24 h" and a LIVE dot. Then: whether your exit poll was right, and, if a friend sent the link, "you agree" or "you disagree". An ended duel shows "Result declared: X wins by N votes".
7. **Share your ink:** share on WhatsApp, as a Status/Story image, or copy the link.
8. **Next duel**, or come back later through **My votes**: the duels you voted in, and how often your exit poll was right.

## 4. Why people engage (human behaviour)

| Trigger | In the app |
|---|---|
| Ritual, taking part | EVM button, beep, VVPAT slip, inked finger, voter number |
| Curiosity | Results stay hidden until you vote; shared links say "Guess who I picked?" |
| Tribe | "Your friend voted. Your turn", then "you agree" or "you disagree" |
| Being right | Exit poll guess: "Your exit poll was right!" |
| Reciprocity | A friend's dare asks for an answer; after voting they get their own share |
| Urgency | "● Polling open · closes in…", the LIVE dot, and "Result declared" |
| Drama | Counting in rounds, the swing, the majority line |

We decided **not to have streaks, levels, points or score bubbles**: they belong to quiz games, not elections.

## 5. Sharing (built so fewer people drop off)

- **When:** right after the result, the most exciting moment.
- **Where:** WhatsApp first, then Status/Instagram Story, then Copy link.
- **Secret ballot is on by default.** People click more to find out a friend's pick than to read it.
- **The WhatsApp message** carries a short, spoiler-free line (the Wordle idea): "🗳️ “Modi or Rahul?” · I voted ☝️ · Exit poll ✅ · Guess who I picked?…". In Hindi when Hindi is on.
- **Link preview** (1200×630, in chats): the real inked-finger photo, "I VOTED", both photos, and either your pick or "Guess who I picked?". It has **no QR code**, because the link can already be tapped.
- **Story image** (1080×1920): the same content plus a **small QR code in the corner** with "Scan to vote", because links in Stories can't be tapped.
- **Share images are English or Hinglish:** the image maker cannot join Hindi letters correctly.
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
  - Inked finger: GaneshBhakt, CC BY-SA 3.0 (edited: cropped, and an ink-free copy made only for the animation). Credits in `public/ink/CREDITS.md`.
- **The election rule:** only things a real election has. No quiz or game parts.
- **All interface text** lives in one file, `src/lib/i18n.ts`, in English, Hindi and Hinglish.

## 7. Features built

- **Voting**
  - One vote per person, enforced by the database.
  - Undo for 30 seconds.
  - Results hidden until you vote. They are hidden on the server too, so nothing leaks.
- **Exit poll guess** and **friends vs everyone** (agree or disagree).
- **Why you picked it and emoji reactions** (🔥😂😮👏🤔). Both are optional.
- **Counting day:** 3 real counting rounds, majority line, 24-hour swing with a race line, LIVE dot, "Result declared".
- **Feels like an app:** beep on/off, the next duel slides in, a "no internet" bar (and offline votes send later), a loading outline, add to home screen, small photos, and no motion for phones set to "reduce motion".
- **Hindi and Hinglish:** every screen and message, with a Hindi font bundled. Hinglish also on share images.
- **Safety:** "Report this duel" on every duel, auto-hide after 3 reports (unchecked duels only), the owner's review page `/admin`, a word filter on Create, and user duels about politicians held off public lists until approved.
- **Election silence windows:** politics duels show no results and no exit poll while a real election is in its silence period.
- **Privacy:** a Privacy and reports page, a private link to keep your votes on a new phone, and "Delete my votes". IP addresses are never stored.
- **Search:** `robots.txt`, `sitemap.xml` (reviewed duels only) and topic pages (`/topic/cricket`).
- **Pages**
  - **Home:** the duel game, then "More duels".
  - **Duels:** the duel of the day, Most watched now, all duels, then topic chips.
  - **Topic pages:** `/topic/<topic>`, the duels of one topic.
  - **Privacy and reports:** `/privacy`.
  - **Review (owner only):** `/admin?key=<ADMIN_SECRET>`.
  - **Create:** 2 to 10 choices (each with an optional emoji), quick start chips, a live ballot preview, category, end time, hide results, allow vote change.
  - **My votes:** your record in one sentence, the list of your votes with where each one stands now, a private link to keep them, and Delete my votes.
  - Top bar with just the logo (no scores); bottom nav with Home, Duels, Create and My votes.
- **No game parts:** no levels, points, score bubbles, steppers or streaks. Everything must exist in a real election (see the election rule in DESIGN.md).
- **Categories:** general, politics, cricket, movies, music, food, tech, sports, friends.

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

Optional settings (each feature stays off until set):
- `ADMIN_SECRET` (16+ characters): turns on the review page.
- `NEXT_PUBLIC_GRIEVANCE_EMAIL`: the complaints contact shown on the Privacy page.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: vote-rate limits shared by all servers (free Upstash account).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: the invisible bot check on votes (free Cloudflare account).
- `SILENCE_WINDOWS`: election silence windows, for example `[{"from":"2027-02-08T18:00:00+05:30","to":"2027-03-10T18:00:00+05:30"}]`.

**Files to know**

- `src/lib/polls.ts`: all voting rules.
- `src/db/schema.ts`: the tables (polls, options, votes, reactions).
- `src/db/seed.ts`: the Modi vs Rahul duel and the 4 starter duels.
- `src/lib/moderation.ts`: the word filter and the politics hold.
- `src/lib/silence.ts`: election silence windows.
- `src/components/DuelGame.tsx`: the voting screen.
- `src/components/ShareSheet.tsx`: the share panel.
- `src/app/api/og` and `src/app/api/card`: the share images.
- `src/lib/i18n.ts`: all interface text, English, Hindi and Hinglish.
- `src/components/InkFinger.tsx` and `public/ink/`: the inked-finger photo and its animation.

**Before every push:** `npm run check` (types, tests and build).

## 9. How changes go live

1. Changes are made and checked on the work branch.
2. The owner reviews screenshots.
3. When the owner says **"Make live"**, a pull request goes to `main` and is squash-merged.
4. Vercel deploys, and the live site is checked.

## 10. Owner decisions (answered)

- **Line above each name:** party only ("BJP", "INC"), no job titles.
- **Reasons list:** keep Leadership, Vision, Honesty, Experience, Connects with people, Fresh ideas.
- **Categories:** keep all 9 (general, politics, cricket, movies, music, food, tech, sports, friends).
- **Money:** later. Grow users first, with no ads or payments for now.

## 11. Roadmap

Design, UX, UI and interaction are the selling points. The plan, with research and sources, is in [UX-RESEARCH.md](UX-RESEARCH.md).

| Batch | Name | What it adds | Status |
|---|---|---|---|
| 1 | Guess the crowd | Exit poll, friends vs everyone, share image with your pick | Live |
| 2 | Feels like a real election | EVM button and beep, VVPAT slip, inked finger, "Show your ink" sharing, story card with QR | Live |
| Audit | Every element checked | Repeats removed, election rule (no points, levels, steppers), party-only lines, full names | Live |
| 3 | Counting day | Results counted in 3 real rounds, majority line, swing in 24 h with a race line, LIVE dot, "Result declared: X wins by N votes" | Live |
| 4 | Feels like an app | Beep on/off, next duel slides in, offline bar and vote retry, loading outline, add to home screen, lighter photos and pages, reduce-motion support | Live. **Still to do: server and database near India** (needs the owner's Vercel and Neon settings) |
| 5 | Speaks Bharat | Hindi switch (हिं / EN) for all interface text, spoiler-free WhatsApp line with your exit poll result | Live (share images stay English) |
| Round 2 | Safe and found | Report and review, silence windows, Hinglish, calendar reminder, counting ticker, keep or delete my votes, privacy page, search basics, topic pages, starter duels, shared limits and bot check (off until keys are set) | Built on the work branch |
| Round 3 | Easier to use | EVM ballot rows for 3+ choices, tap-to-skip slip, distinct circle letters, emoji per choice, "why people picked", My votes standings, Most watched now, Create quick start and live preview | Built on the work branch |
| Ink | Real inked finger | Real photo of an inked finger, ink wiped on after voting, used in the story card and link preview | Live |

**Open items:**
- Owner settings for Round 2: `ADMIN_SECRET`, `NEXT_PUBLIC_GRIEVANCE_EMAIL`, and (optional) the Upstash and Turnstile keys. Add a `SILENCE_WINDOWS` entry when the Election Commission announces dates.
- A WhatsApp Channel ("Aaj ka mukabla") posting one duel a day: the owner creates it in WhatsApp.
- Phone notifications for declared results (needs push keys and a sending job). The calendar link covers this for now.
- Move the server and database near India (the server runs in Washington, USA today). Needs the owner's Vercel and Neon accounts; about 15 minutes, guided.
- The owner's reference picture for the voting animation (a Vecteezy link that could not be downloaded; to be attached in chat). Vecteezy pictures need a licence, so it would be a style reference only.
- A bigger, full-width ink moment (the finger is small on screen today).

**We will not do:** swipe-to-vote, carousels, points, levels, streaks, badges, heavy 3D or video effects. We will also never show anyone's pick without their choice.

**Later ideas (only when asked):**
- daily duel and topic packs
- brackets / knockouts
- reminders before a duel closes
- sign-in and CAPTCHA for verified duels
- Redis for very large traffic
- moderation and report tools

## 12. Known limits today

- No accounts, so someone who clears their cookies can vote again. This is fine for fun polls.
- Rate limits are kept per server until the Upstash settings are added.
- Moderation is one person (the owner) on the review page. The word filter is a short list, so it misses things; reports catch the rest.
- Duel creators can add an emoji per choice, but not photos yet (needs file storage). Only the launch duel has photos.
- The ink-free copy of the finger photo was made by digitally removing the ink. It shows only during the 0.9-second wipe, and a faint smudge can be seen if you look closely.
- The server is in the USA, so pages are slower for people in India until it moves.
