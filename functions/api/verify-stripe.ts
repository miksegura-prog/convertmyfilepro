/**
 * Cloudflare Pages Function — verifies Stripe Checkout session.
 *
 * Path: /api/verify-stripe?session_id=cs_xxx
 * Environment: STRIPE_SECRET_KEY must be set in Cloudflare Pages dashboard.
 */

export interface Env {
  STRIPE_SECRET_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const request = context.request;
  const env = context.env;

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
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
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

    const session: any = await stripeResponse.json();

    // Verify that the payment was successful
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment has not been completed.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate expiration: 1 year from session creation
    const expiresAt = (session.created + 365 * 24 * 60 * 60) * 1000;

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
};
