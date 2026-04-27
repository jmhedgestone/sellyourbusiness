# Selling Your Business — Newsletter Nurture Sequence

10 weekly emails for new newsletter subscribers. Each repurposes a pillar article into a tighter, more personal, voice-driven format — written in John's voice as a working broker, not a textbook.

## ⭐ Recommended path: GoHighLevel (true per-subscriber drip)

If you have a GHL sub-account, **use that instead of Resend Broadcasts**. GHL gives each subscriber their own drip starting from their signup time — Day 0, +7, +14, …+63 — instead of everyone getting the same email on the same Tuesday.

**See [GHL_SETUP.md](./GHL_SETUP.md) for the full workflow setup** (~30 min one-time):
1. Create an Inbound Webhook trigger in a GHL workflow
2. Set `GHL_WEBHOOK_URL` env var on Vercel
3. Build the 10-step drip in GHL using the HTML files in this folder

Once that's wired, every newsletter signup at the bottom of an article auto-flows into your CRM and triggers the drip from Day 0.

## Fallback: Resend Broadcasts

Resend doesn't currently have a true automated drip sequence. The closest pattern is to schedule each email as a **Broadcast** 7 days apart, sent to the `SellYourBusiness Newsletter` Audience.

Two options:

### Option A: Manual scheduling (simplest, free)
1. Create a Resend Audience: `SellYourBusiness Newsletter` (you should already have this — set the ID in `RESEND_AUDIENCE_ID` env var on Vercel).
2. Open https://resend.com/broadcasts
3. For each `.html` file in this folder (in order, `01-` through `10-`):
   - Click **Create broadcast**
   - Paste the **Subject** from the comment at the top of the file
   - Paste the **Preview text** (preheader)
   - Paste the HTML body into the HTML editor
   - Pick the audience: `SellYourBusiness Newsletter`
   - Schedule it for the appropriate Tuesday (week 1, week 2, etc.)
4. Repeat for all 10.

### Option B: API-driven (recommended) — `scripts/schedule-nurture-sequence.mjs`

A Node script that reads all 10 HTML files, parses metadata, creates each as a Resend Broadcast, and schedules them at weekly offsets — one shot.

**Setup once:**
```bash
export RESEND_API_KEY=re_xxxxxxxxxxxx           # https://resend.com/api-keys
export RESEND_AUDIENCE_ID=<your-audience-uuid>   # https://resend.com/audiences
```

**Dry run (always do this first — prints the schedule, doesn't touch Resend):**
```bash
node scripts/schedule-nurture-sequence.mjs
```

**Actually create + schedule them:**
```bash
node scripts/schedule-nurture-sequence.mjs --confirm
```

**Override the start date (default: next Tuesday at 9am ET):**
```bash
node scripts/schedule-nurture-sequence.mjs --confirm --start 2026-05-12
```

The script prints a per-week status as it goes and exits non-zero if anything failed. View results at https://resend.com/broadcasts — each broadcast lands as `Nurture Week N: …` so they're easy to find.

**Optional env tweaks:**
- `RESEND_FROM` — sender (default: `John Matsis <john@sellyourbusiness.com>`)
- `RESEND_REPLY_TO` — replies route here (default: `john.matsis@hedgestone.com`)
- `RESEND_SEND_HOUR_ET` — local hour to send each Tuesday in 24h (default: `9`)

## Cadence note

Each subscriber gets one email per Tuesday for 10 weeks. After week 10, they're moved into the general broadcast list (one issue per Tuesday, mixed topics).

If a subscriber converts to a Lead before completing the sequence, you can either:
- Let them finish the sequence anyway (lighter touch)
- Tag them in Resend and stop the sequence (recommended once you're sending volume)

## File structure

Each `.html` file is **paste-ready** for Resend's HTML editor:

- Top comment block: `SUBJECT`, `PREVIEW`, `WEEK`, `PILLAR`, `LINK`
- Below the comment: the email's HTML body, designed for Resend's default email shell (header/logo/footer added automatically by Resend Audience templates)
- Unsubscribe link is added automatically by Resend when sending to an Audience — don't add one manually

## The 10 emails

| # | Week | Subject | Pillar |
|---|------|---------|--------|
| 01 | 1 | Welcome — and what your business is probably worth | (Welcome) |
| 02 | 2 | The single number every buyer cares about (it's not revenue) | Valuation: SDE |
| 03 | 3 | Why your competitor sold for 6× and you'd be lucky to get 3× | Valuation: Multiples |
| 04 | 4 | SDE or EBITDA? You're probably using the wrong one | Valuation: EBITDA vs SDE |
| 05 | 5 | Add-backs: free money — or the thing that kills your deal | Valuation: Add-backs |
| 06 | 6 | The 12-month playbook that adds 30% to your valuation | Valuation: Increase value |
| 07 | 7 | When is the right time to sell? Here's the signal I look for | How to Sell: Timing |
| 08 | 8 | The 12-month pre-sale checklist nobody talks about | How to Sell: Preparation |
| 09 | 9 | Should you use a broker, or sell it yourself? | How to Sell: Broker vs DIY |
| 10 | 10 | The Letter of Intent — where most sellers get fleeced | How to Sell: LOI |

## Tone & voice principles

- **Specific over vague:** "$3.4M" beats "a lot of money"; "an HVAC company in Tampa" beats "a service business"
- **Tactical over inspirational:** every email leaves the reader knowing one thing they can act on
- **Short paragraphs:** 1-3 sentences each; mobile-first
- **One idea per email:** depth over breadth
- **Soft CTA at the end:** link to free valuation funnel, but don't push
- **Use the deep-link with UTMs:** `https://sellyourbusiness.com/funnel?utm_source=newsletter&utm_medium=email&utm_campaign=nurture-week-N`

## Updating

If you change a pillar article and want the email to reflect it, the link in each email is to the pillar — the email itself is a standalone digest. Update the email content if needed, but the link will keep working.
