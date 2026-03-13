export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const scope = req.body?.scope || 'portfolio';
  res.setHeader('Set-Cookie',
    `${scope}_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
  return res.status(200).json({ ok: true });
}
