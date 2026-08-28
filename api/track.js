const KEY = 'portfolio_events';

async function upstash(cmd) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  return r.json();
}

export default async function handler(req, res) {

  // POST: log an event from the portfolio JS
  if (req.method === 'POST') {
    const { event, project, viewer } = req.body || {};
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      event: event || 'view',
      viewer: viewer || 'unknown',
      project: project || null,
      ua: (req.headers['user-agent'] || '').substring(0, 100),
    });
    try {
      await upstash(['LPUSH', KEY, entry]);
      await upstash(['LTRIM', KEY, 0, 999]);
    } catch (_) {}
    return res.status(200).json({ ok: true });
  }

  // GET: view events (protected by TRACK_SECRET)
  if (req.method === 'GET') {
    const { secret, format, clear } = req.query;
    const trackSecret = process.env.TRACK_SECRET;
    if (!trackSecret || secret !== trackSecret) {
      return res.status(401).end('Unauthorized');
    }

    if (!process.env.UPSTASH_REDIS_REST_URL) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<p style="font-family:system-ui;padding:40px">Upstash env vars not set (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).</p>');
    }

    if (clear === '1') {
      await upstash(['DEL', KEY]);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<p style="font-family:system-ui;padding:40px">Log cleared. <a href="javascript:history.back()">Back</a></p>');
    }

    let events = [];
    try {
      const data = await upstash(['LRANGE', KEY, 0, 999]);
      events = (data?.result || []).map(e => {
        try { return typeof e === 'string' ? JSON.parse(e) : e; } catch { return null; }
      }).filter(Boolean);
    } catch (_) {}

    if (format === 'html') {
      const byViewer = {};
      for (const e of events) {
        const v = e.viewer || 'unknown';
        if (!byViewer[v]) byViewer[v] = [];
        byViewer[v].push(e);
      }

      const th = 'text-align:left;padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#999;border-bottom:1px solid #eee';

      const viewerBlocks = Object.entries(byViewer).map(([name, evts]) => {
        const rows = evts.map(e => `<tr>
          <td style="color:#999;white-space:nowrap">${(e.ts||'').replace('T',' ').substring(0,19)}</td>
          <td>${e.event||''}</td>
          <td>${e.project || '<span style="color:#ccc">--</span>'}</td>
        </tr>`).join('');
        return `<div style="margin-bottom:40px">
          <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #111">
            ${name} <span style="font-weight:400;color:#999;font-size:13px">(${evts.length} events)</span>
          </h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr>
              <th style="${th}">Time (UTC)</th>
              <th style="${th}">Event</th>
              <th style="${th}">Project</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      }).join('');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Portfolio tracker</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:48px 40px;max-width:860px;margin:0 auto;color:#111}
  h1{font-size:22px;font-weight:800;margin-bottom:8px}
  .meta{font-size:13px;color:#999;margin-bottom:40px}
  tr:hover td{background:#fafafa}
  td{padding:7px 10px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  a{color:#111;font-size:12px}
</style></head><body>
<h1>Portfolio views</h1>
<p class="meta">${events.length} total events &nbsp;|&nbsp;
  <a href="?secret=${secret}&format=html">refresh</a> &nbsp;|&nbsp;
  <a href="?secret=${secret}&format=html&clear=1" onclick="return confirm('Clear all events?')">clear log</a>
</p>
${events.length === 0 ? '<p style="color:#999">No events yet.</p>' : viewerBlocks}
</body></html>`);
    }

    return res.status(200).json(events);
  }

  return res.status(405).end();
}
