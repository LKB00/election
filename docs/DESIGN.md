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
