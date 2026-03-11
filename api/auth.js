import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password, scope } = req.body;

  if (!['portfolio', 'cms'].includes(scope)) {
    return res.status(400).json({ error: 'Invalid scope' });
  }

  const expectedPassword = scope === 'portfolio'
    ? process.env.PORTFOLIO_PASSWORD
    : process.env.CMS_PASSWORD;
  const secret = scope === 'portfolio'
    ? process.env.PORTFOLIO_SECRET
    : process.env.CMS_SECRET;

  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  const token = crypto.createHmac('sha256', secret)
    .update(scope + ':authenticated')
    .digest('hex');

  res.setHeader('Set-Cookie',
    `${scope}_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`
  );
  return res.status(200).json({ ok: true });
}
