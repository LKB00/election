# Owner to-do list (things only you can do)

Plain list of jobs that need you, not code. Tick them off when done. Claude adds to this list whenever something new needs you.

## 1. Settings on Vercel (one time, about 30 minutes)

Where: Vercel → your project **election** → Settings → Environment Variables. Add each one, then press **Redeploy** once at the end so they take effect.

| Setting | What to put | Why | Without it |
|---|---|---|---|
| [x] `ADMIN_SECRET` | Any long random text (16+ letters), keep it private | Opens your review page: `/admin?key=<this text>` | You cannot review polls, hide bad ones, resume paused polls or pick Today's question |
| [x] `NEXT_PUBLIC_GRIEVANCE_NAME` | The complaints officer's name (can be you) | Indian IT Rules ask for a named person | Rules page says "use Report this poll" instead |
| [x] `NEXT_PUBLIC_GRIEVANCE_EMAIL` | An email you check daily | Same rule; shown on Rules and Privacy pages | Same as above |
| [x] `REPORT_ALERT_URL` | `https://ntfy.sh/<a long secret name>` | A phone alert for every report and every paused poll | You only find reports by opening /admin |
| [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` | From a free Cloudflare account → Turnstile → add site | Invisible "are you a person?" check on every vote | Bots can vote more easily |
| [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` | From a free account at upstash.com → Redis database → REST API | Makes speed limits work across all of Vercel's servers | Limits are weaker (each server counts on its own) |
| [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` | A key pair Claude can make for you (ask "make the alert keys"), or run `npx web-push generate-vapid-keys` | Turns on "Tell me the result" phone alerts | The button does not appear |
| [ ] `VAPID_SUBJECT` | `mailto:` + an email you check, e.g. `mailto:you@gmail.com` | Push services contact this address if alerts misbehave | Alerts use a placeholder address |
| [ ] `CRON_SECRET` | Any long random text (16+ letters) | Lets Vercel's evening job send the 9 pm result alerts (only Vercel knows it) | Only "Called it" alerts are sent; 9 pm result alerts are not |
| [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | From Firebase (steps below) | Turns on "Continue with Google" and "Continue with phone number" on the profile screen | Only fingerprint/face sign-in shows |
| [ ] `NEXT_PUBLIC_SITE_URL` | Only if you buy your own domain, e.g. `https://yourname.in` | Share links and QR codes use your domain | They use the Vercel address (fine for now) |

**Phone alerts (ntfy), step by step:** install the free **ntfy** app → tap + → subscribe to a long secret name you make up (like `election-alerts-7f3k9q`) → put `https://ntfy.sh/election-alerts-7f3k9q` in `REPORT_ALERT_URL`. Keep the name secret: anyone who knows it can read the alerts.

**Google and phone-number sign-in (Firebase), step by step (about 20 minutes):**
1. Go to **console.firebase.google.com** → **Create a project** → name it (for example `chunav`) → you can turn Google Analytics off → Create.
2. **Build → Authentication → Get started.** In **Sign-in method**, turn on **Google** (pick your email as support email, Save) and **Phone** (Save).
3. Still in Authentication → **Settings → Authorized domains → Add domain**: `chunav.lokeshbhatia.com` (and `election-three-ruby.vercel.app` until the move is done).
4. **Phone codes cost money:** Firebase asks you to move to the **Blaze** plan (pay as you go; add a card) before it sends SMS. Each SMS to India costs a little (Firebase shows the price). To stop surprise bills: Google Cloud → Billing → **Budgets & alerts** → set a small monthly budget with an email alert. Optional but good: Authentication → Settings → **SMS region policy** → allow only India.
5. **Project settings** (gear icon) → General → **Your apps** → the **</>** (Web) button → name it `chunav-web` → Register. It shows a `firebaseConfig` with `apiKey`, `authDomain` and `projectId`.
6. In Vercel → Settings → Environment Variables, add `NEXT_PUBLIC_FIREBASE_API_KEY` = the apiKey, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = the authDomain, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = the projectId. These three are public by design (they are in every visitor's browser), so they are safe, but still put them straight into Vercel, not in chat. Then **Redeploy** and tell Claude "done": Claude will check the buttons appear and work.
Note: Google sign-in does not open inside WhatsApp's or Instagram's own browser (Google blocks it); the screen then tells people to open the site in Chrome or Safari, or to use their phone number.

**Optional:** Vercel → Settings → Deployment Protection. Turn off the login wall if you want preview links (not just the main address) to open without a Vercel login.

- [x] **Switch on visitor numbers (free, 1 minute, done Oct 2026):** Vercel → your project **election** → **Analytics** (top menu) → **Enable**. From then on that page shows how many people visit each day, which pages, from which countries. No cookies; the Privacy page already says so.

- [ ] **Read your step counter once a week** (bottom of your admin page, "Steps people take"). The five lines at the top say where people drop off: if few people who open a friend's link vote, the poll page needs work; if few voters open Share, sharing needs work; if few who open Ask your friends make one, Create is too hard. Tell Claude the numbers and it will suggest the fix.

- [ ] **Test with 10 real people** using `docs/USER_TEST.md` (15 minutes each, no helping). Then send Claude the top 3 places people got stuck.

## 2. Daily habits (5–10 minutes a day)

- [ ] **Pick Today's question** on `/admin?key=…` (it is the first poll on Home and what `/today` opens). Morning is best: most Indians check their phone within 15 minutes of waking. Leave "Final count at 9 pm" ticked: voting on it closes at 9 pm and **its result opens for everyone at 9 pm** (nobody sees numbers before), so people come back in the evening. In the evening, post "here's how it ended" in your Channel.
- [ ] **Post `/today` in your WhatsApp Channel** each morning (see below). One post a day, never at night.
- [ ] **Check /admin**: paused polls and **photo reports first** (the law gives 2 hours for private or sexual photos). Approve good new polls so they can appear in search.

## 3. Growth (one time, then now and then)

- [ ] **Create a WhatsApp Channel** (WhatsApp → Updates → + → New channel), name it like the site, add the site link in the description, and post the `/today` link each morning. The research says this is the best way to bring people back without login or notifications.
- [ ] **Start small:** share in one college, office or friends' group at a time, with a poll made for that group.
- [ ] **Plan big days ahead** (festivals, IPL and India matches, big film Fridays): make the poll a few days early, then on `/admin` pick its date in the box next to it. That morning it becomes Today's question by itself, with the 9 pm final count. Keep them light: food, cricket, films, city pride. No religion or caste match-ups. You can also ask Claude to make a batch of them.

## 4. Law and safety

- [ ] **One review by an Indian tech lawyer** of the Rules page, Privacy page and the 18+ photo tick (the research is not legal advice).
- [ ] **Election silence windows:** when the Election Commission announces poll dates, add them as `SILENCE_WINDOWS` on Vercel (example in `.env.example`), or ask Claude to add them. Politics results are then sealed in those windows. Cover the **whole voting period** (from the first phase's voting day to 30 minutes after the last phase ends), not just the last 48 hours: the Election Commission says predictions by "any person" in that period go against the law.
- [ ] Every 3 months the site reminds people of the rules by itself. If you change the rules, ask Claude to update them (the "last updated" date changes with them).

## 5. Decisions waiting for you

- [x] **"Reset this phone" removed** for the public launch (Oct 2026).
- [x] **Name:** the site is now called **Chunav** (Oct 2026).
- [ ] **Own address: `chunav.lokeshbhatia.com`** (owner, Oct 2026: "use a subdomain of lokeshbhatia.com"). About 15 minutes, no cost:
  1. Vercel → project **election** → **Settings → Domains** → type `chunav.lokeshbhatia.com` → **Add**. Vercel then shows one DNS record to add (usually **CNAME**, name `chunav`, value like `cname.vercel-dns.com`; copy exactly what Vercel shows).
  2. Where lokeshbhatia.com's DNS lives (the company you bought the domain from, or Cloudflare / your portfolio host): **add that CNAME record**. Do not change any other record, so your portfolio keeps working. Vercel's Domains page turns green when it works (a few minutes, sometimes up to an hour); it also sets up the padlock (HTTPS) by itself.
  3. In the same Domains page, open `election-three-ruby.vercel.app` → **Edit** → **Redirect to** `chunav.lokeshbhatia.com` (permanent). Old links people already shared keep working and land on the new address.
  4. Vercel → Settings → Environment Variables → `NEXT_PUBLIC_SITE_URL` = `https://chunav.lokeshbhatia.com` → **Redeploy**. Share links, QR codes, link pictures and Google now use the new address.
  5. Firebase (when you set it up): Authentication → Settings → **Authorized domains** → add `chunav.lokeshbhatia.com`.
  6. Google Search Console: add the new address as the property (not the old one).
  7. Tell Claude "domain done": Claude checks the new address, the link pictures and the redirect.
  Good to know: a fingerprint/face profile belongs to the address it was made on, so a profile made on the old address needs to be made again on the new one. Do the move before many people make profiles. Google and phone-number profiles do not have this problem: they work on any address. Votes made on the old address stay counted; "Your votes" on the new address starts fresh unless you open your "Keep your votes" link there.
- [ ] **Watch one number weekly:** "returning voters" at the bottom of `/admin` (people who voted on 2 or more days this week). Aim for 20–25% or more of the week's voters.

## 6. Features waiting (from the research, in order)

Say "continue features" and Claude picks up the next one.
- [x] "Called it" polls (live)
- [x] Match-day and show-night packs (Create → "Make a match-day or show-night pack"). Tip: make one each IPL match morning and post its link in your WhatsApp Channel.
- [x] "Tell me the result" alert: built. **It needs 4 settings on Vercel to switch on** (see section 1).
- [x] Group polls that reveal together: Create → More options → Group poll. Good for office lunch, class trips, family plans.
- [x] "Your month in opinions" card (on My votes after 3+ votes in a month). Idea: on the 1st of each month, post "Share your month" in your WhatsApp Channel.
- [x] Round 2: poll maker page (votes per hour, where votes came from, end now, lengths, fix a typo, ask again, results picture, first-10-votes alert), "Which dates work?" polls, suggest a choice, mix the order, show my name + maker page, Hindi/Hinglish pages for Google, accessibility pass. The first-10-votes alert needs the same alert keys as "Tell me the result" (section 1).

## 6b. From the round 2 research (needs you)

- [x] **Moved to Mumbai** (Oct 2026): the site runs in Mumbai, the database is the Neon project "Poll" in Singapore.
- [ ] **Delete the old Neon project** after a week (around 13 Oct 2026): neon.tech → the old project → Settings → Delete project. Check the project name first: keep **Poll** (Singapore).
- [ ] **Google Search Console** (free, 10 minutes): search.google.com/search-console → Add property → your site address → verify (Vercel lets you add the TXT record) → Sitemaps → submit `sitemap.xml`. It shows which searches find you. Hindi and Hinglish pages are now offered to Google too.
- [ ] **Test on an old Android phone inside WhatsApp:** send yourself a poll link, check the preview picture shows, open it, time how long until you can vote.
- [ ] **Should poll makers see their own poll's results without voting?** Today they must vote (or end the poll) like everyone else, so the maker's page says "Vote on your poll to see the results". Say "let makers see results" if you want that.
- [ ] **Two decisions:** (1) should private planning polls (like "Which dates work?") ever be allowed to show voters' names? Today: never. (2) should results ever be split by groups people choose (city, team)? Today: no.
- [ ] **Invite small fan pages and college meme pages** to make polls with "Show my name" on (never paid). Their page `/u/…` lists their polls.
- [ ] **IPL 2027:** when the schedule is out (about Jan–Feb 2027), plan match-day packs; Claude can make the batch.
- [ ] **Tamil and Telugu:** find one reviewer for each before Claude adds them.

## 7. Good to know

- **Vercel builds:** saving work no longer builds a preview copy on Vercel (that was using up the free daily limit). Only "make live" builds the site, once. Nothing to do; if you ever want preview links back, ask Claude.

- **Every poll is made by people now.** The site's own polls (Modi or Rahul?, Virat/Rohit/Dhoni, IPL 2027, UP 2027, Chai or coffee) were hidden once. Their votes are kept. To bring one back, open it on `/admin` and press **Show again**.
- **Today's question** is always one of people's polls that you pick on `/admin`. If you pick none, Home shows the day's set of people's polls.
- **Early days:** with few polls, ask friends and groups to make the first ones (or make a few yourself, as a person). A match-day pack is the quickest way to get several at once.

- **Profiles (sign in with fingerprint or face):** nothing to set up. Only people who make polls need one; voting never does. One thing to know: a profile belongs to the website address it was made on. If you move to your own domain later, people make their profile again once (their polls can be moved over by Claude).
- **Names on polls:** each poll maker chooses ("Show my name", off by default).

## Done

- (Move items here when finished.)

## Photo consent (your decision, Oct 2026)

You asked to remove the "I am 18+, and these photos are of me or of people who said yes" tick from the picture screen. It is gone. The Rules page now says that adding a photo means the person confirms they are 18+ and that everyone in it agreed. Before, each person ticked a box for this, and the site kept no record that they did. Now it rests only on the Rules page. Under India's data-protection and IT rules this is a little weaker. If you can, ask a lawyer whether that is enough for photos of people. Photos are still checked before a poll is shown to everyone, and "This is me, remove it" still takes a photo down at once.
