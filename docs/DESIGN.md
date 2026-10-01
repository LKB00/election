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
- **Lime** = "this is you / your progress" (your streak pill, your count, active tab, your-pick badge). Not used for decoration.
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
| Role line on the card (label, caps 10px) | P3 | Context for people who do not know the person. Tiny so the name wins. |
| Name on the card (20px bold) | P2 | Second thing you read on the card, after the face. |
| "Tap a card to vote · anonymous · one vote each · results unlock after" | P3 | Answers the 3 fears (how? who sees? can I cheat?) without a paragraph. Sits right under the cards, where the thumb already is (patricka hides its own hint on phones; ours must stay). |
| Progress pips + ✓ and 🔥 pills inside the game | hidden for new people | For someone with 0 votes, "0" and "0" are noise and look like a quiz score. Shown once you have voted (then they mean "keep going"). |
| Today card (goal ring, week) | hidden until first vote | A streak means nothing before you have played. After the first vote it becomes the reason to come back. |
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
| 🔥 streak + ✓ votes pills in the top bar | P3 | Always-visible progress, the patricka habit loop. Lime only on the votes pill = "yours". |
| Level card (Me) | P1 on Me | The one summary of "how am I doing". |
| Today card | P2 | Today's small goal (3 duels), the reason to come back tomorrow. |
| Your votes list | P3 | Memory and a way back into old duels. |

## Duels page (`/duels`)

| Element | Level | Job / why |
|---|---|---|
| Duel of the day (dark banner) | P1, then P3 | The one duel we want everyone in. Dark = the strongest card on the page. After you voted in it, it moves below the list: the duels you have not done matter more. |
| Duel tiles | P2 | Browse more. Pastel tiles from patricka; voted ones say "You voted" so you skip them. |
| Today card | P3 | Progress, below the content. |
