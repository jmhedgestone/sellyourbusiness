// Newsletter subscribe endpoint.
// - Stores the contact in a Resend Audience if RESEND_AUDIENCE_ID is set
// - Always sends a notification email to John so no leads get lost
// - Captures UTMs for attribution
// - Verifies Cloudflare Turnstile when a token is provided (optional — the
//   newsletter form is lower-friction than the full lead form, so we accept
//   submissions without Turnstile but log them as "unverified")

import { Resend } from 'resend';

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstile(token) {
  if (!token) return { skipped: true };
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET, response: token }),
    });
    const data = await res.json();
    return { ok: !!data.success, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const email = (body.email || '').trim().toLowerCase();
  const firstName = (body.firstName || '').trim();
  const source = (body.source || '').trim() || 'unknown';
  const utms = (body.utms && typeof body.utms === 'object') ? body.utms : {};

  if (!isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Optional Turnstile check — accept submissions without it, but track verified state.
  const turnstile = await verifyTurnstile(body['cf-turnstile-response']);

  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  // 1) Add to Resend Audience (the durable list — used for nurture sequences).
  let audienceResult = { skipped: 'no audience id' };
  if (audienceId) {
    try {
      const r = await resend.contacts.create({
        email,
        firstName: firstName || undefined,
        unsubscribed: false,
        audienceId,
      });
      audienceResult = r;
    } catch (err) {
      // Resend returns 422 for duplicates — that's fine, treat as success.
      const msg = String(err && err.message || err);
      audienceResult = msg.includes('already exists') || msg.includes('422')
        ? { ok: true, duplicate: true }
        : { ok: false, error: msg };
    }
  }

  // 2) Notify John so leads aren't dependent on the audience integration.
  try {
    const utmLines = Object.entries(utms)
      .filter(([_, v]) => v)
      .map(([k, v]) => `<tr><td style="padding:4px 12px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">${k}</td><td style="padding:4px 12px;font-size:13px;">${v}</td></tr>`)
      .join('');

    await resend.emails.send({
      from:     'SellYourBusiness.com <noreply@sellyourbusiness.com>',
      to:       'john.matsis@hedgestone.com',
      reply_to: email,
      subject:  `New newsletter subscriber: ${email}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2db87f;margin-bottom:8px;">New Newsletter Subscriber</div>
          <h2 style="margin:0 0 4px;font-size:20px;color:#0d1117;">${firstName || '(no name)'}</h2>
          <p style="margin:0 0 16px;color:#374151;"><a href="mailto:${email}" style="color:#2db87f;">${email}</a></p>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;">
            <tr><td style="padding:8px 12px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Source</td><td style="padding:8px 12px;font-size:13px;">${source}</td></tr>
            ${utmLines}
            <tr><td style="padding:8px 12px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Audience</td><td style="padding:8px 12px;font-size:13px;">${audienceId ? (audienceResult.duplicate ? 'duplicate' : 'added') : 'not configured'}</td></tr>
            <tr><td style="padding:8px 12px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Captcha</td><td style="padding:8px 12px;font-size:13px;">${turnstile.skipped ? 'not provided' : (turnstile.ok ? 'verified' : 'failed')}</td></tr>
          </table>
        </div>`,
    });
  } catch (err) {
    console.error('Notification email failed:', err);
  }

  return res.status(200).json({ ok: true });
}
