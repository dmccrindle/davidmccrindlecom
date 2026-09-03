// Per-project CMS overrides: bgColor, description
// Stored in Redis as project:<slug> JSON, indexed in project_index set

async function upstash(cmd) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
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
  // GET /api/projects -- public, returns all project overrides (for portfolio page)
  if (req.method === 'GET' && !req.query.slug) {
    try {
      const slugs = await upstash(['SMEMBERS', 'project_index']);
      if (!slugs || slugs.length === 0) return res.status(200).json([]);
      const items = await Promise.all(
        slugs.map(async s => {
          const raw = await upstash(['GET', `project:${s}`]);
          try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
        })
      );
      return res.status(200).json(items.filter(Boolean));
    } catch (e) {
      return res.status(200).json([]);
    }
  }

  // POST /api/projects -- CMS: save project override
  if (req.method === 'POST') {
    if (!await verifyCmsToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const { slug, bgColor, description } = req.body || {};
    if (!slug) return res.status(400).json({ error: 'slug required' });
    const data = { slug, bgColor: bgColor || '', description: description || '' };
    try {
      await upstash(['SET', `project:${slug}`, JSON.stringify(data)]);
      await upstash(['SADD', 'project_index', slug]);
      return res.status(200).json({ ok: true, data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
