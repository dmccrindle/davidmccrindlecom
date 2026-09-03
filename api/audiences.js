// Audience config CRUD -- stored in Upstash Redis
// Each audience: { name, intro, projects: [slug, ...] }
// Redis key: audience:<name>  (set of fields via JSON string)
// Index key: audience_index   (list of names)

async function upstash(cmd) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash not configured');
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const json = await r.json();
  return json.result;
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
  // GET /api/audiences?viewer=<name>  -- public, returns config for a viewer (portfolio use)
  if (req.method === 'GET' && req.query.viewer) {
    const name = req.query.viewer.toLowerCase();
    try {
      const raw = await upstash(['GET', `audience:${name}`]);
      if (!raw) return res.status(200).json(null);
      return res.status(200).json(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch (_) {
      return res.status(200).json(null);
    }
  }

  // GET /api/audiences  -- CMS: list all audiences
  if (req.method === 'GET') {
    if (!await verifyCmsToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const names = await upstash(['SMEMBERS', 'audience_index']);
      if (!names || names.length === 0) return res.status(200).json([]);
      const audiences = await Promise.all(
        names.map(async n => {
          const raw = await upstash(['GET', `audience:${n}`]);
          try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
        })
      );
      return res.status(200).json(audiences.filter(Boolean));
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST /api/audiences  -- CMS: create or update an audience
  if (req.method === 'POST') {
    if (!await verifyCmsToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const { name, greeting, intro, projects, highlights } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const key = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const audience = { name: key, greeting: greeting || '', intro: intro || '', projects: projects || [], highlights: highlights || [] };
    try {
      await upstash(['SET', `audience:${key}`, JSON.stringify(audience)]);
      await upstash(['SADD', 'audience_index', key]);
      return res.status(200).json({ ok: true, audience });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE /api/audiences  -- CMS: delete an audience
  if (req.method === 'DELETE') {
    if (!await verifyCmsToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const key = name.toLowerCase();
    try {
      await upstash(['DEL', `audience:${key}`]);
      await upstash(['SREM', 'audience_index', key]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
