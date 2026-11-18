/**
 * Cloudflare Worker entry point — serves static assets from ./dist
 * and handles the /api/verify-stripe endpoint.
 *
 * The [assets] block in wrangler.toml handles static file serving.
 * This Worker intercepts only /api/* routes.
 */

export interface Env {
  STRIPE_SECRET_KEY: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
  /**
   * OWNER BETA (experimental). Todas son opcionales: si falta cualquiera de
   * las tres primeras, /api/owner-status responde owner: false. En producción
   * NO deben configurarse, de modo que OWNER queda desactivado por defecto.
   */
  OWNER_BETA_ENABLED?: string;          // 'true' para habilitar el endpoint
  OWNER_ACCESS_TEAM_DOMAIN?: string;    // p. ej. 'miteam.cloudflareaccess.com'
  OWNER_ACCESS_AUD?: string;            // Application Audience (AUD) tag de Access
  OWNER_EMAILS?: string;                // allowlist opcional, separada por comas
}

/**
 * Precio anual verificado en Stripe: 5,99 EUR/año, producto
 * «ConvertMyFilePro PRO (Annual / Anual)». Se usa para no activar PRO con
 * sesiones pagadas de otros productos de la misma cuenta de Stripe.
 */
const PRO_PRICE_ID = 'price_1UanG9FA6QOCRduX1ERV4nPj';
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

interface StripeSubscription {
  current_period_end?: number;
  items?: { data?: Array<{ current_period_end?: number }> };
}

interface StripeCheckoutSession {
  id: string;
  created: number;
  status?: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: { email?: string | null } | null;
  subscription?: string | StripeSubscription | null;
  line_items?: { data?: Array<{ price?: { id?: string } | null }> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle /api/verify-stripe route
    if (url.pathname === '/api/verify-stripe') {
      return handleVerifyStripe(request, env);
    }

    // OWNER BETA (experimental): identidad verificada por Cloudflare Access.
    if (url.pathname === '/api/owner-status') {
      return handleOwnerStatus(request, env);
    }

    // Forward static files and client-side routes to the configured assets binding.
    return env.ASSETS.fetch(request);
  },
};

async function handleVerifyStripe(request: Request, env: Env): Promise<Response> {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing session_id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stripeSecretKey = env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items&expand[]=subscription`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text();
      console.error('Stripe API error:', stripeResponse.status, errorBody);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid session or payment not completed.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const session = (await stripeResponse.json()) as StripeCheckoutSession;

    // Verify that the payment was successful
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment has not been completed.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify that the paid session belongs to the ConvertMyFilePro PRO price.
    const lineItems = session.line_items?.data || [];
    const isProPurchase = lineItems.some((item) => item?.price?.id === PRO_PRICE_ID);

    if (!isProPurchase) {
      return new Response(
        JSON.stringify({ success: false, error: 'This payment is not for ConvertMyFilePro PRO.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Duration: current subscription period when available (annual), otherwise
    // 1 year from checkout creation. Stripe controls the subscription dates.
    const subscription = session.subscription;
    const subscriptionPeriodEnd =
      (subscription && typeof subscription === 'object' &&
        (subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end)) ||
      null;
    const expiresAt = subscriptionPeriodEnd
      ? subscriptionPeriodEnd * 1000
      : (session.created + ONE_YEAR_SECONDS) * 1000;

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        customerEmail: session.customer_details?.email || null,
        expiresAt,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Stripe verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to verify payment session.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/* ==========================================================================
 * OWNER BETA (experimental)
 *
 * El navegador nunca declara quién es. El Worker recibe el JWT que Cloudflare
 * Access inyecta (`Cf-Access-Jwt-Assertion`), comprueba su firma RS256 con las
 * claves públicas del equipo de Access, valida `aud`, `iss` y caducidad, y solo
 * entonces responde `owner: true`. Sin variables OWNER_* configuradas, el
 * endpoint devuelve 404 `{ owner: false }` (producción queda apagado).
 * ========================================================================== */

const OWNER_CERTS_TTL_MS = 60 * 60 * 1000;

interface AccessClaims {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  iss?: string;
  sub?: string;
}

let accessCertsCache: {
  teamDomain: string;
  fetchedAt: number;
  keys: Record<string, JsonWebKey>;
} | null = null;

function ownerJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function decodeJwtSegment<T>(segment: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
  } catch {
    return null;
  }
}

async function getAccessKeys(teamDomain: string): Promise<Record<string, JsonWebKey>> {
  const now = Date.now();
  if (
    accessCertsCache &&
    accessCertsCache.teamDomain === teamDomain &&
    now - accessCertsCache.fetchedAt < OWNER_CERTS_TTL_MS
  ) {
    return accessCertsCache.keys;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new Error(`Cloudflare Access certs request failed (${response.status})`);
  }

  const payload = (await response.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
  const keys: Record<string, JsonWebKey> = {};
  for (const key of payload.keys || []) {
    if (key.kid) keys[key.kid] = key;
  }

  accessCertsCache = { teamDomain, fetchedAt: now, keys };
  return keys;
}

async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  audience: string
): Promise<AccessClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = decodeJwtSegment<{ alg?: string; kid?: string }>(parts[0]);
  const claims = decodeJwtSegment<AccessClaims>(parts[1]);
  if (!header || !claims || header.alg !== 'RS256' || !header.kid) return null;

  const keys = await getAccessKeys(teamDomain);
  const jwk = keys[header.kid];
  if (!jwk) return null;

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!signatureValid) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const leeway = 60;
  if (typeof claims.exp !== 'number' || claims.exp + leeway < nowSeconds) return null;
  if (typeof claims.nbf === 'number' && claims.nbf - leeway > nowSeconds) return null;
  if (claims.iss && claims.iss !== `https://${teamDomain}`) return null;

  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (!audiences.includes(audience)) return null;

  return claims;
}

async function handleOwnerStatus(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return ownerJson({ owner: false, error: 'Method not allowed' }, 405);
  }

  // Apagado por defecto: sin configuración explícita no existe OWNER BETA.
  if (env.OWNER_BETA_ENABLED !== 'true') {
    return ownerJson({ owner: false }, 404);
  }

  const teamDomain = (env.OWNER_ACCESS_TEAM_DOMAIN || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  const audience = (env.OWNER_ACCESS_AUD || '').trim();

  if (!teamDomain || !audience) {
    console.warn('OWNER BETA enabled without Access team domain/AUD; denying access.');
    return ownerJson({ owner: false }, 404);
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return ownerJson({ owner: false, error: 'Missing Cloudflare Access token' }, 401);
  }

  try {
    const claims = await verifyAccessJwt(token, teamDomain, audience);
    if (!claims) {
      return ownerJson({ owner: false, error: 'Invalid Cloudflare Access token' }, 403);
    }

    const allowlist = (env.OWNER_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const email = (claims.email || '').toLowerCase();

    if (allowlist.length > 0 && (!email || !allowlist.includes(email))) {
      return ownerJson({ owner: false, error: 'Identity not allowed' }, 403);
    }

    return ownerJson({ owner: true, email: claims.email || null });
  } catch (error) {
    console.error('Owner beta verification error:', error);
    return ownerJson({ owner: false, error: 'Owner beta verification failed' }, 500);
  }
}

