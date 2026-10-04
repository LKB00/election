# Owner to-do list (things only you can do)

Plain list of jobs that need you, not code. Tick them off when done. Claude adds to this list whenever something new needs you.

## 1. Settings on Vercel (one time, about 30 minutes)

Where: Vercel → your project **election** → Settings → Environment Variables. Add each one, then press **Redeploy** once at the end so they take effect.

| Setting | What to put | Why | Without it |
|---|---|---|---|
| [ ] `ADMIN_SECRET` | Any long random text (16+ letters), keep it private | Opens your review page: `/admin?key=<this text>` | You cannot review polls, hide bad ones, resume paused polls or pick Today's question |
| [ ] `NEXT_PUBLIC_GRIEVANCE_NAME` | The complaints officer's name (can be you) | Indian IT Rules ask for a named person | Rules page says "use Report this poll" instead |
| [ ] `NEXT_PUBLIC_GRIEVANCE_EMAIL` | An email you check daily | Same rule; shown on Rules and Privacy pages | Same as above |
| [ ] `REPORT_ALERT_URL` | `https://ntfy.sh/<a long secret name>` | A phone alert for every report and every paused poll | You only find reports by opening /admin |
| [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` | From a free Cloudflare account → Turnstile → add site | Invisible "are you a person?" check on every vote | Bots can vote more easily |
| [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` | From a free account at upstash.com → Redis database → REST API | Makes speed limits work across all of Vercel's servers | Limits are weaker (each server counts on its own) |
| [ ] `NEXT_PUBLIC_SITE_URL` | Only if you buy your own domain, e.g. `https://yourname.in` | Share links and QR codes use your domain | They use the Vercel address (fine for now) |

**Phone alerts (ntfy), step by step:** install the free **ntfy** app → tap + → subscribe to a long secret name you make up (like `election-alerts-7f3k9q`) → put `https://ntfy.sh/election-alerts-7f3k9q` in `REPORT_ALERT_URL`. Keep the name secret: anyone who knows it can read the alerts.

**Optional:** Vercel → Settings → Deployment Protection. Turn off the login wall if you want preview links (not just the main address) to open without a Vercel login.

## 2. Daily habits (5–10 minutes a day)

- [ ] **Pick Today's question** on `/admin?key=…` (it is the first poll on Home and what `/today` opens). Morning is best: most Indians check their phone within 15 minutes of waking. Leave "Final count at 9 pm" ticked: voting on it closes at 9 pm and people come back in the evening for the result. In the evening, post "here's how it ended" in your Channel.
- [ ] **Post `/today` in your WhatsApp Channel** each morning (see below). One post a day, never at night.
- [ ] **Check /admin**: paused polls and **photo reports first** (the law gives 2 hours for private or sexual photos). Approve good new polls so they can appear in search.

## 3. Growth (one time, then now and then)

- [ ] **Create a WhatsApp Channel** (WhatsApp → Updates → + → New channel), name it like the site, add the site link in the description, and post the `/today` link each morning. The research says this is the best way to bring people back without login or notifications.
- [ ] **Start small:** share in one college, office or friends' group at a time, with a poll made for that group.
- [ ] **Plan big days ahead** (festivals, IPL and India matches, big film Fridays): make the poll a few days early, then on `/admin` pick its date in the box next to it. That morning it becomes Today's question by itself, with the 9 pm final count. Keep them light: food, cricket, films, city pride. No religion or caste match-ups. You can also ask Claude to make a batch of them.

## 4. Law and safety

- [ ] **One review by an Indian tech lawyer** of the Rules page, Privacy page and the 18+ photo tick (the research is not legal advice).
- [ ] **Election silence windows:** when the Election Commission announces poll dates, add them as `SILENCE_WINDOWS` on Vercel (example in `.env.example`), or ask Claude to add them. Politics results are then sealed in those windows.
- [ ] Every 3 months the site reminds people of the rules by itself. If you change the rules, ask Claude to update them (the "last updated" date changes with them).

## 5. Decisions waiting for you

- [ ] **Remove the temporary "Reset this phone" button** on My votes before a public launch. Just say "remove the reset button".
- [ ] **Name and domain:** the research suggested a broader name than "Election" one day. You chose to keep it for now; revisit when you are ready.
- [ ] **Watch one number weekly:** "returning voters" at the bottom of `/admin` (people who voted on 2 or more days this week). Aim for 20–25% or more of the week's voters.

## Done

- (Move items here when finished.)
