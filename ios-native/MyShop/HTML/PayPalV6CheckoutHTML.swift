import Foundation

enum PayPalV6CheckoutHTML {
    static func generate(amount: Double, accessToken: String, clientToken: String) -> String {
        let amountStr = String(format: "%.2f", amount)
        let paypalBase = Config.paypalBaseURL

        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <title>PayPal V6 SDK</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #F7F8FC; min-height: 100vh; padding: 24px 20px;
            }
            .header { text-align: center; margin-bottom: 28px; }
            .header h2 { font-size: 18px; color: #555; font-weight: 500; margin-bottom: 6px; }
            .amount { font-size: 40px; font-weight: 800; color: #1A1A2E; letter-spacing: -1px; }
            .card {
              background: #fff; border-radius: 16px; padding: 20px;
              box-shadow: 0 2px 12px rgba(0,0,0,0.07); margin-bottom: 16px;
            }
            .badge {
              display: inline-flex; align-items: center; gap: 6px;
              background: #FFF3E0; color: #E65100; font-size: 12px; font-weight: 700;
              padding: 5px 12px; border-radius: 20px; margin-bottom: 18px;
            }
            .sdk-note { font-size: 12px; color: #999; margin-top: 14px; text-align: center; line-height: 1.5; }
            .secure { text-align: center; color: #bbb; font-size: 12px; margin-top: 20px; }
            .cancel-btn {
              display: block; width: 100%; margin-top: 12px; padding: 14px;
              background: none; border: 1.5px solid #ddd; border-radius: 12px;
              color: #999; font-size: 15px; font-weight: 600; cursor: pointer;
            }
            .cancel-btn:active { background: #f5f5f5; }
            .loading { text-align: center; color: #E65100; font-size: 14px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Total to pay</h2>
            <div class="amount">\(amountStr) €</div>
          </div>
          <div class="card">
            <div class="badge">🚀 JS SDK V6 — WebView mode (iOS Native)</div>
            <paypal-button id="paypal-button" type="pay" hidden></paypal-button>
            <div id="loading" class="loading">Initializing PayPal V6 SDK...</div>
            <p class="sdk-note">
              JS SDK V6 with session-based API<br/>
              and native web components.
            </p>
          </div>
          <button class="cancel-btn" onclick="cancel()">Cancel</button>
          <p class="secure">🔒 Secure payment by PayPal</p>

          <script>
            var ACCESS_TOKEN = '\(accessToken)';
            var CLIENT_TOKEN = '\(clientToken)';
            var PAYPAL_BASE = '\(paypalBase)';
            var AMOUNT = '\(amountStr)';

            function postMsg(data) {
              if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.paypalHandler) {
                window.webkit.messageHandlers.paypalHandler.postMessage(JSON.stringify(data));
              }
            }
            function cancel() { postMsg({ type: 'cancel' }); }

            async function createOrderOnServer() {
              var res = await fetch(PAYPAL_BASE + '/v2/checkout/orders', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + ACCESS_TOKEN
                },
                body: JSON.stringify({
                  intent: 'CAPTURE',
                  purchase_units: [{ amount: { currency_code: 'EUR', value: AMOUNT }, description: 'myshop order' }]
                })
              });
              var data = await res.json();
              return data.id;
            }

            async function captureOrderOnServer(orderId) {
              var res = await fetch(PAYPAL_BASE + '/v2/checkout/orders/' + orderId + '/capture', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + ACCESS_TOKEN
                }
              });
              return res.json();
            }

            function onPayPalWebSdkLoaded() {
              initV6();
            }

            async function initV6() {
              try {
                var sdk = await window.paypal.createInstance({
                  clientToken: CLIENT_TOKEN,
                  components: ['paypal-payments'],
                  pageType: 'checkout'
                });

                var methods = await sdk.findEligibleMethods({ currencyCode: 'EUR' });

                if (!methods.paypal || !methods.paypal.isEligible) {
                  postMsg({ type: 'error', message: 'PayPal not eligible for this transaction.' });
                  return;
                }

                var session = methods.paypal.createPayPalOneTimePaymentSession({
                  async onApprove(data) {
                    try {
                      var captureResult = await captureOrderOnServer(data.orderID);
                      var payerName = 'Customer';
                      if (captureResult.payer && captureResult.payer.name) {
                        payerName = captureResult.payer.name.given_name;
                      }
                      postMsg({ type: 'success', orderId: data.orderID, payerName: payerName });
                    } catch(e) {
                      postMsg({ type: 'error', message: 'Capture failed: ' + e.message });
                    }
                  },
                  onCancel: function() { postMsg({ type: 'cancel' }); },
                  onError: function(err) { postMsg({ type: 'error', message: err ? err.toString() : 'Unknown error' }); }
                });

                var btn = document.getElementById('paypal-button');
                btn.addEventListener('click', async function() {
                  var orderId = await createOrderOnServer();
                  session.start({ paymentToken: orderId });
                });

                document.getElementById('loading').style.display = 'none';
                btn.hidden = false;
              } catch(e) {
                postMsg({ type: 'error', message: 'V6 init failed: ' + e.message });
              }
            }
          </script>
          <script async src="https://www.sandbox.paypal.com/web-sdk/v6/core" onload="onPayPalWebSdkLoaded()"></script>
        </body>
        </html>
        """
    }
}
