const KEY = 'portfolio_events';

async function upstash(cmd) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash not configured');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: controller.signal,
    });
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

function getCookie(req, name) {
  const header = req.headers['cookie'] || '';
  const m = header.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

async function verifyCmsToken(req) {
  const token  = getCookie(req, 'cms_token');
  const secret = process.env.CMS_SECRET;
  if (!token || !secret) return false;
  const { createHmac } = await import('crypto');
  const expected = createHmac('sha256', secret).update('cms:authenticated').digest('hex');
  return token === expected;
}

export default async function handler(req, res) {
  if (!(await verifyCmsToken(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'DELETE') {
    await upstash(['DEL', KEY]);
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).end();

  let events = [];
  try {
    const data = await upstash(['LRANGE', KEY, 0, 999]);
    events = (data?.result || []).map(e => {
      try { return typeof e === 'string' ? JSON.parse(e) : e; } catch { return null; }
    }).filter(Boolean);
  } catch (_) {}

  return res.status(200).json(events);
}
