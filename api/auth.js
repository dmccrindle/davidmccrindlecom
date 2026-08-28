import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password, scope } = req.body;

  if (!['portfolio', 'cms'].includes(scope)) {
    return res.status(400).json({ error: 'Invalid scope' });
  }

  // CMS: single password, unchanged
  if (scope === 'cms') {
    if (!password || password !== process.env.CMS_PASSWORD) {
      return res.status(401).json({ error: 'Wrong password' });
    }
    const token = crypto.createHmac('sha256', process.env.CMS_SECRET)
      .update('cms:authenticated')
      .digest('hex');
    res.setHeader('Set-Cookie',
      `cms_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`
    );
    return res.status(200).json({ ok: true });
  }

  // Portfolio: check named passwords PORTFOLIO_PASSWORD_<NAME>=<value>
  // Falls back to legacy PORTFOLIO_PASSWORD for any existing links
  let viewerName = null;

  for (const [key, val] of Object.entries(process.env)) {
    if (key.startsWith('PORTFOLIO_PASSWORD_') && val === password) {
      viewerName = key.replace('PORTFOLIO_PASSWORD_', '').toLowerCase();
      break;
    }
  }
  if (!viewerName && process.env.PORTFOLIO_PASSWORD === password) {
    viewerName = 'default';
  }

  if (!viewerName) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  const token = crypto.createHmac('sha256', process.env.PORTFOLIO_SECRET)
    .update('portfolio:authenticated')
    .digest('hex');

  const base = 'Secure; SameSite=Strict; Path=/; Max-Age=86400';
  res.setHeader('Set-Cookie', [
    `portfolio_token=${token}; HttpOnly; ${base}`,
    // Not HttpOnly so the portfolio JS can read it for tracking
    `portfolio_viewer=${viewerName}; ${base}`,
  ]);

  // Log + notify
  await Promise.all([
    logEvent({ event: 'login', viewer: viewerName, project: null, ua: req.headers['user-agent'] }),
    sendLoginEmail(viewerName, req.headers['user-agent'] || ''),
  ]);

  return res.status(200).json({ ok: true, viewer: viewerName });
}

async function sendLoginEmail(viewer, ua) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const time = new Date().toUTCString();
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Portfolio <noreply@davidmccrindle.com>',
        to: 'davidmccrindle@mac.com',
        subject: `${viewer} just logged into your portfolio`,
        html: `
          <p style="font-family:system-ui;font-size:15px">
            <strong>${viewer}</strong> logged in at ${time}.
          </p>
          <p style="font-family:system-ui;font-size:13px;color:#999">${ua.substring(0, 120)}</p>
        `,
      }),
    });
  } catch (_) {}
}

async function logEvent({ event, viewer, project, ua }) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    viewer: viewer || 'unknown',
    project: project || null,
    ua: (ua || '').substring(0, 100),
  });

  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LPUSH', 'portfolio_events', entry]),
    });
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LTRIM', 'portfolio_events', 0, 999]),
    });
  } catch (_) {}
}
