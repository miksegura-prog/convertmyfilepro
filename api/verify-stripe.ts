import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = request.query;

  if (!session_id || typeof session_id !== 'string') {
    return response.status(400).json({ error: 'Missing session_id parameter' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return response.status(500).json({ error: 'Stripe secret key not configured' });
  }

  try {
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text();
      console.error('Stripe API error:', stripeResponse.status, errorBody);
      return response.status(400).json({
        success: false,
        error: 'Invalid session or payment not completed.',
      });
    }

    const session = await stripeResponse.json();

    // Verify that the payment was successful
    if (session.payment_status !== 'paid') {
      return response.status(400).json({
        success: false,
        error: 'Payment has not been completed.',
      });
    }

    // Calculate expiration: 1 year from session creation
    const expiresAt = (session.created + 365 * 24 * 60 * 60) * 1000;

    return response.status(200).json({
      success: true,
      sessionId: session.id,
      customerEmail: session.customer_details?.email || null,
      expiresAt,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (error) {
    console.error('Stripe verification error:', error);
    return response.status(500).json({
      success: false,
      error: 'Failed to verify payment session.',
    });
  }
}
