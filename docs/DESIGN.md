# Election: why every screen and element looks the way it does

The look comes from patricka (Good Bot, Bad Bot): its tokens, type scale and components.
This file is about **what each element is for** and **how much attention it gets**.
Rule: if an element has no clear job on that screen, it is removed.

## Priority levels (used on every screen)

| Level | Meaning | How it looks (patricka parts) |
|---|---|---|
| **P1** | The one thing the person came to do on this screen. Only one per screen. | Biggest type (display 30/40), most space, the only dark/ink primary button |
| **P2** | What helps them do P1, or the next step after it | Section/card titles 20, white cards on sand, ghost buttons |
| **P3** | Nice to know. Never blocks or competes. | 13/12 text, muted ink, chips, small pills |

Colour roles (from patricka, never mixed):
- **Ink button** = the main action. One per view.
- **Lime** = "this is you / your progress" (your votes pill, your guess score, active tab, your-pick badge). Not used for decoration.
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
| Progress pips + ✓ and 🔥 pills inside the game | hidden for new people | For someone with 0 votes, "0" and "0" are noise and look like a quiz score. Shown once you have voted (then they mean "keep going"). |
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

## Flow 4: coming back (`/me`, top bar)

| Element | Level | Job / why |
|---|---|---|
| 🎯 right guesses + ✓ votes pills in the top bar | P3 | Always-visible progress you earn by playing well, not by showing up. Lime only on the votes pill = "yours". |
| Level card (Me) | P1 on Me | The one summary of "how am I doing". |
| Level card stats: votes, right guesses, crowd-reading %, friends who answered your dares | P2 | What you are good at, and how many friends you brought in. |
| Your votes list | P3 | Memory and a way back into old duels. |

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
| No duels left | "All caught up!" screen with "Start your own duel" and "See the results". | A clear end, not a silent stop. No fake "2/3" score. |
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
| Open Home | Starts at the first duel you have not voted in. If none: "All caught up!". | Never shows you something you already did as if it were new. |
| Top bar 🎯 / ✓ | Your right guesses and votes, update right after each vote or guess. | Progress you can feel without a streak. |

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
| "You read the crowd! +1" / "Not this time. X is ahead." | P1 in the result bar | The win (or the near miss) is the first line you read after the reveal. Confetti only for a right guess. |
| 🎯 pill (top bar, score bar) | P3 | Your running score of right guesses. Replaces the streak. |
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
| Party · role line | Context for people who don't follow politics | Keep (owner to confirm the text) |
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
