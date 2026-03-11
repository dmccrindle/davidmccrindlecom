export const config = {
  matcher: ['/experience/portfolio/:path*', '/cms/:path*'],
};

async function verifyToken(token, secret, scope) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(scope + ':authenticated'));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return token === expected;
}

function getCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  const match = header.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  let scope, secret, tokenName;
  if (path.startsWith('/experience/portfolio')) {
    scope = 'portfolio';
    secret = process.env.PORTFOLIO_SECRET;
    tokenName = 'portfolio_token';
  } else {
    scope = 'cms';
    secret = process.env.CMS_SECRET;
    tokenName = 'cms_token';
  }

  const token = getCookie(req, tokenName);
  if (token && secret && await verifyToken(token, secret, scope)) {
    return; // valid cookie — pass through
  }

  const loginUrl = new URL('/login/', req.url);
  loginUrl.searchParams.set('redirect', path);
  return Response.redirect(loginUrl);
}
