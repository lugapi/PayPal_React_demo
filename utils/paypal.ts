/**
 * ⚠️  SANDBOX / DEMO ONLY
 *
 * The CLIENT_SECRET must NEVER be embedded in a mobile app in production.
 * These API calls should go through your own backend (Node, Netlify Functions,
 * Vercel Functions, etc.) which alone holds the secret.
 *
 * See: https://developer.paypal.com/api/rest/
 */

const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? '';

// ⚠️  DEMO ONLY — must be moved to backend in production
const CLIENT_SECRET = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_SECRET ?? '';

export async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function createPayPalOrder(
  amountEur: number
): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'EUR',
            value: amountEur.toFixed(2),
          },
          description: 'myshop order',
        },
      ],
      application_context: {
        brand_name: 'myshop',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: 'myshop://paypal-return',
        cancel_url: 'myshop://paypal-cancel',
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create order error: ${err}`);
  }
  const order = await res.json();
  const approvalUrl: string = order.links.find(
    (l: { rel: string }) => l.rel === 'approve'
  )?.href;
  if (!approvalUrl) throw new Error('No approval URL from PayPal');
  return { orderId: order.id, approvalUrl };
}

/**
 * Gets both an access token and a client token (JWT) for the JS SDK V6.
 * The client token is required by paypal.createInstance().
 *
 * Uses POST /v1/oauth2/token with response_type=client_token
 * which returns a JWT — unlike /v1/identity/generate-token
 * which returns a Braintree-format token.
 */
export async function getPayPalTokens(): Promise<{ accessToken: string; clientToken: string }> {
  const accessToken = await getAccessToken();
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&response_type=client_token&intent=sdk_init&domains[]=example.com',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal client token error: ${err}`);
  }
  const data = await res.json();
  // The V6 SDK uses the access_token from this response as its clientToken
  return { accessToken, clientToken: data.access_token };
}

export async function capturePayPalOrder(orderId: string): Promise<boolean> {
  const token = await getAccessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.status === 'COMPLETED';
}
