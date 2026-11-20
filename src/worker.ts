import { handleOwnerOrBetaApi, type OwnerEnv } from './owner/owner-api';
import { handleIncomingMail, type IncomingEmailMessage, type IncomingMailEnv } from './owner/incoming-email';

/**
 * Cloudflare Worker entry point — serves static assets from ./dist
 * and handles the /api/verify-stripe endpoint.
 *
 * The [assets] block in wrangler.toml handles static file serving.
 * This Worker intercepts only /api/* routes.
 */

export interface Env extends OwnerEnv, IncomingMailEnv {
  STRIPE_SECRET_KEY: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
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
  // Email Routing only calls this handler if the info@ rule is manually switched
  // to the Worker. Until then, the current Gmail forwarding remains unchanged.
  async email(message: IncomingEmailMessage, env: Env): Promise<void> {
    await handleIncomingMail(message, env);
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const protectedApiResponse = await handleOwnerOrBetaApi(request, env);
    if (protectedApiResponse) return protectedApiResponse;

    // Handle /api/verify-stripe route
    if (url.pathname === '/api/verify-stripe') {
      return handleVerifyStripe(request, env);
    }

    // Forward static files and client-side routes to the configured assets binding.
    const staticResponse = await env.ASSETS.fetch(request);
    if (url.pathname === '/owner' || url.pathname.startsWith('/owner/') ||
        url.pathname === '/invite' || url.pathname.startsWith('/invite/')) {
      const headers = new Headers(staticResponse.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      headers.set('Referrer-Policy', 'no-referrer');
      headers.set('Cache-Control', 'private, no-store');
      return new Response(staticResponse.body, { status: staticResponse.status, headers });
    }
    return staticResponse;
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
