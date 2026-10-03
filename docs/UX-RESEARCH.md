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
