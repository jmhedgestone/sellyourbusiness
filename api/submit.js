const { Resend } = require('resend');

const YEARS_LABEL = {
  under1: 'Under 1 year',
  '1to3':  '1 – 3 years',
  '3to5':  '3 – 5 years',
  '5to10': '5 – 10 years',
  over10:  '10+ years',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const d = req.body;

  // Verify Cloudflare Turnstile token
  const token = d['cf-turnstile-response'];
  if (!token) return res.status(400).json({ error: 'Missing captcha token' });

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret:   process.env.TURNSTILE_SECRET,
      response: token,
    }),
  });
  const verifyData = await verify.json();
  if (!verifyData.success) {
    return res.status(400).json({ error: 'Captcha verification failed', details: verifyData['error-codes'] });
  }

  // Send email via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  const yearsLabel = YEARS_LABEL[d.yearsInBusiness] || d.yearsInBusiness;
  const fmt = n => '$' + Number(n).toLocaleString('en-US');

  const { error } = await resend.emails.send({
    from:     'SellYourBusiness.com <noreply@sellyourbusiness.com>',
    to:       'john.matsis@hedgestone.com',
    reply_to: d.ownerEmail,
    subject:  `New Lead: ${d.businessName} (${d.industry})`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0d1117;padding:32px 40px;text-align:center;">
            <img src="https://www.hedgestone.com/wp-content/uploads/2022/07/HedgeStone-logo-sh.svg"
                 alt="HedgStone Business Advisors" height="36"
                 style="display:block;margin:0 auto 16px;" />
            <div style="color:#d4a843;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
              New Business Valuation Lead
            </div>
          </td>
        </tr>

        <!-- Business Info -->
        <tr>
          <td style="padding:32px 40px 0;">
            <h2 style="margin:0 0 4px;font-size:24px;color:#0d1117;">${d.businessName}</h2>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">${d.industry} &bull; ${yearsLabel}</p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;">Gross Revenue</div>
                  <div style="font-size:22px;font-weight:700;color:#0d1117;">${fmt(d.grossRevenue)}</div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;">Net Income / SDE</div>
                  <div style="font-size:22px;font-weight:700;color:#0d1117;">${fmt(d.netIncome)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Details Table -->
        <tr>
          <td style="padding:24px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tr style="background:#ffffff;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;width:40%;">Website</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;">${d.websiteUrl || '—'}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Reason for Selling</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;">${d.reasonForSelling}</td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Preferred Contact</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;">${d.contactMethod}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;">Submitted</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;">${new Date(d.submittedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Owner Contact -->
        <tr>
          <td style="padding:24px 40px 32px;">
            <div style="background:#d4a843;border-radius:8px;padding:20px 24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#0d1117;margin-bottom:8px;">Owner Contact</div>
              <div style="font-size:18px;font-weight:700;color:#0d1117;margin-bottom:4px;">${d.ownerName}</div>
              <div style="font-size:14px;color:#1f2937;">
                <a href="mailto:${d.ownerEmail}" style="color:#1f2937;">${d.ownerEmail}</a>
                &nbsp;&bull;&nbsp;
                <a href="tel:${d.ownerPhone}" style="color:#1f2937;">${d.ownerPhone}</a>
              </div>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Submitted via SellYourBusiness.com &bull; John Matsis &bull; HedgStone Business Advisors
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error });
  }

  return res.status(200).json({ ok: true });
};
