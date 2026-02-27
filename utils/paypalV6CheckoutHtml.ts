const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

/**
 * Generates the HTML page for the PayPal JS SDK V6 integration.
 *
 * Key differences from V5 (paypalCheckoutHtml.ts):
 *   - SDK script: sandbox.paypal.com/web-sdk/v6/core (not /sdk/js)
 *   - Requires a clientToken from POST /v1/identity/generate-token
 *   - Session-based API: createInstance → findEligibleMethods → createPayPalOneTimePaymentSession
 *   - Native web component: <paypal-button type="pay"> (not paypal.Buttons().render())
 *   - Order creation and capture via REST API (not actions.order.create/capture)
 *
 * Communicates with React Native via window.ReactNativeWebView.postMessage()
 */
export function getPayPalV6CheckoutHtml(
  amountEur: number,
  accessToken: string,
  clientToken: string
): string {
  const amountStr = amountEur.toFixed(2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>PayPal V6 Checkout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F7F8FC;
      min-height: 100vh;
      padding: 24px 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 28px;
    }

    .header h2 {
      font-size: 18px;
      color: #555;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .amount {
      font-size: 40px;
      font-weight: 800;
      color: #1A1A2E;
      letter-spacing: -1px;
    }

    .card {
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07);
      margin-bottom: 16px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FFF3E0;
      color: #E65100;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 20px;
      margin-bottom: 18px;
      letter-spacing: 0.3px;
    }

    .sdk-note {
      font-size: 12px;
      color: #999;
      margin-top: 14px;
      text-align: center;
      line-height: 1.5;
    }

    .sdk-note code {
      font-family: monospace;
      background: #FFF3E0;
      padding: 1px 5px;
      border-radius: 4px;
      color: #E65100;
      font-size: 11px;
    }

    .status {
      text-align: center;
      font-size: 13px;
      color: #999;
      margin: 16px 0;
      min-height: 20px;
    }

    .status.error {
      color: #FF4757;
    }

    .secure {
      text-align: center;
      color: #bbb;
      font-size: 12px;
      margin-top: 20px;
    }

    .cancel-btn {
      display: block;
      width: 100%;
      margin-top: 12px;
      padding: 14px;
      background: none;
      border: 1.5px solid #ddd;
      border-radius: 12px;
      color: #999;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    .cancel-btn:active { background: #f5f5f5; }

    paypal-button {
      display: block;
      width: 100%;
    }
  </style>
</head>
<body>

  <div class="header">
    <h2>Total to pay</h2>
    <div class="amount">${amountStr} €</div>
  </div>

  <div class="card">
    <div class="badge">🚀 JS SDK V6 — WebView mode</div>
    <paypal-button id="paypal-button" type="pay" hidden></paypal-button>
    <p class="sdk-note">
      PayPal JS SDK <code>V6</code> with native web components.<br/>
      Session-based API with server-side order management.
    </p>
  </div>

  <div id="status" class="status">Loading PayPal SDK…</div>

  <button class="cancel-btn" onclick="cancel()">Cancel</button>
  <p class="secure">🔒 Secure payment by PayPal</p>

  <script>
    var __config = ${JSON.stringify({ accessToken, clientToken, paypalBase: PAYPAL_BASE, amount: amountStr })};
    var ACCESS_TOKEN = __config.accessToken;
    var CLIENT_TOKEN = __config.clientToken;
    var PAYPAL_BASE = __config.paypalBase;
    var AMOUNT = __config.amount;

    function postMsg(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function cancel() {
      postMsg({ type: 'cancel' });
    }

    function showStatus(msg, isError) {
      var el = document.getElementById('status');
      el.textContent = msg;
      el.className = 'status' + (isError ? ' error' : '');
    }

    async function createOrder() {
      var res = await fetch(PAYPAL_BASE + '/v2/checkout/orders', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'EUR',
              value: AMOUNT
            },
            description: 'myshop order'
          }],
          payment_source: {
            paypal: {
              experience_context: {
                shipping_preference: 'NO_SHIPPING'
              }
            }
          }
        })
      });
      if (!res.ok) throw new Error('Order creation failed: ' + res.status);
      var order = await res.json();
      return { orderId: order.id };
    }

    async function captureOrder(orderId) {
      var res = await fetch(PAYPAL_BASE + '/v2/checkout/orders/' + orderId + '/capture', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Capture failed: ' + res.status);
      return await res.json();
    }
  </script>

  <script async src="https://www.sandbox.paypal.com/web-sdk/v6/core" onload="onPayPalWebSdkLoaded()"></script>

  <script>
    async function onPayPalWebSdkLoaded() {
      try {
        showStatus('Initializing SDK…');

        var sdk = await window.paypal.createInstance({
          clientToken: CLIENT_TOKEN,
          components: ['paypal-payments'],
          pageType: 'checkout'
        });

        var methods = await sdk.findEligibleMethods({
          currencyCode: 'EUR'
        });

        if (!methods.isEligible('paypal')) {
          showStatus('PayPal is not eligible for this transaction.', true);
          return;
        }

        var session = sdk.createPayPalOneTimePaymentSession({
          async onApprove(data) {
            try {
              showStatus('Capturing payment…');
              var capture = await captureOrder(data.orderId);
              var payerName = 'Customer';
              if (capture.payer && capture.payer.name) {
                payerName = capture.payer.name.given_name || 'Customer';
              }
              postMsg({
                type: 'success',
                orderId: data.orderId,
                payerName: payerName
              });
            } catch (err) {
              postMsg({ type: 'error', message: 'Capture failed: ' + err.message });
            }
          },
          onCancel: function() {
            postMsg({ type: 'cancel' });
          },
          onError: function(err) {
            postMsg({ type: 'error', message: err ? err.toString() : 'Unknown error' });
          }
        });

        var btn = document.getElementById('paypal-button');
        btn.hidden = false;
        btn.addEventListener('click', async function() {
          try {
            await session.start(
              { presentationMode: 'auto' },
              createOrder()
            );
          } catch (err) {
            postMsg({ type: 'error', message: 'Payment start error: ' + err.message });
          }
        });

        showStatus('PayPal SDK V6 ready ✅');
      } catch (err) {
        showStatus('SDK init error: ' + err.message, true);
        postMsg({ type: 'error', message: 'SDK init error: ' + err.message });
      }
    }
  </script>
</body>
</html>`;
}
