const CLIENT_ID = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? '';

/**
 * Generates the static HTML page embedding the PayPal JS SDK.
 * This is the official "web" PayPal approach:
 * the JS SDK handles order creation and capture on the client side,
 * without requiring the CLIENT_SECRET.
 *
 * Communicates with React Native via window.ReactNativeWebView.postMessage()
 */
export function getPayPalCheckoutHtml(amountEur: number): string {
  const amountStr = amountEur.toFixed(2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>PayPal Checkout</title>
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
      background: #EDE9FF;
      color: #6C63FF;
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

    #paypal-button-container {
      min-height: 50px;
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

    .cancel-btn:active {
      background: #f5f5f5;
    }
  </style>
</head>
<body>

  <div class="header">
    <h2>Total to pay</h2>
    <div class="amount">${amountStr} €</div>
  </div>

  <div class="card">
    <div class="badge">🌐 PayPal JS SDK — WebView mode</div>
    <div id="paypal-button-container"></div>
    <p class="sdk-note">
      The PayPal JS SDK handles order creation and capture<br/>
      directly from the browser,<br/>
      without exposing the <code>CLIENT_SECRET</code>.
    </p>
  </div>

  <button class="cancel-btn" onclick="cancel()">Cancel</button>
  <p class="secure">🔒 Secure payment by PayPal</p>

  <script src="https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=EUR&intent=capture"></script>
  <script>
    function postMsg(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function cancel() {
      postMsg({ type: 'cancel' });
    }

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
        height: 50
      },

      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{
            amount: {
              currency_code: 'EUR',
              value: '${amountStr}'
            },
            description: 'myshop order'
          }]
        });
      },

      onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
          postMsg({
            type: 'success',
            orderId: data.orderID,
            payerName: details.payer && details.payer.name
              ? details.payer.name.given_name
              : 'Customer'
          });
        });
      },

      onCancel: function() {
        postMsg({ type: 'cancel' });
      },

      onError: function(err) {
        postMsg({ type: 'error', message: err ? err.toString() : 'Unknown error' });
      }

    }).render('#paypal-button-container');
  </script>
</body>
</html>`;
}
