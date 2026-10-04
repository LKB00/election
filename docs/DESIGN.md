# Election: why every screen and element looks the way it does

The look comes from patricka (Good Bot, Bad Bot): its tokens, type scale and components.
This file is about **what each element is for** and **how much attention it gets**.
Rule: if an element has no clear job on that screen, it is removed.

## The opinions rule (owner, most important; replaces "the election rule")

**Election is a place to see what people think about anything.** Every poll keeps the parts of a fair vote that make it trustworthy and fun: ballot numbers, a secret ballot, one vote each, results only after you vote, the inked finger (our signature on every poll), "Guess the crowd", "leading / won", sharing that you voted.
**Election mode** adds the full booth ritual on top: the EVM beep, the VVPAT slip, the voter ID number, counting day (3 rounds) and "Result declared". It is always on for politics polls and the flagship, and a creator can switch it on for any poll ("Election mode" chip on Create). Everything else gets a short ink moment and the result straight away.
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

## Temporary: "Reset this phone" (owner: "add a temporary reset content button")

| Element | Screen | Priority | Job |
|---|---|---|---|
| "Testing · Reset this phone" (dashed box, last on the page) | My votes | P3 | The owner tests the site as a first-time visitor again. Removes this phone's votes, exit poll calls and reactions (same as "Delete my votes") and clears what the browser remembered, then opens Home. Never touches other people's votes or the duels. Remove before a public launch: `src/components/ResetFresh.tsx` and its line in `src/app/me/page.tsx`. |

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
| **Election mode** (per poll; chip on Create, P3) | On: EVM row light and beep, VVPAT slip, voter ID, counting day, "Result declared". Off: blue Vote key, a soft "pop", a 2-second ink moment, the result straight away, "Final result". Always on for politics polls and the flagship. |
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
