/**
 * Owner (real, production) + 90-day Pro Beta invitations.
 *
 * Access to /api/owner/* requires a valid Cloudflare Access JWT signed for the
 * OWNER application AND a configured, nonempty owner email allowlist.
 * Invite redemption uses a one-use bearer token and creates an HttpOnly session.
 * Tokens are stored in D1 only as SHA-256 hashes; file contents are never stored.
 */
export interface D1Statement {
  bind(...args: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}
export interface D1Binding {
  prepare(sql: string): D1Statement;
}
export interface OwnerEnv {
  DB?: D1Binding;
  OWNER_ACCESS_TEAM_DOMAIN?: string;
  OWNER_ACCESS_AUD?: string;
  OWNER_EMAILS?: string;
  OWNER_SESSION_SECRET?: string;
}

type Claims = { aud?: string | string[]; email?: string; exp?: number; nbf?: number; iss?: string };
type Invite = {
  id: string; email: string; note: string | null; created_at: number;
  redeemed_at: number | null; expires_at: number | null; revoked_at: number | null;
};
const DAY = 86_400_000;
const OWNER_TTL = DAY;
const BETA_TTL = 90 * DAY;
const INVITE_REDEEM_TTL = 14 * DAY;
const OWNER_COOKIE = 'cmfp_owner_v1';
const BETA_COOKIE = 'cmfp_beta_v1';

const json = (body: unknown, status = 200, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status, headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });

function cookies(request: Request): Record<string, string> {
  return Object.fromEntries(
    (request.headers.get('cookie') || '').split(';').map(item => {
      const i = item.indexOf('=');
      return i < 0 ? ['', ''] : [item.slice(0, i).trim(), item.slice(i + 1).trim()];
    }).filter(([key]) => !!key)
  );
}
function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64Url(bytes);
}
function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(s: string): ArrayBuffer {
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  const buffer = new ArrayBuffer(decoded.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
  return buffer;
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function hmac(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function createOwnerSession(email: string, env: OwnerEnv): Promise<string> {
  if (!env.OWNER_SESSION_SECRET || env.OWNER_SESSION_SECRET.length < 32) {
    throw new Error('Missing or short OWNER_SESSION_SECRET');
  }
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    email, exp: Date.now() + OWNER_TTL,
  })));
  const signature = await crypto.subtle.sign('HMAC', await hmac(env.OWNER_SESSION_SECRET),
    new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}
async function isOwnerSession(request: Request, env: OwnerEnv): Promise<boolean> {
  if (!env.OWNER_SESSION_SECRET || env.OWNER_SESSION_SECRET.length < 32) return false;
  const token = cookies(request)[OWNER_COOKIE];
  if (!token || token.length > 2048) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmac(env.OWNER_SESSION_SECRET),
      fromBase64Url(parts[1]), new TextEncoder().encode(parts[0]));
    if (!ok) return false;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as {
      email?: string; exp?: number;
    };
    const allowlist = (env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return allowlist.length > 0 && !!data.email && allowlist.includes(data.email.toLowerCase()) &&
      typeof data.exp === 'number' && data.exp > Date.now();
  } catch { return false; }
}

let certCache: { domain: string; until: number; keys: Record<string, JsonWebKey> } | null = null;
async function verifyAccess(request: Request, env: OwnerEnv): Promise<string | null> {
  const domain = (env.OWNER_ACCESS_TEAM_DOMAIN || '').trim()
    .replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  const audience = (env.OWNER_ACCESS_AUD || '').trim();
  const allowed = (env.OWNER_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!domain.endsWith('.cloudflareaccess.com') || !audience || allowed.length === 0) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16_384) return null;
  try {
    const [h, p, signature, extra] = token.split('.');
    if (!h || !p || !signature || extra) return null;
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(h))) as { kid?: string; alg?: string };
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(p))) as Claims;
    if (header.alg !== 'RS256' || !header.kid) return null;
    if (!certCache || certCache.domain !== domain || certCache.until < Date.now()) {
      const response = await fetch(`https://${domain}/cdn-cgi/access/certs`);
      if (!response.ok) return null;
      const certs = await response.json() as { keys?: Array<JsonWebKey & { kid?: string }> };
      const keys: Record<string, JsonWebKey> = {};
      for (const key of certs.keys || []) if (key.kid) keys[key.kid] = key;
      certCache = { domain, until: Date.now() + 60 * 60_000, keys };
    }
    const jwk = certCache.keys[header.kid];
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key,
      fromBase64Url(signature), new TextEncoder().encode(`${h}.${p}`));
    if (!valid) return null;
    const now = Math.floor(Date.now() / 1000);
    const auds = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    if (claims.iss !== `https://${domain}` || !auds.includes(audience) ||
      !claims.email || !allowed.includes(claims.email.toLowerCase()) ||
      typeof claims.exp !== 'number' || claims.exp < now ||
      (typeof claims.nbf === 'number' && claims.nbf > now + 60)) return null;
    return claims.email.toLowerCase();
  } catch (error) {
    console.error('Owner JWT validation failed', error);
    return null;
  }
}

async function betaStatus(request: Request, env: OwnerEnv): Promise<{ active: boolean; expiresAt: number | null }> {
  const token = cookies(request)[BETA_COOKIE];
  if (!env.DB || !token || !/^[a-zA-Z0-9_-]{40,64}$/.test(token)) {
    return { active: false, expiresAt: null };
  }
  const hash = await sha256(token);
  const row = await env.DB.prepare(
    'SELECT expires_at FROM pro_beta_invites WHERE session_hash = ? AND revoked_at IS NULL AND expires_at > ?'
  ).bind(hash, Date.now()).first<{ expires_at: number }>();
  return { active: !!row, expiresAt: row?.expires_at ?? null };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 8192 || !request.headers.get('content-type')?.includes('application/json')) return null;
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown> : null;
  } catch { return null; }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function handleOwnerOrBetaApi(request: Request, env: OwnerEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith('/api/owner/') && !path.startsWith('/api/pro-beta/')) return null;
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
  if (request.method === 'POST' && !sameOrigin(request)) return json({ error: 'Invalid origin' }, 403);

  if (path === '/api/pro-beta/status' && request.method === 'GET') {
    try {
      const [owner, beta] = await Promise.all([isOwnerSession(request, env), betaStatus(request, env)]);
      return json({ owner, beta: beta.active, expiresAt: beta.expiresAt });
    } catch (error) {
      console.error('Pro access status failed', error);
      return json({ owner: false, beta: false, expiresAt: null }, 503);
    }
  }
  if (path === '/api/pro-beta/redeem' && request.method === 'POST') {
    if (!env.DB) return json({ error: 'Beta invitations are not configured' }, 503);
    const body = await readJson(request);
    const token = body?.token;
    if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{40,64}$/.test(token)) {
      return json({ error: 'Invalid invitation' }, 400);
    }
    const time = Date.now();
    const session = randomToken();
    const result = await env.DB.prepare(
      `UPDATE pro_beta_invites SET redeemed_at = ?, expires_at = ?, session_hash = ?
       WHERE token_hash = ? AND redeemed_at IS NULL AND revoked_at IS NULL AND created_at > ?`
    ).bind(time, time + BETA_TTL, await sha256(session), await sha256(token), time - INVITE_REDEEM_TTL).run();
    if (result.meta?.changes !== 1) return json({ error: 'Invitation expired or already used' }, 410);
    return json({ success: true, expiresAt: time + BETA_TTL }, 200, {
      'Set-Cookie': setCookie(BETA_COOKIE, session, Math.floor(BETA_TTL / 1000)),
    });
  }
  if (!path.startsWith('/api/owner/')) return json({ error: 'Not found' }, 404);

  // Always require a fresh Access JWT for admin requests; signed owner cookie
  // only unlocks Pro tools on public pages and NEVER authorizes administration.
  const ownerEmail = await verifyAccess(request, env);
  if (!ownerEmail) return json({ owner: false, error: 'Forbidden' }, 403);
  if (path === '/api/owner/status' && request.method === 'GET') {
    try {
      const cookie = await createOwnerSession(ownerEmail, env);
      return json({ owner: true, email: ownerEmail, databaseReady: !!env.DB }, 200, {
        'Set-Cookie': setCookie(OWNER_COOKIE, cookie, Math.floor(OWNER_TTL / 1000)),
      });
    } catch { return json({ error: 'OWNER_SESSION_SECRET is not configured' }, 503); }
  }
  if (!env.DB) return json({ error: 'D1 database is not bound' }, 503);
  if (path === '/api/owner/invitations' && request.method === 'GET') {
    const items = await env.DB.prepare(
      `SELECT id, email, note, created_at, redeemed_at, expires_at, revoked_at
       FROM pro_beta_invites ORDER BY created_at DESC LIMIT 100`
    ).all<Invite>();
    return json({ invitations: items.results });
  }
  if (path === '/api/owner/invitations' && request.method === 'POST') {
    const body = await readJson(request);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : '';
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Valid email required' }, 400);
    }
    const token = randomToken();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO pro_beta_invites
       (id, email, note, token_hash, created_at, redeemed_at, expires_at, revoked_at, session_hash)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`
    ).bind(id, email, note || null, await sha256(token), Date.now()).run();
    // Raw token is returned exactly once; subsequent list requests only show metadata.
    return json({
      success: true, id, email,
      url: `${url.origin}/invite/${token}`,
      durationDays: 90, redeemWithinDays: 14,
    }, 201);
  }
  if (path === '/api/owner/invitations/revoke' && request.method === 'POST') {
    const body = await readJson(request);
    const id = body?.id;
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid ID' }, 400);
    const result = await env.DB.prepare(
      'UPDATE pro_beta_invites SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL'
    ).bind(Date.now(), id).run();
    return json({ success: result.meta?.changes === 1 }, result.meta?.changes === 1 ? 200 : 404);
  }
  return json({ error: 'Not found' }, 404);
}
