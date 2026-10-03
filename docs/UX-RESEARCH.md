# UX research: making design, UX, UI and interaction our selling points

Every idea below follows two rules:
- **The election rule** (DESIGN.md): it must exist in a real election or in election-night coverage.
- **patricka's look:** no new design system.

## What we learned

| Source | Lesson | What it means for Election |
|---|---|---|
| Indian counting-day TV and results sites | Counting is **drama**. Trends come first ("leading / trailing"), round by round, then "won". Every tally shows the **majority mark** (for example 148 of 294). | Our results just appear as fixed numbers. They should **be counted** in front of you, with a majority line. |
| Polymarket (prediction app) | A feed of cards, one big percentage, a photo, and a **simple line chart of how the odds moved**. Feels social, not technical. | Show how the race **moved over time** (the "swing"), not just where it is now. |
| Instagram poll sticker and X polls | Polls get **10–20× more answers than comments** because answering takes one tap and a few seconds. Anonymous voting raises vote rates. | Keep voting one tap, anonymous and instant. Never add steps before the vote. |
| Wordle | It went viral when sharing became a **spoiler-free emoji grid** that anyone can read in a chat. | Our WhatsApp text can carry a small, spoiler-free "I voted ☝️ · exit poll ✅" line, not only a link. |
| Micro-interaction research | Feedback should come **within 100 ms**. Save big effects (confetti) for **meaningful moments**. Subtle press, bounce and haptics make taps feel solid. | The press-down on the Vote button, the beep and the vibration must be instant. Big effects only when results are declared. |
| NN/g: mobile users in India | Cheap Android phones, little memory, **prepaid data**, shared phones, slow networks outside cities. People want **web alternatives to apps**. | Speed and data size are part of the design. Make it installable and light. Privacy matters on a shared phone. |
| "Design for Bharat" articles | **Your own language** builds trust. Copy real-world mental models and avoid unfamiliar gestures. | A **Hindi / Hinglish** switch. Keep EVM, VVPAT and ink (real-world models). Avoid hidden swipes. |
| View Transitions API | Smooth, native-like screen changes, handled by the browser. Must respect "reduce motion". | Moving to the next duel should feel like a new ballot sliding in, not a jump. |

## Our site today (measured)

- **JavaScript:** about 103 KB shared by every page; the Create page is 131 KB because the form rules library is sent to the phone. Fine, but Create can be lighter.
- **Photos:** 35 KB and 22 KB JPEGs. They could be about half that as AVIF/WebP.
- **Live server response:** 0.4–1.9 s from this test machine. The first visit after a quiet spell is the slowest (cold start).
  - Vercel and Neon are probably in the USA (needs checking). Every page then has to travel India → USA → India.
  - Moving them near India (Mumbai / Singapore) is likely the **single biggest feel-faster win**.
- **Results** appear all at once; there is no counting moment.
- **No "majority" line, no swing over time, no Hindi, not installable, no sound off switch.**

## Recommendations, in batches (biggest impact first)

**Next:** see "Round 2 research" below for the new top 10.

**Status:** Batches 3, 4 and 5 are live (see DESIGN.md, "Batches 3–5"), plus a real inked-finger photo with an ink animation. Not done yet: moving the server and database near India (needs the owner), and Hindi in share images (the image renderer can't shape Hindi).

### Batch 3: "Counting day" (the selling point)

1. **Counting animation on reveal.** After your exit poll, the result is counted, not shown.
   - The bars and numbers count up in 3 quick "rounds" (about 1.5 s in total), with "Counting · round 2 of 3".
   - The lead can swing between rounds, then it settles on "Leading" or "Won".
   - Reduce-motion users see the final numbers at once.
2. **Majority mark.** A thin line at 50% on each result bar, labelled "majority". Anyone can see at a glance whether someone is clearly ahead.
3. **Swing since yesterday.** A small line under the bars, like "Modi ▲ 3% in the last 24 h", plus a tiny trend line (Polymarket style). Election words: *swing*.
4. **Live numbers.** When new votes arrive while you watch, the count rolls up and a small "LIVE" dot pulses, like a TV ticker.
5. **"Result declared" moment.** When a duel with an end time closes, the first visit after that shows a declared banner ("Result declared: X wins by N votes"). Confetti only here and for a right exit poll.

### Batch 4: "Feels like an app, on any phone"

1. **Faster for India:** move the Vercel functions to Mumbai and the database next to India. Needs your Neon and Vercel settings; I'd guide you.
2. **Instant feedback everywhere:** press states under 100 ms on every button, haptics on vote and guess, and a **sound on/off** switch for the EVM beep (people vote in public places).
3. **Smooth transitions:** the next duel slides in like a fresh ballot (View Transitions), and pages fade. Everything is off for reduce motion.
4. **Loading and offline states:** a grey placeholder of the ballot instead of a blank screen, and a clear "No internet. Your vote will send when you are back online."
5. **Add to home screen:** an icon on the phone, opens full screen, light. This is the "web alternative to an app" NN/g recommends.
6. **Lighter pages:** AVIF/WebP photos, and no form-rules library sent to the Create page.
7. **Accessibility pass:** check contrast (the light blue Vote button), 44 px touch targets, and screen-reader lines for "Vote cast" and results.

### Batch 5: "Speaks Bharat"

1. **Hindi / Hinglish switch** (Hindi first, others later). It needs one place that holds all the text, so it's a larger job.
2. **WhatsApp text with a spoiler-free line** (Wordle lesson):
   "🗳️ Modi or Rahul? · I voted ☝️ · Exit poll ✅ · Guess who I picked? link"

## Round 2 research (October 2026): what to do next

How this was done:
- I checked the live site from outside: its speed headers, link previews and search files.
- I walked through the app at phone size: vote, exit poll, results, Duels, Create, My votes.
- I researched current sources (listed at the end of this section).

Each idea passes the election rule. **Impact** is how much it helps (High/Med/Low). **Effort** is how much work it is (S = hours, M = days, L = weeks).

### What we found on the live site
- **The server is in the USA.** The live headers say `iad1` (Washington). Every visitor in India waits for a trip to America and back.
- **Nothing is cached.** Every page is sent as `no-store`, so each view is built fresh, even for a poll that thousands of people open.
- **Search engines get little help.** There is no `robots.txt` and no `sitemap.xml`, and the home page has no link-preview tags (only duel pages do).
- **The link-preview image is slow the first time.** It took 2.4 s to make the first time. It is cached for only 5 minutes. WhatsApp can give up on slow previews.
- **The cheating guard barely works on Vercel.** Each Vercel server keeps its own vote-rate counts in memory, so the limit is weak.
- **There is no report button or moderation.** For polls about politicians, this is the biggest risk (see "Safety and the law").
- **Phone walkthrough:**
  - After you press Vote, the exit-poll question starts below the bottom of the screen, so you have to scroll to find the next step.
  - "My votes" says your votes are kept "on this device only". If you lose the phone or clear the browser, they are gone.

### Top 10, in order

| # | Idea | Why | Impact | Effort |
|---|---|---|---|---|
| 1 | **Move the server to Mumbai (`bom1`) and the database to Singapore** (Neon has no India region) | Probably the biggest "feels faster" win for India. Move both together, or it gets slower. | High | S–M (needs your Vercel and Neon logins) |
| 2 | **Report button plus a hide switch for the owner** | India's IT Rules expect a way to complain and quick removal. 2026 changes cut some removal times to 2–3 hours (deepfakes). Polls about politicians attract abuse. | High | S |
| 3 | **Freeze political duels during the poll "silence" window** | Election law bans showing exit polls and opinion polls in set windows around real voting. Our guess step is called "exit poll". During a notified window, results of duels about parties or candidates in that state are hidden ("Results open after polling ends"). This matches a real election. | High | M |
| 4 | **Cache duel pages for a few seconds** and load "your vote" separately | A viral duel would not hit the database on every open; pages open faster. | High | M |
| 5 | **"Tell me when results are declared"** (a phone notification, asked only after voting) | A reason to come back without streaks. It works on Android, and on iPhone only after "Add to Home Screen". A "Remind me" calendar link works for everyone. | High | M |
| 6 | **Faster, longer-cached link-preview image** plus a preview card for the home page | The link card is what friends see first in WhatsApp. If it fails, fewer people click. | High | S |
| 7 | **A shared vote-rate limit** (Upstash Redis) **plus an invisible bot check** (Cloudflare Turnstile) on the vote | Stops bots and scripts from inflating votes. Jio and Airtel put many people behind one IP address, so limits must stay loose. | Med | S |
| 8 | **Hinglish** as a third language | Most Hindi speakers type Hindi in English letters online. It also works on share images, which cannot show Hindi letters. | High | S |
| 9 | **Election-calendar duels and a WhatsApp Channel "Aaj ka mukabla"** (today's duel) | The 2027 state elections (UP, Punjab, Uttarakhand, Goa, Manipur), IPL and big film releases bring ready-made interest. A Channel posts one duel a day to followers. | High | S (mostly content, not code) |
| 10 | **Search basics:** `robots.txt`, a sitemap, and topic pages ("UP 2027 duels", "IPL duels") | People find duels from Google. New duels made by users stay out of search until they are checked. | Med | S–M |

### Smaller polish (from the phone walkthrough)
- After the inked-finger moment, **scroll gently to the exit poll**, so the next step is always on screen.
- **Keep my votes**: a private link to save or send to yourself, so a new phone can get your record back. This also lets people delete their record, which the privacy law (below) will expect.
- **Counting ticker** while results are counted: "Round 2 of 3: Modi ahead by 412". This copies TV counting day.
- **Text-only result line** for WhatsApp, like Wordle: "🗳️ Modi or Rahul? · Exit poll ✅ · 🟩🟩🟧". It needs no image.

### Safety and the law (simple steps, not legal advice)
- **IT Rules 2021 (updated 2026):**
  - Name a grievance contact, reply to complaints within 24 h and resolve them within 15 days.
  - Some content (deepfakes, private images) must come down within 2–3 hours of notice.
  - **Steps:** add a report button and an admin "hide now" switch, and only allow licensed or credited photos.
- **Election law (Sections 126 and 126A, RP Act):** exit polls are banned during notified windows, and opinion polls in the last 48 h before voting ends. **Step:** idea #3 above. Keep saying "fun poll, not a survey".
- **Privacy law (DPDP Act; rules came in November 2025, full duties by May 2027):**
  - Add a short notice saying what we store (a voter cookie) and why.
  - Set how long we keep it.
  - Add a "delete my votes" button.
  - Never store raw IP addresses.
- **Word filter when a duel is created:** block slurs in English, Hindi and Hinglish, and hold duels that name politicians for a quick check.

### Not recommended
- Paid phone OTP "verified voters" for now: it costs money and brings more privacy duties.
- "See who voted" features like the NGL or Gas apps: they break the secret ballot.

### Could not check
- **Real speed scores:** the Google PageSpeed tool was out of quota. Run https://pagespeed.web.dev by hand on the live site.
- **WhatsApp's preview size limit (~300 KB):** comes from developer testing only.
- **Shares of each Indian language:** the numbers are from 2017.
- **2027 IPL dates.**
- **The exact 2026 exit-poll notice:** the government page refused the request.

### Round 2 sources
- [Vercel regions](https://vercel.com/docs/regions) and [Neon regions](https://neon.com/docs/introduction/regions)
- [IT Rules 2021 (PIB)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2021/jun/doc202162411.pdf) and [2026 amendments: 3-hour takedown, AI labels (Hogan Lovells)](https://www.hoganlovells.com/en/publications/india-introduces-mandatory-labelling-for-ai-and-3hour-takedown-for-illegal-content)
- [ECI bars exit polls, 48-hour silence period (DD News)](https://ddnews.gov.in/en/eci-bars-exit-polls-reiterates-48-hour-silence-period-ahead-of-assembly-elections/)
- [DPDP Rules 2025 timeline](https://www.glocertinternational.com/resources/guides/dpdp-rules-2025-compliance-timeline/)
- [Turnstile Ephemeral IDs (Cloudflare)](https://blog.cloudflare.com/turnstile-ephemeral-ids-for-fraud-detection/)
- [Safari 18.4: Declarative Web Push (WebKit)](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) and [web push opt-in benchmarks](https://lumapush.com/blog/web-push-notification-benchmarks-ctr-optin-rates-by-industry)
- [Most-followed WhatsApp Channels](https://whatsscale.com/blog/most-followed-whatsapp-channels)
- [OG image too large](https://www.opengraph.to/articles/og-image-too-large)
- [Hinglish (Wikipedia)](https://en.wikipedia.org/wiki/Hinglish) and [KPMG–Google Indian languages report (Slator)](https://slator.com/localization-is-shaping-the-future-of-digital-india-kpmg-report/)
- [Upcoming elections (BOOM)](https://elections.boomlive.in/elections/upcoming)
- [Core Web Vitals targets](https://unlighthouse.dev/learn-lighthouse/core-web-vitals)

## What we should not do

- Swipe-to-vote, carousels or hidden gestures: unfamiliar mental models and easy mis-votes.
- Points, levels, streaks or badges: against the election rule.
- Heavy 3D or video effects: slow on cheap phones and costly on prepaid data.
- Showing anyone's pick without their choice: privacy on shared phones.

## Sources

- [NN/g: Mobile user behavior in India](https://www.nngroup.com/articles/mobile-behavior-india/)
- [Prediction market UX patterns (Polymarket / Kalshi)](https://avark.agency/learn/prediction-market-design-patterns)
- [Instagram polls: engagement](https://influencermarketinghub.com/instagram-polls/)
- [X poll best practices](https://woobox.com/articles/twitter-x-poll-best-practices)
- [Wordle share grid (Josh Wardle)](https://x.com/powerlanguish/status/1471493886031773707)
- [Wordle on Wikipedia](https://en.wikipedia.org/wiki/Wordle)
- [Micro-interaction guidelines 2025 (Justinmind)](https://www.justinmind.com/web-design/micro-interactions)
- [Micro-interaction rules for apps](https://dev.to/devin-rosario/5-micro-interaction-design-rules-for-apps-in-2026-48nb)
- [Microinteractions and emotion (UXmatters)](https://www.uxmatters.com/mt/archives/2025/10/evoking-emotion-and-enhancing-engagement-with-microinteractions.php)
- [View Transitions and reduced motion](https://matthiasott.com/notes/view-transitions-the-smooth-parts)
- [Designing for Bharat](https://medium.com/design-bootcamp/designing-for-bharat-ux-tips-to-reach-indias-next-billion-users-01f6c14d472c)
- [Design principles for next billion users](https://medium.com/91-labs/design-principles-for-next-billion-users-6fd31c8ca9e5)
- [Counting-day trackers (BOOM)](https://elections.boomlive.in/elections)
- [What happens on counting day (Deccan Herald)](https://www.deccanherald.com/amp/story/elections%2Fdelhi%2Fdelhi-assembly-elections-2025-what-happens-on-counting-day-3355982)
