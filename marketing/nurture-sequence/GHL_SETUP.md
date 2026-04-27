# GoHighLevel Setup — 10-Week Nurture Drip

This is the recommended setup. Subscribers go from the website → `/api/subscribe` → GHL Inbound Webhook → contact created in GHL → 10-week drip starts immediately from their signup time (true drip, not weekly broadcast).

## One-time setup (~30 minutes)

### Step 1 — Create the inbound webhook in GHL

1. In your GHL sub-account, go to **Automation → Workflows → Create Workflow**
2. Name: `Newsletter Nurture — 10 Week Drip`
3. Add trigger: **Inbound Webhook**
4. Save the workflow as a draft — GHL will reveal a webhook URL
5. Copy the webhook URL (looks like `https://services.leadconnectorhq.com/hooks/<id>/webhook-trigger/<token>`)

### Step 2 — Wire the webhook into Vercel

In Vercel → your project → Settings → Environment Variables, add:

| Variable | Value | Environments |
|----------|-------|--------------|
| `GHL_WEBHOOK_URL` | (the webhook URL from step 1) | Production + Preview |

Redeploy (any push to `main` works, or just trigger one).

### Step 3 — Map the webhook payload to a GHL contact

The `/api/subscribe` endpoint posts JSON like this to your webhook:

```json
{
  "email": "owner@example.com",
  "firstName": "Jane",
  "source": "spoke-article",
  "tags": ["newsletter", "nurture-active", "source-spoke-article"],
  "customData": {
    "subscriberSource": "spoke-article",
    "context": "How to Prepare Your Business for Sale",
    "utm_source": "instagram",
    "utm_medium": "paid-social",
    "utm_campaign": "summer-2026"
  }
}
```

In your GHL workflow, after the Inbound Webhook trigger, add these actions in order:

1. **Add/Update Contact**
   - Email → `{{inboundWebhookRequest.email}}`
   - First Name → `{{inboundWebhookRequest.firstName}}`
   - Source → `{{inboundWebhookRequest.source}}`

2. **Add Contact Tag** (one or more — GHL accepts a comma list, or add multiple tag actions)
   - `newsletter`
   - `nurture-active`
   - `{{inboundWebhookRequest.source}}` (e.g. `spoke-article`)

3. **Update Custom Field** — capture UTMs for attribution
   - `utm_source` → `{{inboundWebhookRequest.customData.utm_source}}`
   - `utm_medium` → `{{inboundWebhookRequest.customData.utm_medium}}`
   - `utm_campaign` → `{{inboundWebhookRequest.customData.utm_campaign}}`

### Step 4 — Build the 10-step drip

After the contact actions, add this sequence. Each email step uses one of the HTML files in `marketing/nurture-sequence/`.

```
[Webhook trigger]
   ↓
[Add/Update Contact]
   ↓
[Add Tags: newsletter, nurture-active]
   ↓
[Send Email]  ← 01-week-1-welcome.html         ─ delay: 5 minutes
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 02-week-2-sde.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 03-week-3-multiples.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 04-week-4-ebitda-vs-sde.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 05-week-5-add-backs.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 06-week-6-increase-value.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 07-week-7-when-to-sell.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 08-week-8-prepare.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 09-week-9-broker-vs-diy.html
   ↓
[Wait 7 days]
   ↓
[Send Email]  ← 10-week-10-loi.html
   ↓
[Add Tag: nurture-completed]
[Remove Tag: nurture-active]
```

**For each "Send Email" step:**
1. Click the step → choose **Send Email**
2. From: `John Matsis <john@yourdomain>` (whichever sending domain you have verified in GHL)
3. Reply-to: `john.matsis@hedgestone.com`
4. Subject: paste the `SUBJECT:` line from the file's top comment
5. Preview text: paste the `PREVIEW:` line
6. Body: switch the email editor to **HTML mode** and paste everything below the closing `-->` of the comment block
7. Save

**Tip:** GHL supports merge fields like `{{contact.first_name}}`. The HTML files use `{{{FIRST_NAME|there}}}` (Resend syntax). Find-and-replace `{{{FIRST_NAME|there}}}` → `{{contact.first_name | default: "there"}}` (or GHL's exact equivalent — check your tenant's docs) once you paste each one.

### Step 5 — Activate the workflow

1. Toggle the workflow from **Draft** to **Published**
2. Add yourself to the audience by submitting the form on a hub page (e.g. /how-to-sell-a-business). You should receive Week 1 within 5 minutes.

## What to watch in production

- **Notification email to John** — `/api/subscribe` sends a summary email to john.matsis@hedgestone.com on every signup. The "GHL Drip" row should say `started` (200 OK from the webhook). If it says `❌ failed`, check Vercel runtime logs and GHL workflow logs.
- **Resend Audience as backup** — subscribers also flow into Resend so you have a redundant list. If you ever migrate off GHL, the list survives.
- **GHL workflow execution log** — in GHL, open the workflow → **Execution Logs** to see each subscriber's path through the steps.

## Edits later

- **Updating an email's content:** edit the `Send Email` step in the workflow directly in GHL. The HTML files in this repo are the canonical source — keep them as your "source of truth" copy and re-paste into GHL when you change them.
- **Adjusting timing:** edit any `Wait` step (e.g. shorten Week 8 → 9 to 5 days if you want a faster ramp).
- **Tagging converters:** add a workflow listener for the Lead conversion event (or use GHL's built-in Lead trigger) → remove the `nurture-active` tag → optionally end the drip early so qualified leads don't keep getting nurture emails after they've already converted.

## Why this setup beats the alternatives

| Approach | Drip starts when? | Per-subscriber timing? | Easy to edit? | Owns the contact record? |
|----------|-------------------|------------------------|---------------|--------------------------|
| Resend Broadcasts (what we built first) | At your scheduled time | ❌ everyone gets the same email same day | ⚠️ via dashboard only | ❌ list only |
| **GHL Workflow (this)** | **Day 0 from signup** | **✅ true drip** | **✅ in one place** | **✅ full CRM** |

The Resend scheduler script we built earlier is still useful — it's the right tool for **one-off broadcasts to your full list** (a market update, a deal announcement, a new article). It just isn't the right tool for new-subscriber drip.
