# Election: why every screen and element looks the way it does

The look comes from patricka (Good Bot, Bad Bot): its tokens, type scale and components.
This file is about **what each element is for** and **how much attention it gets**.
Rule: if an element has no clear job on that screen, it is removed.

## The opinions rule (owner, most important; replaces "the election rule")

**Election is a place to see what people think about anything.** Every poll keeps the parts of a fair vote that make it trustworthy and fun: ballot numbers, a secret ballot, one vote each, results only after you vote, the inked finger (our signature on every poll), "Guess the crowd", "leading / won", sharing that you voted.
**Election mode** adds the full booth ritual on top: the EVM beep, the VVPAT slip, the voter ID number, counting day (3 rounds) and "Result declared". It is always on for politics polls, and a creator can switch it on for any poll ("Election mode" chip on Create). Everything else gets a short ink moment and the result straight away.
The words "exit poll" are not used anywhere (legal risk; see docs/OPINIONS.md). Polls are "polls", not "duels".
Quiz and game parts from patricka are **not used**:
- no progress steppers or pips
- no score bubbles (✓ 1, 🎯 0)
- no points (+1)
- no levels, XP bars or trophies
- no streaks

If an element has no job in a fair, fun vote, remove it. No money, coins or prizes, ever (Online Gaming Act 2025).
We still use patricka's **look** (type, spacing, colours, cards, buttons), but not its game mechanics.

## Priority levels (used on every screen)

| Level | Meaning | How it looks (patricka parts) |
|---|---|---|
| **P1** | The one thing the person came to do on this screen. Only one per screen. | Biggest type (display 30/40), most space, the only dark/ink primary button |
| **P2** | What helps them do P1, or the next step after it | Section/card titles 20, white cards on sand, ghost buttons |
| **P3** | Nice to know. Never blocks or competes. | 13/12 text, muted ink, chips, small pills |

Colour roles (from patricka, never mixed):
- **Ink button** = the main action. One per view.
- **Lime** = "this is you" (active tab, the green bar of your pick). Not used for decoration.
- **Pastel tint** = which side/choice something belongs to (A, B, C...).
- **Soft red/green tints** = feedback only (error, success). Never as decoration.

---

## Flow 1: first visit (the most important flow)

Goal: **vote in one tap, within a second, with no reading.**
Why: most people arrive from a WhatsApp link with zero context. Every extra word or card before the vote loses people.

1. Land → see **the question** and **two big cards**. Nothing else above them.
2. Tap a card → vote is saved, confetti, the cards turn into the result.
3. Read the **verdict** ("You're with the crowd.") → press **Next duel** (P1 now) or **Dare a friend** (P2).
4. Optional: one-tap "why" and reactions (P3).

### Home, before voting

| Element | Level | Job / why |
|---|---|---|
| Small lime label "Fun duels · not official" | P3 | Sets expectations in 4 words (legal + tone). Small so it does not compete. |
| **The duel question** ("Modi or Rahul?") as the page title | **P1** | The question *is* the content. A generic title ("Who would you pick?") was biggest before and the real question was small: that was upside down. |
| Social proof line "69 votes · 5 in the last hour" | P3 | "Other people are doing this" makes the first tap feel safe. Small, under the title. |
| **Two candidate cards** (A / B), side by side | **P1** | The tap target. Side by side = a duel, the eye compares in one look. Large face circle + name: you recognise before you read. |
| **Candidate photo** (full card width, 4:5) | **P1** | People recognise a face before they read a name. Full width so it is the first thing seen. Licensed photos only, credit shown under the cards (`public/candidates/CREDITS.md`). No photo: a soft initials circle. |
| Role line on the card (label, caps 10px) | P3 | Context for people who do not know the person. Tiny so the name wins. |
| Name on the card (20px bold) | P2 | Second thing you read on the card, after the face. |
| "Tap a card to vote · anonymous · one vote each · results unlock after" | P3 | Answers the 3 fears (how? who sees? can I cheat?) without a paragraph. Sits right under the cards, where the thumb already is (patricka hides its own hint on phones; ours must stay). |
| ~~Progress pips + ✓ and 🔥 pills inside the game~~ | removed | Quiz parts; see the election rule. |
| "Duel of the day" dark banner | removed on Home | It repeated the duel that is already the first card on the page. Lives on the Duels page instead. |
| "More duels" tiles | P3 | The next thing to do after you finished. Below the fold on purpose. No "New" chips: a dark chip on the least important section pulled the eye away from the duel. |
| "Start your own duel" tile | P3, last tile | Creating is a later step than voting. It was first and competed with voting. |

### Home, right after voting

| Element | Level | Job / why |
|---|---|---|
| **Result on the cards**: big % (30px), meter, votes | **P1** | This is the reward for voting. Biggest number on screen. The cards stay in place, so you see *your* card change, not a new screen. |
| Your card tinted + "Your pick" | P2 | You find yourself instantly. Tint, not outline (patricka rule: light tints instead of outlines). |
| "Leading" on the top card | P3 | Answers "who is winning" without reading numbers. |
| **Verdict + Next** in the pinned bar (verdict on its own line, buttons under it) | **P1 action** | One clear next step at thumb height. The verdict is the emotional moment ("Bold pick."), Next keeps the loop going. |
| "Dare a friend" (one ghost button, next to Next) | P2 | Growth comes from sharing, but it must not beat "Next" for attention. One button; the phone share sheet already offers WhatsApp, copy, etc. |
| Voter number "You're voter #65" | P3 | A small personal touch inside the verdict line. Not a lime pill: lime is for "your progress", and it pulled the eye away from the result. |
| "Why Modi?" chips | P3 | Optional, one tap, feeds the "why people pick them" data. Collapsed under the result, never above it. |
| Emoji reactions | P3 | A feeling without typing. Same row style as the why chips so they read as one optional group. |

## Flow 2: shared link (`/p/...`)

Same as Home, but the friend's duel is first. The page opens with a small label "Someone wants your pick" (P3) because the person came because a friend asked, and that is the strongest reason to vote. No other content above the cards.

## Flow 3: create a duel (`/create`)

Promise: **30 seconds**. So:

| Element | Level | Job / why |
|---|---|---|
| Question field | P1 | The only thing you must write first. |
| Choices (2 fields + "Add a choice") | P1 | The other must-have. |
| **Create duel** (ink button) | P1 action | One primary button. |
| Details, category, end time, two switches | P3, folded under "More options" | Useful but optional. Showing them all made a 30-second job look like a form to fill. |

### Create: easier start (owner: "create flow and UI need to be better, intuitive and engaging")

| Element | Level | Job / why |
|---|---|---|
| "Need an idea? Tap one" chips (only while the form is empty; swipe sideways on phones) | P3 | A blank page is the hardest part. One tap fills a question and its choices; you can edit everything. Yes / No is one of them. Replaced the "3 choices / 4 choices" chips. |
| "Use these as the choices: Virat · Rohit · Dhoni" (under the question, only while no choice is typed) | P2 | Most questions already name the choices ("Virat, Rohit or Dhoni?", "Chai ya coffee?"). One tap instead of typing them twice. |
| Choice boxes that grow by themselves (like a WhatsApp poll) | P1 | Typing in the last box adds the next one, up to 10. The "Add a choice" button is gone; the empty last box has no ×. |
| Emoji picked for you (🫖 Chai, ☕ Coffee, 🍕 Pizza…), slightly lighter until you change it | P3 | The ballot looks finished without extra work. Tap the box to pick your own; clear it for none. |
| The main button says what is missing: "Write your question" → "Add 1 more choice" → "Create duel" | P1 action | You always know the next step; it is still the one ink button. |
| "20 left" under the question near the 120-letter limit | P3 | No surprise cut-off. |

## Flow 4: coming back (`/me` = My votes)

| Element | Level | Job / why |
|---|---|---|
| "My votes" tab (Vote icon, was "Me") | Nav | Names what the page holds: your voting record. |
| One plain sentence: "You voted in 3 duels. Your exit poll was right 2 of 3 times. 1 friend voted from your link." | P2 | Your record in election words. No level, no XP bar, no stat boxes. |
| Your votes list | P1 on My votes | Memory and a way back into old duels. |

## Duels page (`/duels`)

| Element | Level | Job / why |
|---|---|---|
| Duel of the day (dark banner) | P1, then P3 | The one duel we want everyone in. Dark = the strongest card on the page. After you voted in it, it moves below the list: the duels you have not done matter more. |
| Duel tiles | P2 | Browse more. Pastel tiles from patricka; voted ones say "You voted" so you skip them. |

---

## Journey map: every path, every edge case

Each row was walked in a real browser (phone size) before shipping. "Smooth" means: no dead end,
no surprise, always one obvious next step, and mistakes can be undone.

### J1. First visit from Home
| Step | What happens | Why |
|---|---|---|
| Open Home | The first live duel you have not voted in. Question = page title, two cards, a one-line hint. | Vote in one tap, no reading. |
| Tap a card (or press A / B / 1 / 2) | Saved, confetti, the cards become the result. | Instant reward. Keyboard works like patricka's games. |
| Tapped the wrong card | **Undo** link in the result bar for about 25 seconds (server allows 30). Removes the vote and its reactions. | A big tap target makes slips likely; forgiving beats asking "are you sure?" every time. |
| Press **Next** | Next live duel you have not voted in, **wrapping around** the list. The page scrolls so the new question is at the top. | Before, the page stayed scrolled down and the new question was off-screen. |
| No duels left | "You voted in every live duel" screen with "Start your own duel" and "See the results". | A clear end, not a silent stop. No fake "2/3" score. |
| Scroll down | "More duels" tiles: live and not voted first, then voted, then ended. Updates the moment you vote ("You voted · 41 votes"). | Before, tiles stayed stale until reload and ended duels were listed first. |

### J2. Opening a shared link `/p/…`
| Case | What happens | Why |
|---|---|---|
| Friend sent it, not voted | Label "Someone wants your pick", that duel first. | The friend is the reason you came. |
| You already voted | Label "You already voted here", your result shows. | No confusing second vote attempt. |
| The duel has ended | Label "This duel has ended", the final result, "X won." or "It ended in a tie." Button "Share result". | Before, an ended link silently opened a *different* duel. |
| Bad link | "Duel not found" + "Go to today's duel". | Never a dead end. |

### J3. Creating a duel
| Step | What happens | Why |
|---|---|---|
| Open Create | Question + 2 choices + one button. Extras under "More options". | The 30-second promise. |
| Mistake (too short, empty, same choice twice) | Plain-English message **under that field**, focus moves there; nothing is sent. | Before: "Title is too short" at the bottom of the form. |
| Press Create duel | You land on your duel with **"Your duel is live. Send it to friends."** and a **Share the duel** button first; you can vote below. | Before, the creator saw "Someone wants your pick", as if a stranger sent it, and no share prompt. Sharing is the creator's job at this moment. |

### J4. Coming back another day
| Step | What happens | Why |
|---|---|---|
| Open Home | Starts at the first duel you have not voted in. If none: "You voted in every live duel". | Never shows you something you already did as if it were new. |
| Top bar | Only the logo (and on computers the links). No scores. | See the election rule. |

### Ties and empty states (everywhere)
- Tie: no card says "Leading"; ended tie says "It ended in a tie."
- 0 votes: "be the first" instead of a cold "0 votes".
- Same number twice ("41 votes · 41 in the last hour"): the second part is hidden.

---

## Batch 1: guess the crowd, friends vs everyone, share image (no streaks)

**No streaks.** The owner decided streaks are not worth it here. Research agrees they can backfire (anxiety, people drop out after one missed day). Removed: Today card, 🔥 pill, streak stats. What you collect instead: right guesses and friends who answered your dares.

| Element | Level | Job / why |
|---|---|---|
| **"Who's winning right now?"** step after you vote (hidden-results duels) | **P1 at that moment** | A second, instant game inside every duel: you guess the crowd, then the reveal tells you if you were right. Makes the reveal a moment, not just numbers. Checked on the server at the moment you answer (a tie counts for either leader). "Skip, just show me" is always there, so it never blocks. |
| "Your exit poll was right!" / "Your exit poll was wrong. X is ahead." (was "+1") | P1 in the result bar | The win (or the near miss) is the first line you read after the reveal. Confetti only for a right guess. |
| ~~🎯 pill~~ | removed | A score; see the election rule. Your exit poll record is one sentence on My votes. |
| "A friend dared you" label + "A friend already picked. Vote to see if you agree." | P2 | You came because a friend asked: that is the strongest reason to vote. Their pick stays a surprise until you vote and guess. |
| "Your friend picked Modi: you agree / disagree!" | P2 | Agreeing or disagreeing with a friend is what people talk about and share back. |
| "N friends answered your dare: X agree, Y disagree" | P2 (for the sharer) | The reason to come back to your own duel after sharing. Counted through a private share code in your link (never your identity). |
| Share link `/p/…?f=code` | — | Carries your private code so friends are counted for you and the preview shows your pick. |
| Share image (WhatsApp/X preview) | — | Both photos, your pick marked, "I picked Modi. Who would you pick?". Never the split, so friends still have to vote. |
| New duels hide results until people vote (default on) | — | So every duel gets the guess step. The creator can turn it off under More options. |

---

## Batch 2: it should feel like a real election (human behaviour first)

It is not an official election, but the *ritual* of one is what people know, trust and share in India.
Every element below borrows a real voting moment.

### What triggers people (and where we use it)
| Trigger | Why it works | In the app |
|---|---|---|
| **Ritual / taking part** | Voting is a proud, shared ritual; people want proof they did it | EVM-style **Vote** button with a red light and a long **beep**, the **VVPAT slip** (your choice behind glass for ~2.5 s, then it drops), "Vote cast. Your finger is inked · Voter ID EL-000041" |
| **Curiosity gap** | "Guess who I voted for?" makes people click more than an answer does | Share is a **secret ballot by default**; the preview and story say "Guess who I picked?" |
| **Tribe / identity** | Which side you are on, and is your friend on it? | "Your friend voted. Your turn", then "Your friend picked X: you agree / disagree" |
| **Being right** | Small, instant wins | **Exit poll**: "Who's winning right now?" before the results open; 🎯 score |
| **Reciprocity** | A dare asks for an answer | The friend lands on the dare, votes in one tap, then gets their own "Show your ink" |
| **Urgency** | Polls close; results are declared | "Polling open · closes in 2 d 4 h" when a duel has an end time; "Polling closed · X won" |

### Sharing: less drop-off at every step
1. **When**: right after the result (the emotional peak), from "Show your ink" in the result bar.
2. **Where people actually share in India**: WhatsApp chats first (one tap, message already written), WhatsApp Status / Instagram Story second.
3. **What the message says** (short, ends with the link):
   - secret: “I just voted in “Modi or Rahul?” 🗳️☝️ Guess who I picked? Vote and find out: link”
   - open: “I voted for Modi in “Modi or Rahul?” 🗳️☝️ Who would you pick? link”
4. **Link preview** (WhatsApp/X, 1200×630): inked finger, "I VOTED", both photos, my pick or "Guess who I picked?". **No QR**: the link is already tappable in a chat.
5. **Story image** (1080×1920, for Status/Instagram where links cannot be tapped): big inked finger, "I voted", both photos, pick or "Guess who I picked?", and a **small QR code in the bottom corner** with "Scan to vote". Small, so it never competes with the message.
6. **The friend's landing**: label "Your friend voted. Your turn", the ballot right away, no sign-up, one tap. Their friend's pick stays hidden until they vote (that is the hook).
7. **Never the split** on any shared image: friends have to vote to see it.

| Element | Level | Job / why |
|---|---|---|
| EVM row on each card (red light + blue **Vote**) | P1 | Everyone in India knows this button. It tells you *how* to vote without words. |
| Beep + VVPAT slip after voting | P1 at that moment | The trust moment of a real booth: you see your choice recorded. 2.6 s, then it moves on by itself. |
| "Vote cast. Your finger is inked · Voter ID" | P2 | The proof you took part; the voter ID makes it feel personal. |
| Exit poll (the guess) | P1 at that moment | See Batch 1; the election name makes it feel natural. |
| **Show your ink** (share sheet) | P2 | WhatsApp first, secret switch (on), Status/Story image, copy link. |

## Element audit (every element: job, place, copy, icon, colour)

Each element was checked against these questions:
- Why is it there?
- Is it in the right place?
- Is there a better way to do the same job?
- Is the copy, icon and colour right?

Verdicts: **Keep**, **Changed** or **Removed**.

### Top bar
| Element | Job | Verdict |
|---|---|---|
| Logo "Election" | Brand, link to Home | Keep |
| 🎯 right-guesses pill and ✓ votes pill (lime = your progress) | Your score, at a glance, on every page | **Changed:** hidden until your first vote. "0 · 0" read like a failed quiz to a new visitor, and the shared-link visitor is always new. |
| "‹ Home" back link | Way out of a shared link that came from outside the app | Keep on `/p/`. **Removed** on Create: Create is a tab, so there is nothing to go back to. |

### Home and the duel
| Element | Job | Verdict |
|---|---|---|
| Label "Fun duels · not official results" (lime, above the question) | Disclaimer | **Removed** from here. It was the loudest thing above the P1, and lime means "you". The disclaimer now ends the ballot line, so it is still read before voting. |
| Question (display type) | P1 headline | Keep |
| "Polling open · N votes cast · closes in…" | Election feel, social proof, urgency | Keep |
| Progress pips | Where you are in the deck | Keep (P3, only after a vote, only with 2+ duels) |
| ✓ and 🎯 counters inside the game | (same numbers as the top bar) | **Removed:** shown twice. |
| Ballot number on each card | Real ballots number candidates, and the VVPAT slip shows the number | **Changed:** A/B to **1/2**, so the card and the slip match. Keys A/B and 1/2 both still work. |
| Photo (4:5) | You recognise faces before names | Keep. **Changed:** capped at 320 px on desktop, where it pushed the Vote buttons below the fold. |
| Party line ("BJP", "INC") | Which side each person is on, the way a ballot shows the party | **Changed (owner):** party only, no job titles. Fits on one line, so both names line up. |
| Red light + blue **Vote** (EVM) | Everyone in India knows this button | Keep. It is blue, not ink, because it copies the real EVM. The whole card is the button. |
| Ballot line under the cards | The rules in one line | **Changed:** "Press a candidate to vote" removed (the Vote button already says it, and "candidate" is wrong for tea vs coffee). It now reads "Secret ballot · one vote each · results open after you vote · a fun poll, not official". |
| Photo credits | Licence requirement | Keep (P3, smallest text) |
| VVPAT slip, inked finger, voter ID | Trust and pride moment | Keep |
| Exit poll subtitle | Explains the reward | **Changed:** "Guess right to score ◎ Then…" became "Guess right for +1 on your score. Then the results open." There is no icon in the middle of the sentence now. |
| Guess result line (green right / red wrong) | Instant win or loss | Keep. Green and red mean right and wrong only. |
| Verdict "You're with the crowd." | Where you stand | **Changed:** no longer green. It is information, not a win, and two greens made both weaker. |
| "Undo" | Fix a mis-tap (30 s) | **Changed:** now "Undo my vote", small and muted, so it says what it undoes. |
| Show your ink / Next (ink) | Share at the emotional peak / the one main step | Keep |
| Why chips and React chips | Optional, after the bar | Keep (P3) |
| More duels tiles | Choose a duel yourself | Keep. **Changed:** the tile icon is now the topic (Landmark politics, Trophy cricket, Film, Music, Utensils, Cpu, Medal sports, Users friends, Swords general). Every tile used to show the same people icon, which said nothing. |

### Shared link (`/p/…`)
| Element | Job | Verdict |
|---|---|---|
| Label | Why you are here | **Changed:** "Your friend voted. Your turn" became **"A friend dared you"**. The line in the game holds the hook: "Your friend's pick is sealed. Vote to see if you agree." Before, both lines said the same thing. |
| Label after creating | (repeated the panel heading) | **Removed:** the panel "Your duel is live. Send it to friends." already says it. |

### Share sheet
| Element | Job | Verdict |
|---|---|---|
| Story image preview | What friends will see | Keep |
| **Your message** (new) | The exact WhatsApp text before you send it, so there are no surprises | Added. It uses the space where a hint repeated the switch's subtitle. |
| Keep my vote secret (full width) | Curiosity, on by default | **Changed:** now full width (the title had wrapped onto two lines), and one clear subtitle per state. |
| Send on WhatsApp (ink) / Story image / Copy link | Main way to share / Status and Instagram / anywhere else | Keep |

### Duels, Me, Create
| Element | Job | Verdict |
|---|---|---|
| Duels: "All duels" heading | Separates the tiles from the banner | **Changed:** only shown when the banner is above. Without the banner it just repeated the page title. |
| Duels banner icon | The flagship duel | **Changed:** Swords became Landmark (politics). |
| Me: 4 stat boxes | Your record | **Changed:** now 2 boxes. "Duels voted" repeated the header's ✓ votes, and "crowd reading %" repeated the right guesses. Now: "1 of 1 exit polls right" and "friends took your dare". |
| Create: categories | Sort and decorate the tiles | **Changed:** added **Politics**, because the flagship duel is politics and creators had no way to pick it. |

### Follow-up: the election rule (owner: "what do these mean for an election?")
| Element | Verdict |
|---|---|
| 4-line stepper (progress pips) | **Removed.** Elections have no "duel 2 of 4". |
| ✓ 1 and 🎯 0 bubbles (top bar and game) | **Removed.** Unlabelled numbers. Your record is on My votes, in words. |
| Levels (Newcomer → Legend), XP bar, stat boxes | **Removed.** Voters have no levels. My votes is now a plain record. |
| "+1" and score wording in the exit poll | **Changed:** "Make your call, like the TV exit polls", then "Your exit poll was right / wrong". |
| "All caught up!" with a trophy and "Right guesses" | **Changed:** inked finger + "You voted in every live duel". |
| "Me" tab | **Renamed** "My votes" (Vote icon). On computers there is now a "My votes" link in the top bar. |

## Batches 3–5 (from docs/UX-RESEARCH.md)

### Batch 3: counting day
| Element | Level | Job / why |
|---|---|---|
| **Counting in 3 rounds** when your results open: "● Counting votes · round 2 of 3", bars and numbers move, "Leading" can swing | P1 at that moment | Counting day on TV is the drama of an election. The rounds are **real**: votes in the order they were cast, split in 3 (so a lead can truly change). About 2 s. Skipped for "reduce motion". |
| Majority mark (tick at 50% on every bar) + "Line on each bar = majority (50%)" | P2 | Every counting-day tally shows the majority mark. You can see "clearly ahead" without reading numbers. |
| Swing in 24 h + race line | P3 | "Narendra Modi ▲ 11 pts". Election word, real data (needs at least 5 votes older than 24 h). The line follows the same person. Two-choice duels only. |
| ● LIVE dot in "Polling open", vote count rolls up | P3 | Like the LIVE bug on TV. New votes are visible as they arrive (refresh every 8 s). |
| **Result declared: X wins by N votes**, card caption "Won", one confetti the first time | P1 on an ended duel | The declared moment. The margin in votes is what news reports say. |

### Batch 4: feels like an app
| Element | Job / why |
|---|---|
| Beep on/off (speaker icon, top bar) | People vote in public. Remembered on the phone. |
| Next duel slides in (View Transitions) | A fresh ballot, not a jump. Off for reduce motion and on browsers without it. |
| Offline bar + vote retry | "No internet. Your votes will send when you are back online." A vote made offline is sent by itself when the internet returns. |
| Loading outline | Grey shapes of the ballot instead of a blank page. |
| Add to home screen | App name, colours and icon (the logo: ink disc, lime dot). Opens full screen. |
| Lighter | Candidate photos as 400×500 WebP (18 KB and 10 KB, were 35 KB and 22 KB). The Create page no longer ships the form-rules library (131 KB → 107 KB). |
| Accessibility | Reduce motion stops all motion (counting, slide, slip, live dot). Bigger tap areas on small text links. |
| **Server near India (not done, needs the owner)** | The live server runs in Washington, USA (`iad1`). Move the Vercel functions to Mumbai (`bom1`) **together with** the database (a Neon project in Singapore or Mumbai). Moving only one makes it slower. |

### Batch 5: speaks Bharat
| Element | Job / why |
|---|---|
| **हिं / EN** button (top bar) | Switches all interface text to Hindi or back. Remembered on the phone. Phones set to Hindi start in Hindi. Shown in the other language's own script so people find it. |
| All text lives in `src/lib/i18n.ts` | One place, English and Hindi side by side. People's own text (questions, names) is never translated. Reasons and categories have Hindi labels. Server messages are shown in Hindi too. |
| Hindi font | Noto Sans Devanagari, bundled, downloaded only when Hindi is on screen. |
| WhatsApp line (Wordle lesson) | "🗳️ “Modi or Rahul?” · I voted ☝️ · Exit poll ✅ · Guess who I picked?…". Short, spoiler-free, readable in any chat. In Hindi when Hindi is on, and so is the link title. |
| Share **images** stay English | The image maker cannot join Hindi letters (मैंने वोट किया came out broken), so images are English only. Revisit if the image maker gains Hindi support. |

### The ink moment (owner: "ink on fingers should look premium, like real, with animation")
| Element | Level | Job / why |
|---|---|---|
| Inked finger, redrawn | P2 | Looks like a real hand: shaded skin, a nail with a shine, folded fingers, a thumb in front, and the deep purple indelible-ink line from the top of the nail down onto the skin (where the polling officer draws it). One drawing for the app, the story card and the link preview. |
| Ink animation, right after the VVPAT slip | P2 at that moment | The hand rises (0.5 s), the ink is brushed down the nail (0.7 s), then it soaks in and shines. Then "Vote cast. Your finger is inked." and "Voter ID EL-000035" fade in. Only for a vote made just now; off for reduce motion. |
| Share panel | P2 | The story card is bigger, tilted like a printed slip, and floats in when it has loaded (grey placeholder before). Your message is shown as a chat bubble. |

### Real ink photo (owner: "should look real, currently cartoonish")
- The drawn finger is replaced by a **real photo** of an inked finger: Wikimedia Commons, GaneshBhakt, CC BY-SA 3.0, cropped (`public/ink/`, credits in `public/ink/CREDITS.md`). The credit shows in the app's photo line after you vote, and in small text on the story card and link preview (the licence asks for it).
- **Animation:** the photo tile rises in, then the **real ink is wiped on from the nail downward** over the same finger with the ink digitally removed (`finger-clean`, used only during the 0.9 s wipe), then a wet shine passes over it. Reduce motion: the final photo at once.
- Share images use the untouched photo.

## Round 2: safety, silence, Hinglish, search (from UX-RESEARCH.md "Round 2")

| Element | Level | Job / why |
|---|---|---|
| **Report this duel** (flag, small text link, last thing on the duel) | P3 | India's IT Rules expect a way to complain, and polls about politicians attract abuse. Last and quiet, so it never competes with voting. One tap opens 5 reasons as chips; one more sends it. |
| Auto-hide after 3 reports | — | An unchecked user duel with 3 reports from different people is hidden at once, until the owner looks (the law asks for removal within hours). Reviewed duels, like the flagship, are never auto-hidden, so people cannot report them away. |
| Owner's review page `/admin?key=…` | — | Reported duels first, then unchecked ones. Three buttons: Hide (ink, the main action), Show again, Approve. Off until `ADMIN_SECRET` is set; anyone else sees "not found". |
| Word filter on Create | — | Slurs and strong abuse (English, Hindi, Hinglish) are refused with "Please remove the abusive words." under the form. Short list, whole words only, so normal words never trip it. |
| Politics hold | — | A user duel that names a politician or party becomes a politics duel and stays off Home, Duels and topic lists until approved. Its link still works, so the creator can share it. |
| **Results sealed** line (lock icon, under the cards) | P2 | Election law bans exit polls and opinion-poll results in the "silence" window around real voting. During a window, politics duels show no numbers and no exit poll, to anyone. Voting stays open, and the voter count (turnout) still shows. Plain ink, not red: it is information, not an error. The pinned bar keeps Show your ink and Next. |
| Counting ticker: "round 2 of 3: Modi ahead by 412" | P1 at that moment | The TV counting-day line. Says who leads in the round being counted, or "level". |
| Scroll to the exit poll | — | After the ink moment, the exit poll question was below the screen. It now scrolls into view by itself (no motion for reduce-motion). |
| "Add result day to my calendar" (text link, after voting, only when the duel has an end time) | P3 | A reason to come back when the result is declared, with no sign-up and no notification permission. |
| Language menu (top bar: English / हिंदी / Hinglish) | Nav | Three languages, so the button became a small menu (the phone's own picker). Each name is shown in its own script. Hinglish also shows on share images (Latin letters). |
| Topics chips (bottom of Duels) and topic pages `/topic/cricket` | P3 | Browse by interest, and pages people can find from Google ("cricket duels"). Topic page: the duel of the day if it is in that topic (P1), then the tiles (P2). |
| Long duels on tiles: "A vs B vs C +7" | P3 | IPL's 10 teams made a tall tile. |
| My votes: **Keep your votes** (private link) and **Delete my votes** | P3 | A record kept only on one phone is lost with the phone. The private link brings it back; deleting is a privacy right. Copy is a ghost button, delete is a quiet text link with a confirm. |
| Privacy and reports page `/privacy` (linked from My votes and Create) | P3 | What we keep, for how long, who sees your vote, and how to complain. The complaints contact comes from `NEXT_PUBLIC_GRIEVANCE_EMAIL`. |
| Starter duels: Virat, Rohit or Dhoni? · Who wins IPL 2027? · UP 2027: who wins? · Chai or coffee? | — | Duels tied to what India talks about next, so Home never shows only one duel. |

## Round 3: easier to use (owner: "make it more intuitive")

| Element | Level | Job / why |
|---|---|---|
| **Ballot rows** for 3+ choices (number, face, name, blue Vote button in one row) | P1 | The 10-team IPL duel took 4 screens of big cards, and after voting the slip and exit poll were far below, so nothing seemed to happen. A row per choice is exactly the real EVM ballot unit. Results show on the same row (%, bar with majority mark, votes). Two-choice duels keep the big photo cards. |
| VVPAT slip scrolls into view | — | On a long ballot the slip appears below the list; it now comes onto the screen, so every vote visibly lands. |
| Tap the slip to move on; shorter slip after your first vote of a visit (2.6 s, then 1.2 s) | — | A ritual the first time, not a wait the fifth time. The beep and slip still happen on every vote. |
| Circle letters never repeat ("Ch" / "Co" for Chai and Coffee, else the ballot number) | P2 | Two "C" circles said nothing. Same rule on the share images. |
| Creator's **emoji** per choice (in the circle) | P2 | A face for choices without photos (🍗 Hyderabad). Photo upload needs file storage; not built. |
| Label "Someone wants your pick" only when you arrived from outside the site | P3 | Opening a duel from the Duels list is your own choice; the label was wrong there. |
| Vote button raised (shadow under it, presses down) | P1 | Flat pale blue read as switched off. Same blue, now looks like the EVM key. |
| **Why people picked X**: top 3 reasons with % per choice, after the result | P3 | The reasons were collected but never shown. Seeing them is the reward for answering. |
| My votes: where each duel stands ("Modi leading · 62%", "Result declared: Modi won", "Make your exit poll call to see the results", "Results sealed") | P2 | A reason to come back. Same visibility rules as the duel: no numbers before your exit poll call or during a silence window. |
| "Share your ink" (was "Show your ink") | P2 | Says what the button does; the sheet keeps the "Show your ink" title. |
| Create: **Quick start** chips (Yes or no · 3 choices · 4 choices) | P3 | The shape of common duels in one tap. Yes or no fills 👍/👎. |
| Create: emoji box next to each choice | P3 | Optional; a faded 🙂 hint so it never looks filled in. |
| Create: **Your ballot · preview** (rows, live as you type) | P3 | You see what voters will see before you share. Below the form, above the one ink button. |
| Duels: **Most watched now** (up to 3 duels with the most votes in the last hour) | P2 | Like TV's "hot seats": where the action is. Not repeated in "All duels". Hidden when nothing got votes in the last hour. |

## The cast-vote moment (owner: "make the cast vote animation better")

Before: three small pieces stacked down the page (a red light on the card, a slip sliding in a beige box, a 56 px finger photo). On long ballots they were far apart, and the ink was tiny.
Now: **one scene in the middle of the screen**, the real booth in order. P1 at that moment; everything else waits under a dim layer.

| Beat | What you see and hear | Why |
|---|---|---|
| 1. EVM (from 0 s) | Your row on the ballot unit: number, name, the blue key goes down, the red light glows while the beep sounds | The press and the light are what people remember from the booth |
| 2. VVPAT (0.5 s) | A dark machine; the glass window lights up; your slip (number, name, party) prints down in small steps, stays, then is cut and drops into the box; the slot flashes lime as it lands with a soft thud | The trust moment: you see your choice recorded, then sealed |
| 3. Ink (2.75 s) | A big **drawn hand** (flat style, from the owner's reference picture) (210 px wide, was a 56 px photo) rises, raised index finger, nail towards you; the polling officer's glass rod draws the ink line down from the base of the nail; "Vote cast. Your finger is inked." and the voter ID counts up | The proof everyone shares. The line is drawn on as the rod moves (one path in the drawing), not revealed from a photo |
| End (5 s) | The scene closes; your result, confetti and the exit poll follow | Results and counting wait for the scene, so nothing important plays hidden behind it |

- **Tap anywhere** (or Enter / Escape) to move on. "Tap to skip" is written at the bottom.
- **Shorter after your first vote of a visit**: about 3.3 s (the slip prints at once, the ink comes sooner).
- **Reduce motion**: no scene; the beep, your pick and the small ink record show at once.
- **No photos** (owner: "I don't like those fingers… create one, don't use photos"). The hand is our own drawing (`src/lib/inkHand.ts`): soft shading, no thick outlines, so it is not cartoonish; a kurta-blue sleeve. One drawing for the vote moment, the small ink record, "You voted in every live duel" and both share images. No photo credit needed any more. The finger photos and `public/ink/` are removed.
- The small ink record (56 px photo, voter ID) stays on the page after the scene, as before.

## Mobile (owner: "make the mobile behaviour better and mobile friendly")

Checked on 320×568 (small iPhone), 360×640 (common Android), 390×844, and a phone held sideways (740×360). Every rule below fixes something found there.

| Change | Why |
|---|---|
| Bottom bar: 4 equal tabs | It was laid out for 5, so a gap sat on the right. |
| Share panel and vote moment open on top of everything (portal to the page root) | The bottom bar was drawn over them: the Story image and Copy link buttons could not be tapped on small phones. |
| Panels never taller than the screen; they scroll inside | The share panel's top (close button) and bottom were cut off at 320×568. |
| The page behind stays still while a panel or the vote moment is open | Scrolling underneath felt broken. |
| Phone Back button closes the share panel (stays on the duel) | Back used to leave the duel. |
| Vote moment shrinks on short screens (and sideways) | The VVPAT machine was cut off at 360px tall. |
| Text boxes and the language menu use 16px text on touch screens | Smaller text makes iPhones zoom the whole page when you tap a box. |
| Tap targets at least 40–44px (top-bar buttons, chips, text links, logo, back) | Several were 20–30px: easy to miss with a thumb. |
| Language button shows a short code (EN · हिं · Hing); the phone's menu still lists the full names | The wide "English" pill pushed the app name off small phones. The name now shows at 320px too. |
| Ballot rows on phones under 400px: smaller circle, name 15px, no red light in the row | Long names ran into the light; the light still shows in the vote moment. |
| Create: Enter moves to the next box (keyboard says Next / Go); capitalisation suited to questions and names | Enter used to send a half-filled form and show errors. |
| Create: the bottom bar steps aside while you type | It floated above the keyboard and covered the boxes. |
| No grey tap flash, no text-selection bubble on long-press of cards and buttons, no double-tap zoom wait | Taps feel like an app, not a web page. |
| Safe areas: notch, rounded corners and home bar respected, also sideways (`viewport-fit=cover`) | Content could sit under the notch. |

## Delight (owner: "more intuitive, more engaging… design first, delightful interaction")

Small touches, each tied to a real election moment; nothing from games (no points, streaks, levels). All motion stops with "Reduce motion"; all sounds follow the sound switch.

| Element | Screen | Priority | Job |
|---|---|---|---|
| Key click + short buzz the instant you press Vote | Duel | P1 (part of the Vote key) | The press feels real before the server answers; the EVM beep follows. |
| Printer ticks while the VVPAT slip prints; a buzz when it drops; a double buzz on the ink | Vote moment | P2 | The scene is felt, not only seen (buzz only on phones that support it). |
| Numbers count up to the new value (percent and votes) | Duel results | P2 | You see the change happen, like a counting-day board. |
| Exit poll: one card per choice with its face, letters or emoji (5+ choices: one row each) | Duel, after voting | P1 at that moment | You recognise a face before you read a name; big thumb targets. |
| "· 3 new votes just now" (green, goes away after 5 s) | Duel, polling line | P3 | The poll feels alive; a reason to stay. |
| "Up next: <question>" above Share / Next | Duel result bar | P3 | You know what Next brings, so pressing it is an easy yes. |
| Idle nudge: after 5 s with no touch or scroll, the blue Vote keys rise gently 3 times | Duel, before voting | P3 | Shows first-time visitors what to press; stops at the first touch. |
| Small bar under each duel: the leader's share; lime when your pick leads | My votes | P2 | "Where does my pick stand?" at a glance; lime = you. |

## Edge cases (owner: "find all the edge cases and fix all of them")

Found by testing every screen and API with odd inputs. Rules that came out of it:

| Case | Rule now |
|---|---|
| Vote → exit poll "skip" → see numbers → undo → vote for the leader | Undo only before the exit poll. After it you have seen the numbers. |
| "Guess" on a duel whose numbers are already open (or closed) | Not counted: the exit poll is only asked while the numbers are hidden. |
| How your friends voted, before your results open | Hidden too (in a 2-way duel it tells who leads). |
| Secret-ballot link with "&s=1" removed by hand | Still secret: an open link carries a signed proof (`o=`); without it the image never shows the pick. |
| One person reporting three times after clearing cookies | Counts once (reports are counted per network). "Show again" by the owner also marks the duel reviewed. |
| Zero-width spaces, soft hyphens, "_", digits for letters (ch_utiya, chut1ya, chutiyaaa) | Seen through by the word filter and the politics hold; invisible characters are removed from saved text; line breaks become spaces. |
| Real names refused as abuse (Niki Lauda, Lund University, Katwa) | Those words are no longer blocked; reports and review catch abuse with them. |
| A duel saved without choices after an error | Duel and choices are saved together or not at all. |
| Odd characters in an address (NUL byte, spaces) | "Not found", never a server error. |
| Emoji or Hindi letters cut in half on share images | Text is shortened by what you see, at a space when possible, with "…". Choice circles use the creator's emoji and the same letters as the ballot. |
| X / LinkedIn previews without an image | robots.txt now allows the two share-image addresses. |
| Cancelling the phone's share menu | Closes quietly (it used to pop up "Copy this link"). |
| "Status / Story image" on iPhone | The image is made when the panel opens, so the tap opens the share menu at once; a failure says so. |
| "Thanks" shown for a report that never arrived | Thanks only after it arrives; otherwise the reason and a retry. |
| Create: Enter in the emoji or details box sent the form; "3 choices" deleted typed choices; Yes/No overwrote them; end time in the past only caught after sending | Enter moves on; chips never remove typed choices (Yes/No shows only while empty); the end time is checked at once, under its box. |
| A "keep my votes" link opened on a phone that has its own votes | Asks first ("Use the votes from the link" / "Keep my votes"). |
| "Today" in My votes | Counted in India time. |
| Long single words (names, "aaaa…") made Home, Duels and the ballot wider than the phone | Grid columns can shrink and long words break; tested at 320 px before and after voting. |
| Two taps while offline counted twice when the phone came back | One waiting vote at most; the keys stay pressed until it is sent. |
| An older refresh arriving after your vote brought the Vote buttons back and froze the screen | Refreshes that started before a vote, guess, undo or reaction are thrown away. |
| A reaction tapped during the count left the bar stuck on "round 1 of 3" with no Next | The count always finishes. |
| Tiles said +2 after vote + guess, and "You voted" stayed after undo | Tiles and the banner count +1 on vote, −1 on undo. |
| Exit poll asked when yours is the only vote ("Your exit poll was right!" with 1 vote) | Not asked until someone else has voted; that first voter can still undo. "First vote!" now says "You cast the first vote here" (not "You started this duel"). |
| "Rahul" and "rahul." accepted as two choices | The same choice (letters and numbers compared). |
| Keyboard / screen reader: focus lost after the vote moment, undo, or opening Share | Focus goes to the exit poll question or Next, back to the ballot after undo, and into the share panel (and back out). The vote moment is announced once, not 40 times. |
| Sounds silent after an app switch on iPhone | Sound wakes up again on the next tap. |
| Hindi typed into a duel drawn broken on share images | The image renderer cannot join Hindi letters, so such text is left out of images (the ballot numbers show instead). |

## Temporary: "Reset this phone" (removed for the public launch, Oct 2026; see "Public launch")

### Create: pictures (owner: "add images option… suggest emojis… add image from device… intuitive and beautiful")

| Element | Level | Job / why |
|---|---|---|
| The circle in front of each choice (dashed "add picture" icon when empty; the emoji or photo when set) | P2 | One obvious place for a choice's picture. Tap it to open the picture sheet. Replaces the small emoji typing box. |
| Picture sheet: big preview, "Photo from your phone" (ink, the sheet's one main action), the suggested emoji first (outlined), 30 popular emoji, "Or type any emoji", "No picture", "Done" | P2 | Emoji in one tap, a photo in two (camera or gallery). Back / Escape / tapping outside closes it. |
| Photos are cut to the ballot's 4:5 shape, made small (480×600 JPEG, under ~110 KB) and re-drawn on the phone | – | Fast on Indian mobile data; the photo's hidden details (like where it was taken) are dropped before it leaves the phone. |
| "Duels with photos appear in public lists after a quick check. Your own link works straight away." | P3 | People's photos are held like politics duels: they show in Home / Duels lists after the owner approves them on /admin (thumbnails shown there). The share link works at once. |

### Create: build the ballot (owner: "the create feature looks like a form; it needs to be intuitive")

No form fields any more: you make the ballot itself, and it looks the way voters will see it (the separate preview is gone).

| Element | Level | Job / why |
|---|---|---|
| "Your ballot" card: the question typed as the big title (dashed line under it while empty, "Virat, Rohit or Dhoni?" as the example) | P1 | The first thing to do, in the place it will be shown. Enter moves to the first choice. |
| Choice rows = real ballot rows: number, picture circle, the name typed straight into the row, the blue Vote key (faded, it is not pressable here) | P1 | Making the ballot, not filling a form. × removes a row (3+ choices). On phones up to 360 px wide the Vote key hides so long names fit. |
| The next empty row, dashed: "+ Add a choice" | P2 | Grows by itself when you type in it (up to 10). |
| One line of setting chips under the ballot: Results after voting (on), Votes can change, End time, Topic, Add details | P3 | Each switches on tap or opens its small box underneath; dark = on. Replaces "More options" and its switches. |
| Ink button, full width on phones: "Write your question" → "Add 1 more choice" → "Create duel" | P1 action | Unchanged rule: one ink button that says the next step. |
| Ideas, "Use these as the choices", pictures, auto emoji | – | As before (sections above). |

## Phase 1: opinions about anything (owner: "it's a platform where people can check people's opinions about anything")

| Change | Why |
|---|---|
| "Duel/duels" → "poll/polls" everywhere (Hindi पोल, Hinglish poll); the Duels tab and page are now **Polls** at `/polls` (old `/duels` links redirect) | The site is for any question, not only head-to-heads. |
| "Exit poll" → **Guess the crowd** (Hindi सबका अंदाज़ा, Hinglish Bheed ka andaaza); "Your crowd guess was right!" | Same engagement, no legal risk from the words "exit poll" (RP Act s.126A). |
| Site title and preview: "Election · What does everyone think?"; "Ask anything. Vote in one tap, then see what everyone thinks." | Says what the site is now. |
| **Election mode** (per poll; chip on Create, P3) | On: EVM row light and beep, VVPAT slip, voter ID, counting day, "Result declared". Off: blue Vote key, a soft "pop", a 2-second ink moment, the result straight away, "Final result". Always on for politics polls. |
| Sealed note: "no poll results while a real election is voting" | Same rule, plainer words. |

## Phase 2: Rate it (owner: "start building next phase"; plan in docs/OPINIONS.md)

The first new question type. A rating poll is stored as a normal poll with five fixed choices ("1"…"5", faces 😖 🙁 😐 🙂 😍), so one vote each, hidden results, Guess the crowd, sealing and reports all work unchanged.

| Element | Screen | Priority | Job |
|---|---|---|---|
| "☑️ Choices / 😍 Rate 1–5" switch at the top of the ballot | Create | P2 | Pick the kind of question first; rating hides the choice rows and shows the five faces. |
| Five faces with words (Hate it … Love it), tap one to vote | Poll | P1 | One tap, like the research's best-answered formats. Lime outline = your pick. |
| After voting: the average big ("3.8 out of 5" with its face), "Average of N votes · You said: 🙂 Good", then one bar per face (yours lime) | Poll | P1 at that moment | You vs everyone, at a glance. No 50% line (it means nothing for a rating). |
| Tiles say "Rate it · 😖 to 😍"; My votes says "😍 5/5" and "Average so far: 4.5 / 5" with a bar | Polls, My votes | P3 | Rating polls are recognisable in lists. |
| Share images show the five faces; an open link says "I voted for 😍" | Share | P2 | Same share flow as other polls. |

## Phase 2: Pick several

One vote per person stays (the `votes` row and its unique index); the ticked choices are stored next to it in `vote_picks` and go with it (undo, delete my votes).

| Element | Screen | Priority | Job |
|---|---|---|---|
| "✅ Pick several" in the kind switch | Create | P2 | Same rows as Choices; hint "Tick every choice you like, then Vote." |
| Rows with "Tick / Ticked" (instead of Vote); tapped rows turn your colour with a ✓ | Poll | P1 | Choose as many as you like before anything is saved. |
| Ink button under the rows: "Tick your choices" (off) → "Vote · 2 picked" | Poll | P1 action | The one main step; one vote carries all ticks. |
| Results: each bar = % of voters who ticked it, with the note "the bars add up to more than 100%" | Poll | P1 at that moment | Honest maths for multi-answer polls. No race line, counting rounds or swing (they follow single votes). |
| Verdict and Guess the crowd use the most-ticked choice | Poll | P2 | "You're with the crowd" if any of your ticks leads. |
| Tiles "Pick several: A, B, C"; My votes "You picked A, B" | Polls, My votes | P3 | Recognisable in lists. |

## Phase 2: Rank

Ballots keep one vote per person; each place is stored in `vote_picks.rank`. Points: with N choices, 1st place earns N−1, last earns 0. A choice's bar is its points as a share of the best possible score (every voter putting it first); "average place" is shown under it.

| Element | Screen | Priority | Job |
|---|---|---|---|
| "🔢 Rank" in the kind switch; hint "Tap the choices in order: your favourite first." | Create | P2 | Same rows as Choices. |
| Rows show "Tap", then their place (#1, #2…) in the number circle and on the key; tap again to take it out | Poll | P1 | Ordering by tapping works on every phone (no dragging). |
| Ink button "2 of 3 placed" (off) → "Vote · my order is ready"; "Start again" link | Poll | P1 action | Every choice must be placed before voting. |
| Results: score %, bar, "average place 1.3"; the leader is marked; note "1st place earns the most points…" | Poll | P1 at that moment | The crowd's order at a glance; no 50% line (it means nothing here). |
| My votes "1. A, 2. B, 3. C" and "A leading · 88%" | My votes | P3 | Your order and the crowd's leader. |

## Phase 3: discovery (Today's question, Trending now, topic shelves)

| Element | Screen | Priority | Job |
|---|---|---|---|
| "Today's question" label above the first poll | Home | P2 | Says why this poll is first. The owner picks it on /admin ("Make today's question"); one at a time; picking it also marks it reviewed. Modi vs Rahul is no longer forced: it stays in Election mode but is just another poll once replaced. |
| "Today's question" section on /admin: current pick + the newest open polls, one button each | Admin | P1 on that section | Change the top of Home in one tap. |
| **Trending now** (up to 4 tiles on Home, 3 on Polls) | Home, Polls | P2 | Score = votes in the last 24 h ÷ (hours since start + 2)^1.5, divided by (1 + reports). Fresh activity rises, old polls sink, reported ones sink faster. Only polls with votes in the last day. Replaces "Most watched". |
| Topic shelves (the two topics with the most open polls, 2–4 tiles each, "All polls →" to the topic page) | Home | P3 | Browse by interest without searching. Polls already shown in Trending are not repeated. |

## Phase 3: WhatsApp pieces

| Element | Where | Priority | Job |
|---|---|---|---|
| `/today`: a fixed link that always opens today's question (shown on /admin to copy) | Link | – | Post it once in a WhatsApp Channel, group description or Instagram bio; it follows your daily pick. |
| Story card line: "5 friends voted from my link · 3 agree with me" (lime pill, only when friends have voted) | Status / Story image | P2 | Something to brag about that never says who leads (Wordle lesson), so friends still have to vote to see the result. Lime = your progress. |

## Phase 3: Search (`/polls?q=…`)

| Element | Where | Priority | Job |
|---|---|---|---|
| Search box + "Search" (ghost) button under the page title | Polls | P2 | Find a poll by any word in the question or a choice ("chai" finds "Chai or coffee?"). A plain form, so it works before scripts load and each search has its own link. |
| "Polls about “…”" + matching tiles | Polls, while searching | P1 | The only thing on the page while you search: Today's banner and Trending step away. Today's question is found like any other poll. |
| "Nothing yet. Be the first to ask." + ink "Ask it yourself" | Polls, no match | P1 | A dead end becomes a new poll: it opens Create with your words already in the question. |
| "Clear search" link | Polls, while searching | P3 | Back to the normal page. |

## Phase 3: My group vs everyone

"Your group" = you + the friends who voted from your share link. Pick-one polls only.

| Element | Where | Priority | Job |
|---|---|---|---|
| "Who picked Pani puri, like you": Your group (4) 75% (lime bar) vs Everyone 56% (grey bar) | Poll, after the vote (first thing under the pinned bar) | P2 | The question people actually argue about in a group chat: "are we different from everyone?" Lime = you. Only once results are open to you, and only with at least 3 friends (`GROUP_MIN`), so no single friend's vote can be worked out. |
| Story card line "75% of my group picked Pani puri · 56% of everyone" | Status / Story image | P2 | Replaces the friends line, only when the poll's result is already public to everyone (results not hidden, or the poll ended), the link is open (pick shown) and there are 3+ friends. Otherwise the spoiler-free friends line stays. |

## Legal must-dos (Rules page, 18+ tick, reminders)

| Element | Where | Priority | Job |
|---|---|---|---|
| Rules page `/terms` (linked from Create, My votes, Privacy and the photo sheet) | Page | P3 | The banned-content list and our removal times in the reader's language, plus the named complaints officer (IT Rules). |
| "A reminder of our rules: be kind, no private photos, no money." + Read the rules · OK | Home, under the poll, once a quarter per phone | P3 | The 3-monthly reminder the IT Rules ask for. One quiet line, never above the poll; gone after OK or after opening the rules. |
| "I am 18+, and these photos are of me or of people who said yes." tick | Photo sheet, above "Photo from your phone" | P2 | No children's data (DPDP) and no faces without consent. The photo button waits for it; the server refuses photos without it. Ticked once per poll. |
| "This is me, remove it" report reason | Report this poll | P3 | The person in a photo can take it down at once, without the owner. |

## Phase 3: Flood guard and a faster review page

Rules live in `src/lib/flood.ts`. A scrambled network code (never the address, never linked to a voter) is kept for an hour per vote.

| Element | Where | Priority | Job |
|---|---|---|---|
| Soft limit per network: 60 votes per poll per 10 minutes (25 on politics) | Vote | – | Slows a script on one connection without blocking a college Wi-Fi or a mobile network where many people share one address. Message: "Lots of votes from your network… try again in a few minutes." |
| Pause: 100+ votes in 10 minutes at 8+ votes per network on average, or 300+ in 10 minutes on a politics poll | Vote | – | Real sharing comes from many phones; a bot farm comes from a few networks. Voting stops for 30 minutes, results stay open, the owner's phone gets an urgent alert. |
| "Voting is paused for a few minutes: we saw unusual activity. Results stay open." | Poll, before you vote | P2 | Says why the ballot does not work, without blaming anyone. |
| Summary "1 paused · 2 reported · 3 new" | /admin, top | P1 | What needs you, at a glance. |
| Order: paused, then photo reports (2-hour rule), then other reports, then new | /admin | – | The most urgent first. |
| "first report 35 min ago" + red "Photo report: act within 2 hours" | /admin row | P2 | The legal clock, visible. |
| Resume voting (and Approve also resumes) | /admin row | P1 for paused rows | The owner looked: voting opens again. |
| Acted rows dim with "Done ✓"; the Today's question picker sits below the queue | /admin | – | The next one to look at stands out; what needs you comes first. |
| Vote buttons off while paused | Poll | – | No tap that can only fail. |

## Engagement: a daily ritual, not a game (research: `docs/ENGAGEMENT.md`)

The research says Election already has the right loop (guess → vote → reveal → compare). What it lacked was a shape for the day: a small set, a clear end, and a share that teases without telling.

| Element | Where | Priority | Job |
|---|---|---|---|
| Today's set: today's question + 4 more, the same for everyone all day (only polls from before midnight, shuffled by the day, one per topic first) | Home game | P1 | A shared daily moment (Wordle) with a reason to come back tomorrow. Shuffled by the day, not by votes, so new polls get a turn. |
| "Today's question · 4 left today" / "Today's set · 2 left today" in the label line | Home game | P3 | A plain-words head start and goal (endowed progress, goal gradient). **Never dots or a stepper** (CLAUDE.md), and it starts again each day: nothing counts across days, so it is not a streak. |
| End card "That's today's set. New set tomorrow." + "Your day vs everyone" (one row per poll: 🟩 with the 63% · 🟪 rare take: 1 in 8 · 🟨 neck and neck) | Home, after the set | P1 | A natural stopping point that ends on a high (peak-end), and the comparison people came for. One poll per row, **never a total** (that would be a score). Shown again when you come back the same day. |
| Ink "Share your day" (WhatsApp text: emoji line + legend + link) | End card | P1 action | Wordle's spoiler-free grid: shows which side you were on, never what you picked, so friends must vote to find out. Plain text, light on data. |
| Ghost "More polls" | End card | P2 | More only if you ask (no autoplay, no endless feed). Adds the rest of the deck in place. |
| Result lines: "You're with the 63%." · "Against the crowd. Only 38% picked this." · "Rare take. Only 1 in 8 picked this." · "Everyone agrees so far." (all votes on one side) | Result bar | P1 at that moment | Most people expect to be in the majority (false consensus), so real numbers and "rare take" make the reveal a surprise worth sharing. Numbers only for pick-one and pick-several; words for rank and rating. |
| "Your polls · 37 votes so far" (this phone's own list, newest 3) | Home, under the game | P2 | People value what they made (IKEA effect); group admins who come back to check are the ones who make the next poll. |
| One trending spot for the newest poll with few votes | Trending shelf | – | Fair discovery: counts make winners win more (MusicLab). |

### Engagement round 2: evening final count, owner numbers, speed

| Element | Where | Priority | Job |
|---|---|---|---|
| "Final count at 9 pm" tick (on by default) when picking Today's question | /admin picker | P2 | A real close at 9 pm India time (the evening peak): a reason to come back and a moment for group admins to post the result. Real time only, never a fake countdown; an earlier end set by the creator wins. |
| "Today's question · final count" + the final result, still first in today's set after 9 pm | Home | P1 in the evening | Evening visitors see how it ended. In "Your day vs everyone" a poll you missed says "closed before you voted". |
| Numbers (last 7 days): returning voters first, then today, new voters who came back, votes via friends' links, politics share | /admin, bottom | P3 | The one number to watch is weekly returning voters (aim 20–25%+). Totals only, never a list of people. |
| Speed (checked Oct 2026, 4× slower CPU, slow 4G): Vote buttons visible ≈1.2 s, working ≈2.0 s | Home, poll page | – | Under the 3-second target; most people leave pages slower than that. Biggest single file: the heading font (128 KB). |

### Engagement round 3: planned days and "Add to home screen"

| Element | Where | Priority | Job |
|---|---|---|---|
| Date box next to each poll + "Planned days" list (Remove) | /admin, Today's question | P2 | Event programming without being online: a Diwali poll for Diwali, a cricket poll for match day. On its India day it becomes Today's question by itself (the first visit of the day switches it, no timer), with the 9 pm final count. A pick by hand that day wins. |
| "Tomorrow in one tap. Add Election to your home screen." Add · Not now | End of today's set, once | P3 | An easier way back (Flipkart Lite: 60% of visits from the home-screen icon). Only where it works: Android Chrome's real prompt, or the two steps in words on iPhone Safari; nothing inside WhatsApp's browser, on computers, or once installed. Asked once, either answer remembered (CCPA: no nagging). |

## Interaction design (owner: "interaction design will also be a selling point")

**Rules for every interaction** (keep to them in new work):
1. **The tap answers in under 100 ms**: the key goes down, a click and a short buzz, before the server replies.
2. **Speed beats spectacle on repeat.** A big moment once per visit; after that, the short version. Election mode is the exception: its booth ritual is the point.
3. **Motion leads the eye to "you"** (your card first, lime marks), never to decoration.
4. **One thing moves at a time**: the old screen leaves before the new one arrives.
5. **Gestures are shortcuts, never the only way**: every swipe has a button.
6. **Everything stops with "Reduce motion"; every sound follows the sound switch; buzz only where phones support it.**
7. Taps: 150–250 ms; scenes: 350–600 ms; ease out (fast start, soft landing).

| Interaction | Where | Job |
|---|---|---|
| Quick ink: everyday polls get the full ink moment on the **first** vote of a visit, then a dab of polling ink (#5b2fa0) lands on your card's tick (0.9 s) with a double buzz, and the result shows at once | Poll | Was 2.4 s of waiting on every vote (12 s over a set of five). The signature stays; the set flows. |
| The result builds: your bar grows first, then the others (90 ms apart); numbers rise in with their bars; "Your pick / Leading" after | Poll result | The eye lands on you first, then the comparison: the reveal reads as a story, not a table. |
| Rare take: a lime marker stroke draws under "Rare take." | Result bar | The most surprising result gets its own small moment (lime = you). |
| Swipe left on a result → next poll | Poll, phones | The deck feels like a deck; Next stays the button. Ignored on chips and text boxes, and while counting. |
| Next: the old ballot leaves (0.16 s) before the new one slides in | Poll | Two questions never overlap (they used to, for a moment). |
| End of today's set: your rows arrive one by one (70 ms apart) | Home | Like results coming in; the end feels like an arrival. |
| Guess the crowd: the card you tap keeps an ink ring, the others step back, "Checking the count…" with the live dot for 0.7 s, then the reveal; right → confetti on the card you guessed and a happy double buzz | Poll, guess step | The suspense is the fun of a guess; before, the result jumped in at once and nothing showed which card you chose. No wait for "Skip" or with Reduce motion. |
| "Your poll is live": the panel pops in with a burst, a soft pop sound (sound switch) and a happy buzz, once | Poll, right after creating | The creator's proudest moment (people value what they made): celebrate it, then the one job is Share. |
| My votes: "Lead changed! · +12 new votes" under a poll, since you last looked (green = news) | My votes | The true, small news that makes coming back worth it. Remembered only on this phone; shown once per change; only what the poll already shows you (a lead you cannot see yet never appears). |
| From a friend's link: "You agree with your friend." (green) / "You and your friend disagree." + "They picked Dosa." as the **first** line of the result, and "· your friend" on their card | Poll, after voting via a friend's link | Agreeing or disagreeing with someone you know is the strongest social moment and what people reply about; it used to be the last small sentence. Still hidden until you have voted (and guessed). |
| Rank: unplaced rows say "→ #2" (the place they would get), placed rows say "Remove"; "Your order: 1. DDLJ · 2. Sholay · 3. 3 Idiots" builds above Vote | Poll (rank) | The number used to show twice and nothing said a second tap removes a choice; now each tap says what it will do, and you can check the whole order before voting. Rows never move under your finger. |

## The Arogya Line look (owner: "make the Election website look visually like Arogya Line")

Every screen, flow and rule stays the same; only the look changes, in one file (`src/styles/arogya.css`, loaded last). Values come from the Arogya Line prototype (LKB00/arogya-line, `src/styles/tokens.css`).

| Part | Was (patricka) | Now (Arogya Line) | Why |
|---|---|---|---|
| Type | Bricolage Grotesque headings + Lato | **Figtree** everywhere, semibold titles pulled in (-0.02em); Hindi falls back to Noto Sans Devanagari | Arogya's one calm typeface. |
| Ground and cards | Cream paper, borderless pastel cards | Warm off-white (#fbf9f6), white cards with a thin warm border (#e7e2da), 18px corners, a whisper of shadow | Arogya's ASHA app. |
| "You" colour | Lime #c2ef72 | **Brand yellow #fcd12a** (`--lime` keeps its name in code) | Arogya's brand and selected-tab colour. The "lime = you" rule is now "yellow = you". |
| Main action | Ink pill | Ink pill (unchanged) | Arogya: "the action colour is ink". |
| Vote keys, selected chips | Pastel blue key, ink chip | Soft indigo container (#e0e3ff) with indigo ink (#13205e) | Arogya's "Check someone" button and selected filters. |
| Signals | Olive green / brick red / amber | Arogya's green #2f7d4f, pink #b42b5e, marigold | Its triage colours. |
| Poll tiles | Solid pastel blocks | White cards; the tone fills only a round circle behind the topic icon | Arogya keeps cards white and puts colour in small round icons. |
| Dark mode | Dark palette | One light look | Arogya Line has no dark mode. |
| Share images, app icon | Lato, lime | Figtree, Arogya palette | Same look in WhatsApp as on the site. |

## The Arogya Line design language (owner: "I want to use the same design language")

Not just its colours: Arogya Line's way of building screens. Its principles (from its `docs/design-rationale.md`) now apply here too, next to ours:

| Arogya principle | What it means in Election |
|---|---|
| One next step | One main action per screen, at the thumb (already our rule: one ink button). |
| Colour never alone | Every status says a word and shows an icon (chips: "Poll of the day", "You already voted here"). |
| Every element earns its place | If it repeats what is already on screen, it goes (the My votes bar went: it repeated the % next to it). |
| End on a high | Already ours (peak–end): the end of today's set, the "your poll is live" moment. |

**Building blocks** (in `src/styles/arogya.css`, prefixed `al-`; use them for every new screen):

| Block | Classes | Used on | Job |
|---|---|---|---|
| Header: date, greeting, the size of the day | `al-home`, `__date`, `__title`, `__sub` | Home ("Sunday, 4 Oct · Namaste · 5 questions today · 2 left") | Speaks to you before the work, then says how much there is (Arogya's "Namaste, Sunita · 4 people need you today"). Small enough that today's question is still on the first screen. |
| Titled block | `al-block`, `__title`, `__aside` | Home, Polls, Topic, Your polls | Sentence-case title with a quiet count ("3 polls") or link ("All polls →") on the right. |
| List card + rows | `al-listcard`, `al-row`, `__disc`, `__main`, `__title`, `__meta`, `__when`, `__chevron` | Poll lists (was a tile grid), My votes, Your polls | One row per poll: a tinted disc with the topic icon, the question, the choices as a quiet line, the count or "New" / "Voted ✓" on the right, a chevron. Easier to scan than tiles; long questions wrap instead of being cut. |
| "Up next" card | `al-hero`, `__name`, `__fact`, `__action` | Poll of the day (Polls page; was the dark banner) | One soft card, a chip, the big line, one full-width action. |
| Status chip | `al-chip` (`is-you`, `is-good`, `is-alert`), and `.eyebrow` restyled | Poll page labels, Create, Poll of the day | Small and quiet, icon + word, never a button. Yellow when it is about you. |

Note: the earlier rule "nothing above the duel on Home" gives way to Arogya's Today header; it is three short lines, and today's question still starts on the first screen of a phone.

## Information hierarchy pass (owner: "fix information hierarchy · what to show upfront, what to hide · better visual representation")

Every screen read top to bottom, each element asked: is it needed first, later, only on request, or not at all?

| Screen | Found | Done | Rule it follows |
|---|---|---|---|
| Home | "5 questions today" in the header **and** "5 left today" right under it | The header now only greets (date, Namaste); the count lives once, in today's question label, where it updates as you vote | Say it once |
| Home | The rules reminder (P3) sat between today's question and Trending, pushing the polls down | Moved to the very end of the page | P3 last |
| Home | Trending + a topic shelf + 8 more polls: a long tail competing with today's set | "More polls" shows 5, then "All polls →" | Today's set is the P1; more is a short P3 tail |
| Poll, after voting | A 56px inked hand repeated the ink moment you had just watched, pushing the result bar down | 32px: a small record, not a second moment | Every element earns its place |
| Poll rows | The same "?" icon on nearly every row said nothing | The disc shows the poll's own faces (🫖☕, 🏏⚽, 😍 for a rating), from the creator's emoji or the name; the topic icon only when neither exists | Show what it is (recognise before you read) |
| Poll rows | "Dosa or idli?" over "Dosa vs Idli": the second line repeated the title | Hidden when the question already names every choice | Every element earns its place |
| Polls | "All polls" was one list of up to 60 rows | First 12 (the ones you can still vote on come first), then "Show 45 more polls" | Show a little, reveal on request |
| Create | Six settings chips over three lines before the main button | Upfront: "Results after voting" and "Topic"; the rest behind "More options". Anything switched on or filled in always shows | Most-used first; nothing you set is ever hidden |
| My votes | Reads well: title, your pick, where it stands, what changed | Kept | — |

## UX copy and information audit (owner: "audit UX copy and make it better · what information is in each component and what it should be")

Copy rules we now hold to: say what happens in plain words, one idea per line, no game words (score, points, dare), kind words when you are "wrong", the same word for the same thing in all three languages.

| Where | Was | Now | Why |
|---|---|---|---|
| Under the ballot | "Secret ballot · one vote each · results open after you vote · a fun poll, not official" | "Secret vote · results open after you vote · just for fun, not official" | Four facts → three; "one vote each" is enforced, not something to read |
| Crowd guess result | "Your crowd guess was right / wrong." | "You read the crowd right!" / "The crowd surprised you." | "Wrong" felt like a test mark |
| Swing line | "Swing in 24 h: Chai ▲ 3 pts" (Hindi "अंक" = points) | "Last 24 hours: Chai ▲ 3%" | "pts" read as game points |
| Rank note | "1st place earns the most points … best possible score" | "Higher places count more. A full bar = everyone put it first." | No points or scores |
| My votes summary | "… Your crowd guesses: 3 of 5 right …" | Polls voted + friends from your link only | A running right/wrong tally is a score |
| Friend link label, banner, leads | "A friend dared you", "Dare a friend", "dare your friends", "answered your dare" | "A friend voted. Your turn", "See where you stand", "ask your friends", "voted from your link" | Dare = game tone; asking is kinder and clearer |
| Share switch note | "Friends must vote to see your pick. More of them vote." | "Friends see your pick only after they vote, so more of them vote." | The second sentence did not make sense alone |
| Install invite | "Tomorrow in one tap." | "Open Election in one tap." | Said what it does |
| Counting ticker tie | "level" | "tied" | Plain word |
| Hindi server errors | "मुकाबला" (duel) | "पोल" | Leftover from the duel days |
| 16 unused texts | (dead keys) | removed | Less to translate and keep in step |

What each component shows, and what changed:

| Component | Shows now | Change |
|---|---|---|
| Poll header line | open/closed · votes · time left · last hour | With no votes: "Polling open · be the first" (was "0 votes cast · be the first") |
| Today's question card (Home) | chip · question · one fact · one action | Choice names only when the question does not already say them ("Chai or coffee?" no longer repeats "Chai vs Coffee"); 0 votes says "Be the first to vote." |
| Poll rows | faces · question · choices (unless repeated) · status · count | Closed polls say "Ended" (was "Polling closed": too long for a row) |
| Result bar | verdict · friend line · Share · Next | Wording only (kinder guess result) |
| My votes | summary · your pick · where it stands · since last look | Summary without the guess score |

Kept on purpose: "Polling open/closed", "Vote cast. Your finger is inked" and "Result declared" (the signature booth words); the internal key names `duels`/`moreDuels` (code only, never shown).

## Choice numbers (owner, Oct 2026: numbers on the voting choices are not needed)

The 1, 2, 3 badges on choices came from the EVM, where each candidate has a serial number. On a normal poll they added nothing (every element earns its place), so they now show only where they mean something:
- **Election mode** (politics, or when the creator turns it on): serial numbers stay, matching the EVM and the VVPAT slip.
- **Rank polls**: no badge until you place a choice, then its place (#1, #2…).
- **Everything else**: no number. Your pick is shown by its colour plus the "Your pick" caption (colour never alone). The Create preview follows the same rule.

## "Called it" polls (research: reports/Next features for Election, #1)

A question about something that has not happened yet (a match, a film's Friday, a show's eviction). Made on Create with the 🔮 Called it chip.
- **Voters:** vote as usual. There is no "Guess the crowd" step, because the vote itself is the guess. Above the question, the label "🔮 Called it · answer when it happens" says why the poll is different (P2).
- **Creator:** the phone that made the poll keeps a private key (localStorage; only its hash is stored). On that phone, the poll shows "Did it happen? Mark the answer" with one chip per choice (P1 for the creator), behind a confirm. Marking closes voting and cannot be changed. The owner's ADMIN_SECRET also works as the key.
- **After:** the answer's card says "✓ What happened"; the most-picked one says "Most called" (not "Won"). The result bar says "Result is in: CSK." then "You called it, like 38% of people." (green) or "Not this time. 38% called it." My votes shows "Result: CSK · you called it" with the yellow tick disc.
- **Not a score:** each poll stands alone. No running "7 of 12", no streak, no ranking of people.
- Pick-one polls only; never politics (the server switches it off for politics).

## Visual communication (owner, Oct 2026: "lack of visual communication design"; research: research_notes/Visual communication design/)

Rule: pictures alongside words, never instead of them (people remember pictures better, but icons alone are misread). Every picture has a job:
| Where | Was | Now | Why (research) |
|---|---|---|---|
| Poll result (pick-one, 2+ votes) | "You're with the 85%" as text | **People grid**: 100 dots, the ones who picked your choice in yellow (yellow = you), your own dot ringed in ink, and a big number: "**85** of every 100 picked Rain, like you." | Icon arrays ("85 of 100") are read more accurately than percentages, most of all by people who find numbers hard (Galesic, Garcia-Retamero); words say it too (colour never alone) |
| Empty My votes, search with no results, page not found | one line of text | a small drawn picture (ballot box with a slip, slips with a magnifier, a box with a "?") + one line + one action | Simple drawn pictures help first-time and low-literacy users more than text (Microsoft Research India); empty states are the first impression |
| Topic chips (Polls page) | words only | the topic's icon in its colour disc + the word | icon + label: recognised first, read to confirm |
| Topic page | title only | big topic picture above the title | says what the page is before you read |
| Up next card (Polls, topics) | question + text | the choices' own emoji, big ("🍵 ☕"), above the question | seen before read |

Pictures are inline SVG in the Arogya palette (a few hundred bytes each, no downloads). The dots grow in once; with reduced motion they just appear. Kept out on purpose: saffron, flag green, party symbols, the ECI logo, red/green for won/lost (Indian political and legal sensitivity).

## Empty states and "your guess" (visual communication, part 2)

**Empty states** (`EmptyState`): every empty page has the same three parts: a drawn picture, one line that says what is missing and why it matters, and the one next step. Never a blank space or a bare "nothing here".
| Where | Picture | Line | Next step |
|---|---|---|---|
| Home, nothing open today | ballot box | "No polls open right now. Start one for your friends. It takes 30 seconds." | Start a poll |
| A topic with no polls | ballot box | "No Music polls yet. Ask the first one. Your friends will vote." | Start a poll (Create opens already in that topic) |
| A poll list with no polls | ballot box | same as Home | Start a poll |
| My votes, none yet | ballot box | "No votes yet. Your votes will show up here…" | Start with today's poll |
| Search, nothing found | slips + magnifier | "Nothing yet. Be the first to ask." | Ask it yourself (question typed in) |
| Poll not found | box with "?" | "The link may be wrong, or the poll was removed." | Go to today's poll |
| Admin, nothing to review | box with a tick | "Nothing to review." | none |

**Your guess on the result:** after "Guess the crowd", the choice you guessed carries a small "◎ Your guess" pill under its bar, so you see how close you were on the real numbers, not only in a sentence.

## Packs: match-day and show-night (research: reports/Next features for Election, #2)

A few quick polls around one live moment, made in one go from **Create → "Make a match-day or show-night pack"** (`/create/pack`).
- **Match pack:** type Team 1, Team 2 and when it starts. You get: 🔮 "RCB vs KKR: who wins?" and 🔮 "How will it end?" (Called it, closing when the match starts), plus "Where are you watching?" (open 5 hours).
- **Show night:** type the show, its contestants (one per line) and the result time. You get: 🔮 "Who goes home this week?", "Your favourite this week?" and "Rate this week's episode" (1–5). Every show poll says "Fan poll, not the official vote."
- **The form shows the polls before you make them** (what you see is what voters get). One private key on the creator's phone marks every "Called it" result in the pack.
- **Pack page** (`/pack/<id>`): the pack chip (🏏/📺), the title, "Predictions close Sat, 7:30 pm" (or "Started · results when it ends"), Share the pack (WhatsApp first), then the polls played one after another.
- **Home → "Tonight"** (P2, under Your polls): packs starting in the next 36 hours or started in the last 6, as list rows.
- Also fixed: a poll's "Details" line (and the pack's fan-poll note) now shows under the question; it was saved but never shown.

## Result alerts: "Tell me the result" (research: reports/Next features for Election, #3)

After you vote on a poll whose result comes later (it has an end time, or it is a "Called it" waiting for its answer), the after-vote area offers **🔔 Tell me the result** with the line "One notification when the result is in. Nothing else." (P2).
- **Our line first, the browser's question only on tap** (never on arrival): Google's data says on-arrival prompts are mostly refused, and Chrome now limits sites whose alerts people ignore.
- **One alert per poll**, then it is forgotten. Several results at the same time become one alert ("3 results are in" → My votes). Written in the language that was on screen.
- **When:** a "Called it" the moment its answer is marked; other polls in the evening run just after the 9 pm final count (Vercel cron, `/api/cron/results`).
- **States:** on → "You'll get one notification when the result is in. Turn off"; blocked → how to allow it; iPhone in the browser → "add Election to your Home Screen first" (iOS only allows web alerts from the Home Screen).
- Hidden until the owner sets the keys (docs/OWNER_TODO.md). Deleting your votes on My votes also deletes your alert address. The Privacy page says what is kept.
- Not used for: "come back" nudges, new polls, streak reminders, or anything the person did not ask for.

## Group polls that reveal together (research: reports/Next features for Election, #4)

For a friend group, class or office: Create → More options → **👥 Group poll** → "How many people are in the group?" (2–200).
- **Nobody sees results until the whole group has voted** (or the poll's end time passes, if it has one). Not even voters: the numbers are zeroed on the server like any hidden result.
- **While waiting (P1):** a card with "7 of 12 voted", one dot per person filled in yellow as they vote, "Results open when everyone in the group has voted", and after you vote **Remind the group** (WhatsApp first, with "7 of 12 have voted"). The page refreshes by itself, so the results appear the moment the last vote lands.
- **Label:** "👥 Group poll" above the question. **My votes:** "Waiting for the group: 7 of 12 voted".
- **Link-only:** group polls never appear in public lists, Trending, topics or search.
- **No crowd guess** on group polls (or "Called it" polls): while waiting it would tell who leads, and once everyone has voted there is no crowd left to guess.
- **"Tell me the result"** works here too: the alert goes out the moment the last person votes.

## Month card: "Your October in opinions" (research: reports/Next features for Election, #5)

On My votes, above your list, once you have voted in 3+ polls this month (India time). A soft yellow card (yellow = you):
- **P1, a type word with one line:** "Crowd-pleaser · You usually side with most people" (with the crowd on 70%+ of judged polls), "Free thinker · You often go your own way" (40% or less), or "Balanced · Some with the crowd, some against it". Only once 3+ polls can be judged.
- **P2, what it rests on:** a row of 🟩/🟪 squares (with the crowd / against it, oldest first), "7 polls voted", "With the crowd on 5 of 7", "Rarest take: Dhoni (20%) in …" (polls with 5+ voters), "Mostly Food" (the topic's icon).
- **Share my month** (WhatsApp first): the type, the count and the squares, never what you picked.
- **Describes, never ranks:** no score, no percentile, no comparison with other people, nothing saved. Made fresh each time from this phone's votes; politics polls are left out; only polls whose results you can already see count (never a hidden number, never a group poll still waiting).

## Journey polish (owner: "few screens look off or messy, for example Create")

**Create, tidied:** one top-to-bottom flow in three labelled parts, then the one button.
1. **Your question:** a real box (border, white card, focus ring) instead of grey text on a dashed line; idea chips under it as one scrolling row (they used to run off the edge).
2. **Choices:** picture + name per row; the greyed-out "Vote" key that did nothing is gone (only the remove ×).
3. **Settings:** one Arogya list card of rows, each with its icon, its name, a quiet line and its current value or an on/off switch (the disc turns yellow when on). **Poll type** is the first row ("Pick one ›"); it opens the five types, each with one line on what it does, instead of five wrapping emoji chips. Then Results after voting, Category, and **More options** (End time, Group poll, Votes can change, Election mode, Add details). A row opens its own box right under itself.
- The pack link left the header (it competed with the form) and is now a list row after the form: "Or make a pack".

**Poll result:** the "line on each bar marks half (50%)" note and the 50% mark now show only in Election mode (counting-day look); elsewhere they were noise under every result. The trend line shows only when there is a trend.

**Polls page:** topics moved up, right under search, as one scrolling row of picture + word chips (they were at the very bottom, under a long list).

## Every poll is made by a person (owner, Oct 2026)

The site no longer adds polls of its own. The "Modi or Rahul?" flagship (with its leaders' photos) and the four starter polls (Virat/Rohit/Dhoni, IPL 2027, UP 2027, Chai or coffee) are gone from the code; on a database that has them they are hidden once (votes kept; the owner can "Show again" on /admin, and they then stay shown). Today's question is always one of people's polls, picked by the owner; if none is picked, Home shows the day's set of people's polls, and with nothing open, the "Start a poll" empty state. Ideas on Create and pack templates stay: a person chooses them and the poll is theirs.

## New visitor on an empty site (owner: "see how a new user uses it, with empty states")

Walked through on an empty database (no polls at all), as a first visitor, a creator and a friend. Fixed:
- **Home, nothing at all:** one empty state that says what the site is for ("Ask your friends anything. Make a poll, share the link on WhatsApp, and see what everyone thinks. It takes 30 seconds." → Start a poll). It used to show the empty state twice (again under "More polls").
- **Home, a few polls:** each poll shows once. Trending, topic shelves and "More polls" leave out today's set, and "More polls" leaves out ended polls; the "More polls" block is hidden when it has nothing left (it used to say "No polls open right now" under a list that had one).
- **My votes, nothing to vote on yet:** the button is "Start a poll" (it pointed to "today's poll", which did not exist).

### Each empty page has its own picture (owner: "the first 4 empty states use the same illustration")

The picture says what will fill the page, so no two empty pages look alike:
| Page | Picture |
|---|---|
| Home, empty site | a chat bubble holding a little poll, and a friend's reply ("ask your friends") |
| Polls / a list | poll rows waiting to be filled, the last one an empty "+" row |
| A topic | that topic's own icon tile in its colour (trophy, film reel, plate…) over empty cards; the header tile is hidden then, so it is not shown twice |
| My votes | a raised finger with the ink mark beside an empty ballot slip |
| Search, nothing found | slips and a magnifier |
| Poll not found | a box with a "?" slip |
| Admin, nothing to review | a box with a tick |

**Redrawn as one family (owner: "the previous [ballot box] was nice, put serious effort"):** every empty picture is now built around that same ballot box (white lid with slot, indigo box, yellow label, thick ink outline, ground shadow, yellow sparkles), each telling its page's story: Home = a chat bubble holding a poll and a slip going in; lists = slips fanned over the box, the middle one an empty "+"; a topic = the box in the topic's colour with its icon on the front badge; My votes = the inked finger (the vote moment's own drawing) beside the box and an empty slip; plus search (slips + magnifier), not found ("?" slip) and nothing to review (tick label). Code: `src/components/Spot.tsx`, `TopicSpot.tsx`.

**Motion (owner: "subtle and delightful"):** slow, small, looping, never in the way, and off for people whose phone asks to reduce motion. The picture rises in once (0.5 s). Sparkles twinkle, each on its own beat. Slips float 4 px above the slot. The side slips on lists sway like cards in a hand. The inked finger gives a small nod every few seconds. The magnifier circles slowly. The "?" slip wobbles. The poll bars in Home's bubble fill once, like votes coming in. The admin tick draws itself once. CSS only (election.css, "Spot motion").

## Dark mode (owner, Oct 2026: "design this website for dark mode")

Follows the phone's setting (light by default). Every colour is a token in `src/styles/arogya.css`; the dark block only changes values, so every screen gets it at once.
- **Ground and cards:** a warm near-black ground (#141311) and slightly lighter warm cards (#1f1d1a) with soft warm borders, so cards still read as objects.
- **Text:** soft off-white (#f2eee7), never pure white; quiet text in warm greys.
- **Brand yellow stays the same** (#fcd12a, "you"), with dark text and icons on it in both looks (`--on-lime`).
- **Pastels become deep, muted versions** (indigo #262a4c, pink #3b1f2c, green #1b3325, marigold #352f18) that glow instead of glare; the vote key is a deeper indigo with light text.
- **The main button flips:** off-white with dark text (the "ink" button in the dark look).
- **Pictures:** the white parts (lid, slips, bubble) become dark surfaces with light outlines, like chalk on a slate.
- **Unchanged on purpose:** the share images and the app icon stay light (they are pictures people send to others).
- Things that used to be fixed colours are now named tokens (`--you-soft`, `--hero-bg`, `--on-key`, `--spot-paper`, `--switch-on`, `--backdrop`…).

## Create is an action, not a tab (owner: "there should not be a page, there can be a plus button")

- **Bottom bar (phones):** three places (Home, Polls, My votes) and one round **ink "+"** (48 px, raised) that opens Create. Ink = the one main action; yellow stays the marker of the tab you are on, so the two never compete. No label under the "+" (its spoken name is "Start a poll").
- **Create opens full screen:** the bottom bar steps aside and the top bar shows **× Close**, which goes back to where you were (or Home if Create was opened from a link). Links into Create ("Ask it yourself", an empty topic's "Start a poll", packs) work as before.
- **Bigger screens:** the top bar keeps "+ Create" as a link (there is no bottom bar there).

**Balanced bar (owner: "the bar doesn't look balanced"):** with three tabs the "+" could never sit in the middle, so the bar now has two places on each side of it: **Home · Polls · ( + ) · My polls · My votes**. **My polls** (`/mine`) is the polls made on this phone with their live vote counts (creators come back to see how theirs is doing; every poll is made by people now). Its empty state has its own picture: a yellow pencil writing a slip above the box. The "Your polls" block left Home (one less repeat of a poll there).

## Profiles (owner, Oct 2026: "their choice to log in… required only when they want to create a poll… no forced login… design it nicely… we don't read whom you vote for")

- **When:** only when making a poll (Create, packs). Voting, results, sharing and My votes never ask. The form is filled first; tapping Create poll opens the profile sheet over it, and the poll is sent as soon as the profile is ready (nothing typed is lost). A small line above the button says what is next.
- **How:** a passkey. The phone's fingerprint, face or screen lock is the key: no password, phone number or email. Passkeys sync through Google / iCloud, so the profile works on the person's other phones. Session = a signed cookie for 180 days.
- **The screen, top to bottom:** the lock picture (the ballot box locked with a yellow padlock, a fingerprint slip above it); the title ("One quick step: your profile"; "Make your profile" on the You page; "Welcome back" for signing in); then **three promises** (P1 for trust, before anything is asked): *Your votes stay secret* (never linked to a profile, not even we can see them), *No password, phone or email*, *Only for making polls*. Then the two asks: a name (2–30 letters) and a face (16 emoji; the chosen one turns yellow = you). One ink button: "Continue with fingerprint or face". Under it "Already have a profile? Sign in" and "Just voting? You never need to sign in."
- **Votes are never part of a profile:** the votes table is untouched; votes stay with the anonymous voter cookie. The code for profiles never reads votes (`src/lib/profiles.ts`).
- **Polls made before signing in** join the profile on sign-in, each proven by its private key kept on the phone.
- **You tab** (bottom bar: Home · Polls · ( + ) · My votes · You; My polls moved here, `/mine` goes to `/you`). Signed in: the face in a yellow circle and the name with Edit (P1 header), Your polls with live counts (P1), a quiet note that votes are not part of the profile with a link to My votes (P2), then Sign out and Delete profile (asked once more; polls stay up with no owner) (P3). Signed out: the profile screen itself, then "Made on this phone" if there are any.
- **Names are not shown on polls yet** (a later choice for the owner).

## Poll maker tools, round 2 research (owner, Oct 2026: "build all you can"; research: reports/Next features for Election 2.md)

- **Maker's page `/p/<id>/manage`** (only the profile that made the poll; You → your polls opens it; the poll page shows "Manage your poll" to its maker). Top to bottom:
  - **How it's going (P1):** votes, a 24-bar "votes in the last 24 hours" strip, and "where votes came from" (WhatsApp / Instagram / QR code / Copied link / Other). Counted for the whole poll in `poll_sources`, never kept with a vote. One main action: **Share the poll** (WhatsApp; Copy link next to it). Share links carry `?src=wa|link|qr|other`; Instagram's own browser counts as Instagram.
  - **Results are in: post it back:** the story picture `/api/results/<id>` (question, "62% said Chai" / "Best date" / the average face, top five bars, people voted, QR). Only once anyone may see the result (open results, or the poll ended); hidden, sealed, politics and group-waiting results never make a picture.
  - **Suggested choices:** Add (becomes a real choice at the end) or Delete. Same suggestion twice counts "2 people asked".
  - **How long it runs:** 1 hour / Tonight 9 pm (India time) / 3 days / 1 week, and **End now** (asked once more; final; sends "tell me the result" alerts).
  - **Fix a typo** (question, details, choice words) only until the first vote, so nobody's vote changes meaning. **Ask again** opens Create filled in; the new poll shows "Last time: Chai led with 62% (40 voted)" after voting, only as far as the old result is public. **Tell me when 10 people have voted**: one push, once (only when phone alerts are switched on).
- **Which dates work?** (new poll type): the maker picks dates with the phone's date picker; voters tap each date through Works → If need be → Doesn't work (the word is on the key; "if need be" also has a dashed edge: colour never alone). Result: yes share bar, "2 yes · 1 if need be", and **Best date** = most yes, then most "if need be". No crowd guess for dates. The circle shows the day of the month.
- **Mix the order** (More options; pick one / several / rank, not the EVM): each voter gets their own fixed order. **Voters can suggest a choice** (on by default for pick one / several; nothing shows until the maker adds it). **Show my name** (off by default): "Asked by 🦁 Name" on the poll, linking to `/u/<id>`, a page of only the polls they put their name on (no counts of followers, no rankings).
- **Search:** each page has an English, Hindi (`?l=hi`) and Hinglish (`?l=hg`) address with hreflang; the address language wins for anyone who has not picked one (Google never has). Poll pages are indexed only when reviewed **and** 10+ votes; the sitemap lists the same, dated by the last vote. Poll pages carry structured data (question and choices; the vote count only when results are public). `max-image-preview: large` for Discover. Share text now says "Secret vote: nobody in the group sees your pick."
- **Lighter first load:** the sign-in sheet, share panel and picture picker load only when opened.

## Accessibility (WCAG 2.2 AA pass)

- Faint grey `--ink-3` and green `--positive` darkened to 4.5:1 on their grounds. New `--line-control` token: edges of fields, chips and face pickers at 3:1; off switches at 3:1 (`--switch-off`). Card borders stay soft (they are not controls).
- A 3px focus ring on everything focusable; the page keeps room above the bottom bar when moving focus (`scroll-padding-bottom`).
- One site-wide "reduce motion" rule (covers the copied `gb/` styles without editing them).
- Hindi (Devanagari) poll questions and choices get `lang="hi"`, so screen readers use Hindi rules. Pick-one vote buttons say "Vote for <choice>" before voting (voice control can say it).

## No tab-name headings (owner, Oct 2026: "if Polls tab is selected there is no need of heading called Polls, and on the rest of the pages")

The bottom bar already says where you are (the yellow tab), so Polls, My votes and You no longer show a big "Polls" / "My votes" / "You" title. Each page keeps it as a hidden heading for screen readers. Polls opens straight on search and topics; the generic line under the old title went too. Pages that are not tabs (a topic, Create, a poll, the maker's page) keep their titles: they say what you are looking at.

## Empty pages, uncluttered (owner, Oct 2026: "empty state pages are so congested, and there are UI elements which are irrelevant on an empty state")

One shape everywhere (`EmptyState`): the picture, a short **title** on its own line (no full stop), **one line** under it, **one ink button**, and at most one quiet text link. Centred, with room around it; a page that is only an empty state sits in the middle of the screen (`.empty-page`).

What an empty page no longer shows, because there is nothing for it to act on:
- **Home (empty site):** no date and greeting, no rules reminder.
- **Polls (no polls at all):** no search box, no topic chips (every topic would be empty too).
- **A topic:** no general "vote in one tap…" line, and the big topic title is screen-reader only (the picture already says "No Cricket polls yet").
- **Search, nothing found:** no heading repeating the search, no boxed frame; "Clear search" is the quiet link under the button.
- **My votes (no votes):** no "saved on this device" note, no keep-my-votes, no Reset (TEMPORARY) box, no rules links.
- **You (signed out):** the lock picture, "Make your profile", one line of promises (only for making polls, votes stay secret, no password/phone/email), one button; the name, faces and the full promises open in the sheet only when tapped. "Already have a profile? Sign in" is the quiet link.
- **Poll not found:** the same shape.

## Mobile spacing and full-width rows (owner, Oct 2026: "check consistency and padding, margin, spacing… the search box and CTA leave space on the right; it should use the whole space")

One scale on phones (in `election.css`, "Mobile spacing"): 16px page sides; 24px under a page head; 32px between sections (it was a mix of 64, 40, 32 and 24); 16px for a tight gap.
- **Fill the row:** the search box stretches and its button sits at the end (both 44px tall); after voting, Share and Next split the row; on the maker's page, Share the poll (2/3) and Copy link (1/3) share one row, the four lengths are a 2 × 2 grid and End now is full width; the match-day / show-night choice splits evenly.
- **Edge to edge:** sideways-scrolling chip rows (topics, Create's ideas) run to the screen edge instead of being cut at the page padding, with 16px between them and the search box.
- **Poll rows:** the count ("4 votes", "Ended · 4 votes", "✓ Voted · 1 vote") moved from a right-hand column to its own line under the choices, so titles get the full width instead of breaking after two words.

## Visual consistency pass (owner, Oct 2026: "check visual consistency, border, fill, colour and everything")

- **One meaning per colour on choice cards:** soft **indigo** = picked but not sent yet (and the vote keys); soft **yellow** = your vote, after voting (yellow = you), for every choice and in both looks. It used to take the choice's own pastel, so your pick was pink on one poll and green on another. Your result bar is ink; other bars are quiet grey.
- **Corners:** three tokens: `--radius-card` 18px (every card, list card, notice, the vote moment), `--radius-field` 14px (text boxes), `--radius-inner` 12px (photos, messages, picker tiles inside a card). Pills stay round. List cards were 20px; some boxes 16 or 24.
- **Shadows:** one warm tint. `--shadow-card` (resting), `--shadow-raised` (hover), `--shadow-pop` (sheets, previews, the vote moment), `--shadow-key` / `--shadow-key-pressed` (keys you press), with dark-look values. Fifteen hand-written cool-grey shadows are gone.
- **Colours:** the indelible ink purple is `--ink-mark` (with `-hi`/`-lo`), the switch knob `--switch-knob`; a leftover green glow from the old lime is now the brand yellow. No colour is written by hand in a rule any more (only inside the token blocks and the share-image palette).
- **Edges:** fields, switches and face pickers have the stronger `--line-control` edge (WCAG); chips, cards and buttons keep the soft `--line`.
- **Heights:** buttons side by side are the same height (Share the poll / Copy link 48px).
- **Counts:** data bars are ink or grey; green is kept for good-news signals.

## UX copy and journey audit, round 2 (owner, Oct 2026: "if there is slight scope of improvement it needs to be improved")

**Naming, the same everywhere (three languages):** "Start a poll" for every way in (the + / top-bar link, empty states, "Start a poll about this" from search); the form's button "Start poll". "Your votes" (tab and page; it sits next to "You"). "Today's question" (never "poll of the day"). "Share the result" (final outcome) / "See the results" (live numbers). "Share your ink" for the after-vote share and its sheet. "Topic", never "category". "Phone", never "device"/"browser"/"cookie" in what people read; "profile", never "account"; "notification", never "alert". "Poll maker" for the person who made a poll. Errors say how to fix them ("check your internet", "wait a few seconds", "remove one to continue"); server messages were rewritten too ("We could not find your profile on this phone…").

**Journeys fixed:**
- **Next on a shared poll:** the address, Refresh and the header ("Asked by …", the maker's bar, "Someone wants your pick") now follow the poll on screen. "Asked by" replaces the generic "Someone wants your pick" when both would show.
- **After making a poll:** "See votes as they come in (also under You)" links to the maker's page; Back no longer reopens a filled Create (the history entry is replaced); the note says "Send it to the group" (it used to promise live votes the maker could not see).
- **Create keeps a draft** (question, choices, type) for the visit: Close, a closed sign-in sheet or no internet never loses a poll. Closing sign-in says "Your poll is kept. Make a profile to post it." No internet says so, instead of "Something went wrong".
- **Maker's page:** Back goes to You and the You tab is lit; "Called it" answers can be marked here on any phone (not only the phone that made the poll); after a length change, End now or marking the answer, the top says what changed ("Saved. The poll now ends Tue, 9 pm."); "End the poll to make it now · Vote on your poll to see the results" explains a missing results picture; the repeated "Open the poll" row is gone; signed out, it says "Sign in to manage your poll" and starts on "Welcome back".
- **Back link:** poll, pack, topic and maker pages go back where you came from inside the site (Polls, Your votes, a topic…), or to Home from a WhatsApp link.
- **Voting:** an offline vote on pick-several, rank or dates polls now sends every tick when the phone is back online (it used to send only the first); untouched dates say "Tap to answer" (they looked pre-answered as "Doesn't work"); a waiting group poll shows one share action ("Remind the group"); group polls end in 3 days unless the maker picks a time; dates are saved as "Sat, 7 Nov" for every voter.
- **Links between places:** Your votes → "Polls you made"; your own maker page → "Manage your polls under You"; Poll not found → "Browse polls" too; the caught-up card → "See your votes".
- **Start fresh (TEMPORARY test tool)** no longer wipes a maker's private keys or list of polls.

## Splash and onboarding (owner, Oct 2026: "design onboarding and splash screen, intuitive and appealing")

**Who sees what (the rule):** a friend arriving from a WhatsApp link goes straight to the vote: no splash, no cards (the vote is the point; anything in front of it costs votes). The splash and the three cards are for a **first visit to Home** (no voter cookie yet); the installed app shows the splash on **every launch** from the home screen. Nobody sees the cards twice on one phone. Both are off for people who ask their phone for less motion (the splash) and skippable at once (the cards).

**Splash (`Splash.tsx`, about 2.4 seconds; owner, Oct 2026: "the loader should take some time, not be quick"):** the Election ballot box on the paper ground; a ballot slip with a yellow tick drops into the slot, the box's label lights up in "you" yellow, three yellow sparkles pop, then the name (yellow dot in an ink ring + "Election") and "What does everyone think?" rise in, and it fades away by itself. Pure HTML and CSS, no script, so the page loads underneath and is ready when it lifts; it can never block a tap. Light and dark from the same tokens.

**Onboarding (`Onboarding.tsx`):** a full-screen layer of three cards, swiped sideways or moved with one ink "Next" button (one main action), with dots that show where you are and "Skip ×" always in the top corner.
On a first visit the cards open at once *under* the splash, and the splash waits until they are on screen before it fades, so it fades straight into the first card and Home never flashes in between (owner, Oct 2026: "it shows the homepage, then the splash screen; this is a bug"). Changing card is a soft fade, not a sideways scroll (owner: "it should be smooth and intuitive"): the old card fades out, then the new card's picture, title and line rise in one after another, drifting a little from the side you are going to. Swipe, Next, Back and the arrow keys all do the same.
1. **Ask anything** (the chat-bubble ballot box): "Pizza or biryani? CSK or MI? Make a poll in 30 seconds and send it on WhatsApp." The language is picked here: English · हिंदी · Hinglish.
2. **One tap. Totally secret.** (the locked box): "Nobody sees your pick, not even us. No sign-up to vote."
3. **Get inked, see where you stand** (the inked finger): "Results open after you vote. Guess the crowd, then see how everyone voted." The button becomes **Start voting** (closes, Today's question is right there), with "Or start a poll" under it.
Pictures, titles, dots and button stay in the same place on every card (nothing jumps). Phone Back and Escape close it; arrow keys move between cards.

**Show it again to everyone (owner, Oct 2026: "reset it, it should start from onboarding in the next release"):** the phone remembers which *version* of the onboarding it has seen (`election-onboarded` = `ONBOARD_VERSION` in `Onboarding.tsx`, read by `Splash.tsx` before the page paints). Bumping the version (now `2`) shows the Home splash and the three cards once more to every phone the next time it opens Home, people who already voted included. Shared poll links still never show them. The TEMPORARY "Start fresh on this phone" button clears it too.

## Nothing hard-coded, and edge cases (owner, Oct 2026: "check if there is any edge case, nothing should be hard coded")

- **One home for each value.** Colours: tokens in `arogya.css`; the places that cannot read CSS (share images, app icon, the phone's top bar, the install screen) use `src/lib/palette.ts`, and `tests/palette.test.ts` fails if the two drift. The vote-moment machine and ink rod got their own tokens (`--machine-*`, `--rod-*`). Size limits (question 120, choice 60, details 300, 2–10 choices, names 2–30, 30 waiting suggestions) live in `src/lib/limits.ts`: the server, the text boxes and the error messages (all three languages) quote them from there. India time (`Asia/Kolkata`, `+05:30`) and the date locale live in `src/lib/time.ts`.
- **Every word translated.** Page titles, link-preview text, the site name and the screen-reader names of the menus are now in `i18n.ts` (they were English only). Every server error has a Hindi and a Hinglish version.
- **Edge cases fixed.** The story image no longer shows "friends from my link agree" on a secret link or a hidden result (it could give the pick away). A typo fix or an added choice that names a party now makes the poll a politics poll (review hold, silence window), as making it would. No undo after hidden results were shown straight away (Called it, dates, a group's last vote). Profile pages leave out group (link-only) polls and polls waiting for review. A typo fix and a vote can no longer cross (the poll row is held), two quick "Add" taps cannot pass 10 choices, a marked answer cannot be changed by a second tap of a different answer, "first 10 votes" and "group complete" alerts fire even when two votes land at once, dates polls never ask the crowd guess and "if need be" is not a yes on Your votes, and results-picture percentages add up to 100.

## Preview before posting (owner, Oct 2026: UI/UX round, "see how it looks")

| Element | Priority | Job |
|---|---|---|
| "See how it looks" link under the main button | P3 | Shows only once the poll is complete (a question and at least 2 choices). Choices cannot change after the first vote, so this is the moment to catch a typo or a missing choice. |
| The preview sheet | P2 | The poll drawn with the poll page's own ballot parts (question, details, each choice with its emoji, photo or letters, the Vote keys; the five faces for Rate it; Election mode numbers). Not tappable. Under it, one plain line of the rules people will meet (results after voting or open to all, a group's size, when it ends) and a yellow note: "Check the words: choices can't change after the first vote." |
| Start poll (ink) / Keep editing (white) | P1 / P2 | Posting from the preview is the same as the main button (signed out, it opens the profile sheet first). |

## Final result first (owner, Oct 2026: UI/UX round)

An ended poll opens on its answer. A white card sits right under the question, before the choices (P1 of an ended poll):
- Eyebrow with a trophy: "Final result" ("Result declared" in Election mode).
- The answer in large type: the winner's name; "Tie: A, B"; "Best date: Sat, 14 Nov" for a dates poll; "What happened: CSK" for Called it; "Nobody voted".
- One quiet line: "57% of 7 voters" (pick one / pick several), "Ranked top by N voters" (rank), the date's yes / if-need-be count, or for Called it how you did ("You called it, like 50% of people" / "Not this time. 50% called it.").
- Your pick as the yellow "you" chip: "✓ Your pick won · Biryani house" or "You picked Tea". (Not for Called it, rank, pick several or dates, where the line above or the bars already say it.)

It is not shown for 1–5 faces polls (their result already opens on the average) or during Election mode's counting rounds (it appears once counting ends). The pinned bar no longer repeats the result ("Final result: X wins by N votes" moved into the card) and no longer says running-poll lines like "Can your friends change that?" on an ended poll; it keeps Share the result and Next.

## Hindi and Hinglish on small phones (owner, Oct 2026: UI/UX round)

Every main screen opened at 320 and 360 px wide in Hindi and Hinglish (Home, Polls, Create, Your votes, You, Rules, Privacy, a topic, packs, open, voted, ended and Called-it polls, not found), with a check for text that is cut off, spills past the edge or makes the page scroll sideways. Fixed:
- **Polls search:** on a 320 px phone the Hinglish "Dhoondo" button pushed the page 27 px sideways (the box would not shrink). The box now shrinks; the button never wraps.
- **Hindi choice badges:** a choice without emoji or photo showed two initials made of bare consonants ("पत" for "पुष्पा तीन"), which reads as another word and drops the vowel sign. Hindi (and other Indian scripts) now show one whole first letter ("पु"); two letters only when two choices would clash.
- **Hindi dates:** the short month ("5 अक्टू॰") is spelled out ("5 अक्टूबर") everywhere a date is shown (`monthStyle` in `src/lib/time.ts`).
- **Idea chips on Create:** the scrolling row snapped its first chip to the screen edge; it now lines up with the 16 px gutter.

## Big screen (owner, Oct 2026: UI/UX round, "TV screen mode")

`/p/<id>/tv`: a poll on a TV or projector for a class, an office, a wedding or an IPL watch party. Everyone votes on their own phone; the screen updates by itself every few seconds (paused while the tab is hidden).
| Element | Priority | Job |
|---|---|---|
| The question | P1 | Large enough to read across a room (type grows with the screen). |
| Choices / live bars | P1 | Before results are public: the choices with their faces and one line ("Results show when voting ends", "4 of 6 have voted", or the silence-window note). Once public: a bar and a whole percentage per choice (adding up to 100 for pick-one); the one ahead has an ink bar and a heavier edge (shape, not only colour). |
| QR card | P2 | "Scan to vote" (after the end: "Scan to see the result") with the short link under it. The QR link carries `src=qr`, so the maker sees where votes came from. |
| Top line | P3 | Brand, "Live" (or "Final result" / "Result declared") and the vote count. A quiet "Full screen" button, hidden once full screen. |

Safety: the screen always asks for the public view (`/api/polls/<id>?public=1`, no voter), so a presenter who has voted never puts hidden results on a TV. Not indexed by search engines. Entry point: "Show on a big screen" on the maker's page (anyone with the link can open it; it shows only what the poll page shows to a non-voter). Landscape: poll left, QR right; portrait or phone: one column with a small QR row.

### Splash: one, painted first, lifts when the page is ready (owner, Oct 2026: "the transition from loading animation to splash screen is not smooth")

Before: on a first visit, Home's grey loading outline painted first and the splash then popped over it; the splash also left on a fixed timer, so a slow page showed the grey outline again before snapping in, and the installed app could play two splashes. Now there is **one** splash, the first thing in `<body>` (layout), switched on by a tiny script before anything paints (installed app: every launch; Home on a first visit of this onboarding version; never a shared poll link; never with Reduce motion). It plays at least 1.15 s, then fades (0.35 s) into the page as soon as the page has arrived, at most 3 s. The onboarding cards open a beat after the fade (`election:splash-done`). Timings and keys: `src/lib/onboard.ts`.

## Delete a poll (owner, Oct 2026: "if users have created a poll, if they want they can delete it")

On the maker's page, last (P3, its own card): **Delete poll** (trash icon, the soft pink "negative" signal, "Take it down for everyone, with its votes"). It opens one sheet: "Delete this poll?" and plainly what happens ("It disappears for everyone straight away, with all its votes, and can't be brought back. As our Rules say, we keep a private record for 180 days, then erase it."), with **Delete poll** (pink, icon + word) and **Keep it** (focus starts here, the safe choice). After deleting: back to You with "Poll deleted."

What happens: the poll is hidden at once everywhere (its page says "Poll not found"; it leaves You, the maker page, lists, search, topics, Today's question, Your votes and alerts). The owner's "Show again" cannot bring it back, and it leaves the review queue unless it was reported. It is erased with its votes `DELETED_KEEP_DAYS` (180) days later by the daily job (`/api/cron/results`, which needs CRON_SECRET; until then records are simply kept longer, which the Rules allow: "at least 180 days").

### Profile sheet, lighter (owner, Oct 2026: "this screen is information heavy, it will give cognitive load")

- **Signing back in:** the picture (smaller), "Welcome back", one line, the fingerprint button, "New here? Make a profile". Nothing else: someone signing in already knows the promises.
- **Making a profile:** the picture, the title and one line, name, face, the button, and the promise as **one line under the button** ("🔒 Your votes stay secret. No password, phone or email."), where the decision is made. The three-card promise box and the "Just voting? You never need to sign in." footer are gone (the You page behind the sheet already says "Only for making polls").

### Start a poll, signed out: profile first (owner, Oct 2026: "when they click on create poll button, open login screen")

Replaces "fill the form first, sign in at the end". Signed out, Start a poll (the "+", every "Start a poll" link) and Make a pack open the profile screen ("One quick step: your profile", or "Already have a profile? Sign in"); once the profile is ready the page refreshes into the empty form (any ?title / ?topic / ?again from the link is kept). The server already refuses polls and packs without a profile; the sign-in sheet inside Create stays only for a sign-in that ran out mid-form.

### You page, clearer order (owner, Oct 2026: "so many CTAs, no hierarchy, why is there this Your votes CTA")

Top to bottom: who you are (profile card, Edit profile) → **Your polls** (P1: each row opens the poll's page) → **Account** (P3: one quiet list, "Sign out" and "Delete profile" in pink, asked once more inline). Removed: the "Your votes are not part of your profile… Your votes" line and link (Your votes is its own tab; the promise is on the profile screen), and the big outlined Sign out button. An ended poll's row says "Ended · 0 votes", never "no votes yet: share it".

### Edit profile: its own sheet (owner, Oct 2026: "when I click on edit profile why are options visible, this screen should be about edit profile")

"Edit profile" opens a sheet over the dimmed page (it used to open inside the card, with the polls, sign out and the rest still around it): "Edit profile", the picked face large, Your name, Pick a face, **Save** (ink) and **Cancel**, and × / Back / Escape to close. Nothing else can be tapped while it is open. After Save the card shows the new name and face at once (the API returns the saved profile).

### Picture for a choice, simpler (owner, Oct 2026: four points on the picker)

1. **No "I am 18+…" tick in the picker.** The Rules (Photos) say who may add photos, and now also: "Adding a photo means you confirm you are 18 or older and that everyone in it said yes." The server no longer asks for the tick (older pages may still send it).
2. **No separate "Photo from your phone" button.** The first tile of the grid adds a photo (camera or gallery), the same size as an emoji tile.
3. **No "Or type any emoji" box.** The grid (suggested emoji first, then popular ones, five full rows) is the choice; "Remove picture" shows only once something is chosen.
4. **Nothing shown before you choose.** The preview at the top is an empty dashed "add" circle until you pick, and the choice rows on Create no longer fill in an emoji by themselves (🍕 for "Pizza"): the fitting emoji is offered first in the grid instead. Without a picture, the ballot shows the choice's letters.

### No hover looks on touch screens (owner, Oct 2026: "why is there a hover state in mobile view")

On a phone a tap leaves `:hover` stuck on what was tapped (a grey row, a darker button, a lifted card) until the next tap elsewhere. Rule from now on: **hover looks are for a real mouse only.** Every hover rule in `election.css` and `arogya.css` sits inside `@media (hover: hover) and (pointer: fine)`; the copied `gb/` rules (never edited) are put back to their resting look for `(hover: none), (pointer: coarse)` at the end of `arogya.css`. Press feedback while the finger is down (`:active`, the slight shrink) stays on phones. New hover rules must follow the same pattern.

### Create settings, one pattern (owner, Oct 2026: "Start a poll UI is breaking, no consistency, specially in Settings")

Two kinds of row only, all 72px high with the same icon disc:
- **Switch rows** (Results after voting, Show my name, Votes can change, Voters can suggest, Mix the order, Election mode): name, one short line (shortened so it fits on one line on a phone), the switch.
- **Rows that open** (Poll type, Topic, End time, Group poll, Add details): name, the current value only when there is one (no "Off" next to a chevron, which read like a switch), the chevron.
An open row keeps its white look and its disc (it used to turn grey, hiding the disc). What opens sits in one panel shape: 16px sides, full-width fields that all look the same (48px, rounded, icon + input), the topic chips, or the poll types (each with its icon in a round disc, the chosen one soft indigo). The Group poll note is one short sentence ("Results open when everyone has voted, or after 3 days. Not in public lists.").

## Desktop layout (owner, Oct 2026: "the mobile experience is good, desktop needs to be better… the layout of Dashboard")

Phones and tablets are unchanged: every rule is in `election.css` under `min-width: 1024px` ("Desktop").

- **One width.** The top bar's insides line up with the wide pages (1032px of content), so the logo, the page title
  and the cards share one left edge.
- **Home.** P1 today's poll on the left (no longer one stretched card). P2 a 360px column on the right: tonight's packs,
  trending, topic shelves, more polls. The rules reminder stays last, under both. No extra "Start a poll" card: the top
  bar already has it.
- **Polls.** A 264px left column that stays in place: search (Enter searches; no button, the column is narrow) and the
  topics as a vertical list with a small "Topics" label. The list of polls beside it.
- **Start a poll.** The form on the left; on the right, "How voters will see it", drawn live as you type (the same
  `PreviewCard` the "See how it looks" sheet uses; empty parts show as faint placeholders). It stays in place while
  the form scrolls. "See how it looks" is hidden here, since the preview already shows it; Post is still the one
  ink button.

## Create settings stay open while you pick (owner, Oct 2026: "whenever I click on any option… it automatically got collapsed… not smooth")

- Picking a poll type or a topic no longer closes its list. The tick and colour move to your pick; the row's own header
  (its value now updated) closes it, like any accordion.
- The option you tapped stays under your finger: a new poll type changes the choices section above it, so the page
  scrolls by the same amount (`steady` in `CreateForm.tsx`).
- A list opens with a short slide and fade, and picks change colour softly (only when the phone allows motion).

## Top bar on computers (owner, Oct 2026: "I don't like the top navigation bar layout, there can be intuitive layout")

Phones are unchanged (logo, language, sound on top; the bottom bar below). On bigger screens the top bar now says the same
thing as the phone's bottom bar, in the same order and with the same pictures:

- **Left:** the logo, then three tabs, Home · Polls · Your votes, each with its bottom-bar icon. The tab you are on is a
  soft pill in bold (the same "which tab" rules as `BottomNav.tsx`). Under 900px wide the icons drop so the words fit.
- **Right:** P1 "Start a poll" as the ink button (it was a fourth tab, which hid that it is the main action; hidden on
  Create itself, where Post is the ink button), then language and sound, then **you** as a round profile button at the
  far right, where people look for their account. It turns yellow while you are on your pages (yellow = you).

## Sound switch moved to You (owner, Oct 2026: "why there is mic icon in navigation bar… remove it")

The speaker button in the top bar (voting beep on/off) read as a microphone and took a top-bar place for something few
people change. It is now one switch row, **Voting sound** ("A short beep when you vote"), on You: first in the Account
list when signed in, and in a one-row Settings list when signed out (everyone votes, so everyone can mute). Same switch
row as Create's settings; remembered on the phone. The top bar keeps only the places, Start a poll, language and you.

## Poll page on computers (owner, Oct 2026: "make the poll page better on desktop too")

Phones unchanged. On a computer (≥1024px) the poll page has Home's shape: P1 the poll on the left (624px, so choice rows
are no longer a metre wide), P2 "More polls" on the right: up to five other open polls (newest first, the ones you have
not voted on first) with "All polls →". The column stays in place while the poll scrolls (results, Guess the crowd).
It is not drawn on phones, where Next leads from one poll to the next.

## Motion round (owner, Oct 2026: "there should be motion graphics, communication design and delightful animations… build all six")

Rules: every motion has a job; under a third of a second except the two moments (voting, "your poll is live"); one big
moment per screen; nothing moves with "Reduce motion"; no game effects (points, coins, trophies, confetti showers).

| # | Motion | Where | Priority | Job |
|---|---|---|---|---|
| 1 | "Your poll is live": a slip drops through the slot, the box gives, a yellow seal with a tick stamps its front (with the existing small burst) | Poll page after posting (`CreatedPanel`, Spot `live`) | P1 at that moment | Making a poll is the biggest step a person takes here; it gets its own moment. Reduced motion: the sealed box only. |
| 2 | The result builds (bars grow, your pick first, existing), then the leading choice's number gives one pop | Poll results | P2 | The eye ends on who is ahead. |
| 3 | Pages fade in (opacity only, so sticky bars and pinned buttons never shift); poll lists come in row by row, 35 ms apart, the 8th row on together | Every page; every list of polls | P3 | Moving between places feels smooth instead of a jump cut. |
| 4 | Signs of life: open polls' counts are asked for again every 45 s (at most 10 times, only while the tab is on screen, `/api/polls/counts`, limits in `limits.ts`); a count that went up ticks with a yellow flash. "Trending now" has the pulsing live dot | Home, Polls, topic pages, the poll page's side list | P3 | The site feels alive: other people are voting right now. |
| 5 | The pictures breathe (sparkles, floating slips, existing); the padlock's shackle now clicks now and then | Empty pages, sign-in | P3 | Friendly, never still. |
| 6 | With a mouse only: ballot cards, Guess-the-crowd cards and banners lift 2px with a shadow | Computers | P3 | Shows what can be pressed. Never on touch screens. |

## You on computers (owner, Oct 2026: "make the You page better on desktop too")

Phones unchanged. On a computer (≥1024px):
- **Signed in:** a 340px left column with you (face, name, Edit profile, laid out as a card, face larger) and the Account
  list under it; P1 **Your polls** beside it, full height. Same parts and order for screen readers as on a phone.
- **Signed out:** the profile screen as a white card on the left; Settings (Voting sound), and polls made on this
  computer, in a 400px column on the right.

## Your votes on computers (owner, Oct 2026: "make the Your votes page better on desktop too")

Phones unchanged. On a computer (≥1024px): P1 your votes (where each of your picks stands) as the main column on the
left; a 360px column on the right with your record ("You voted in 6 polls."), your month card, "Polls you made", Keep
your votes, Start fresh and the Rules / Privacy links. Same order for screen readers as on a phone (grid areas, not
moved markup). The list of votes comes in row by row like the other poll lists.

## The rest of the pages on computers (owner, Oct 2026: "build next")

Phones unchanged; all of it under min-width 1024px.
- **Topic pages:** the Polls page's left column of topics (this topic marked in indigo), the topic's polls beside it.
  A long topic shows 12 polls, then "Show N more" (as on Polls).
- **Your poll's page (maker):** title and status across the top; P1 how it's going (votes by hour, where votes came
  from, Share), the result picture and suggested choices on the left; how long it runs, the tools (fix a typo, first-10
  alert, big screen, ask again) and Delete in a 360px column on the right.
- **A maker's public page (/u/…):** the same shape as You: the maker's card on the left, their polls beside it.
- **Packs:** the pack's polls on the left (like a poll page); what it is, when predictions close and Share on the right.

## Public launch (owner, Oct 2026: "ready to make it live for public")

The temporary "Reset this phone" box on Your votes (for the owner's testing) is gone. "Delete my votes" (Keep your
votes) stays: that is the visitor's own right to remove their votes.

## "Other (write your own)" (owner, Oct 2026: "Modi vs Rahul Gandhi… there should be an option for Other… show the most chosen apart from these")

| Element | Screen | Priority | Job |
|---|---|---|---|
| Switch "Let people write their own" | Start a poll, settings (pick-one polls, not Called it) | P3 | Adds "Other" as the last choice. Off by default; **on by default when the topic is Politics or the question/choices name a politician or party** (a two-name ballot leaves everyone else out). The live preview shows it. |
| "Other" choice with a pen (✍️), in the voter's language | Ballot | P2 | One more way to vote. Tapping it opens a name box under the ballot ("Who do you choose?", ink Vote button) instead of voting at once. 40 letters max; the word filter applies. |
| "Most named under Other: Yogi Adityanath (12), …" | Results, under the Other row | P2 | The answer to "who else?". Names are grouped however they were typed ("yogi  adityanath" = "Yogi Adityanath") and shown with their most common spelling. **Only names written by 2+ people**, top 3, and only once results are visible (hidden results never leak). |
| "Other (Yogi Adityanath)" | Your own row after voting; Your votes shows the name you wrote | P2 | You see what you said. |

Rules in `src/lib/polls.ts` (`createPoll`, `castVote`, `getPoll.otherTop`); limits in `limits.ts` (`MAX_OTHER`, `OTHER_MIN_PEOPLE`, `OTHER_TOP`). The Other choice is never offered for "fix a typo" on the maker's page.

## People counter and visitor numbers (owner, Oct 2026: "show how many visitors… and I want to know as well… free")

- **Home**, under the greeting: "● 12,345 people have voted here" (different voter numbers, each counted once; votes are never linked to a person). Shown from 25 people (`VOTERS_SHOW_MIN`), so a new site never says "3 people".
- **For the owner:** Vercel Web Analytics (free on Hobby): daily visitors, pages, countries, devices. No cookies, nothing that identifies a person; the Privacy page says so in 3 languages. Switched on once in Vercel (docs/OWNER_TODO.md). The admin page already shows voters and returning voters.

## After the product audit (owner, Oct 2026: "build both")

**"Have a question of your own?"** (P2, first thing under the result, every poll): one list row with a yellow "+",
"Virat or Rohit? Pizza or biryani? Make one in 30 seconds." → Start a poll. The audit's main growth step (voter →
maker) had no prompt after a single vote; it only appeared at the end of a full set.

**Step counter** (owner only, /admin, `src/lib/events.ts`): how many times each step happened per India day, never who
and never which poll. Steps: Home opened, poll opened, friend's link opened, vote, vote from a friend's link, Share
opened, WhatsApp chosen, link copied, Start a poll opened, "Have a question of your own?" tapped, poll made, poll made by
someone who had voted before. Votes and polls are counted by the server; the rest by the page (`/api/e`, a fixed list,
rate-limited). The admin page shows today and 7 days, and five rates: opened → voted, friend's link → voted, voted →
Share, Start a poll → made, polls made by voters. The Privacy page says so in 3 languages.

## Create: settings folded into one row (owner, Oct 2026, from the product feedback)

A first poll is: the question, its choices, **Start poll**. All settings (poll type, results after voting, show my
name, Other, topic, more settings) sit behind one **Settings** row that says what is set now ("Pick one · General").
One tap opens the full list as before. It opens by itself when an end-time error needs fixing, and is open for "Ask
again" polls. The live preview on computers still shows the effect of every setting (e.g. "Other" for politics).

Step counter: "Guess the crowd" answered / skipped (not counted when yours was the only vote), with one more rate line on
/admin: "Asked to guess the crowd → answered". Test plan for the first real users: `docs/USER_TEST.md`.

## Engagement round (owner, Oct 2026: "the product is social engagement; polls are the mechanism")

- **"Ask your friends"** is the main button everywhere it said "Start a poll" (top bar, Home, empty pages, after voting,
  search with no results), in 3 languages. People don't want to "create a poll"; they want to know what friends think.
  The form's own submit button stays "Start poll".
- **Social formats** in Settings → Poll type: Ask (pick one), **Hot take** (new), Predict (was "Called it"), Pick
  several, Rank, Rate it, Decide a date. Same poll kinds underneath. Hot take = a pick-one poll that starts with
  🔥 Agree / 🤔 Depends / 🙅 Disagree (filled only while the choices are empty) and a statement placeholder.
- **Engagement score** on /admin (`getEngagement` in `src/lib/stats.ts`): for polls made in the last 30 days with 3+
  votes, 0–100 = half votes through friends' links, a quarter reactions per vote, a quarter voters who said why. Top 5
  polls and every topic's average. From rows already kept; counts only.
- Still no points, badges, streaks, coins or leaderboards: engagement comes from curiosity, people, disagreement and
  surprise.

**Visitor count on Home** (owner, Oct 2026: "show visitor count on the website", then "three avatars, then a plus, then
the number, somewhere at the bottom", then "make it subtle"): one quiet line at the bottom of Home, no card, before the rules reminder (on an empty
site, under the empty state): three overlapping faces (the first three profile faces, on yellow, indigo and pink soft
grounds; decoration only, never real visitors), a soft "+" circle once there are more than three, then the number in bold
and "people have visited"; "· M have voted" after it once 25 people have voted. Small (24px faces, 13px muted text). Not ink (ink is the one main action) and not
tappable. Shown from the first visitor (`VISITORS_SHOW_MIN`); "1 person has visited" in the singular. Each phone is counted once: `FirstVisit` (in the layout, so a first visit from a
shared poll counts too) remembers `election-visited` and sends the `visitor` step; a phone that cannot remember is not
counted. The total is every day's `visitor` steps added up, never shown smaller than the voter count. P3.
