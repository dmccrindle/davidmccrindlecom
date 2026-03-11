export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Say Hi <noreply@davidmccrindle.com>',
      to: 'david@davidmccrindle.com',
      reply_to: email,
      subject: `New message from ${name}`,
      html: `
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Resend error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }

  return res.status(200).json({ ok: true });
}
