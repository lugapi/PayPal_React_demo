const CLIENT_ID = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? '';

/**
 * PopupBridge variant of the WebView mode.
 *
 * Identical to getPayPalCheckoutHtml (real PayPal JS SDK buttons),
 * BUT a window.popupBridge polyfill + a window.open override are injected
 * BEFORE the SDK loads to intercept the approval window that PayPal
 * tries to open.
 *
 * This is exactly what popup-bridge-ios does natively:
 * implementing WKUIDelegate.webView(_:createWebViewWith:for:windowFeatures:)
 * to route window.open() calls to an ASWebAuthenticationSession
 * instead of a WKWebView popup (which would be blocked or insecure).
 *
 * Flow:
 *  1. PayPal SDK renders the button (paypal.Buttons().render())
 *  2. Click → SDK creates the order and calls window.popupBridge.open(approvalUrl)
 *     OR window.open(approvalUrl) — both are intercepted.
 *  3. postMessage({ type: 'popup_open', url }) → React Native
 *  4. RN opens approvalUrl in ASWebAuthenticationSession (expo-web-browser)
 *  5. Deep-link return myshop://… → RN extracts the token and captures the order
 *  6. RN injects window.onPopupBridgeComplete(resultUrl) to notify the SDK
 *     (triggers popupBridge.onComplete → SDK's onApprove if supported)
 *     OR navigates directly to order-success if capture already done on RN side.
 */
export function getPayPalPopupBridgeHtml(amountEur: number, appSwitch?: boolean): string {
  const amountStr = amountEur.toFixed(2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>PayPal PopupBridge</title>
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
      background: #E8F5E9;
      color: #2E7D32;
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
      background: #E8F5E9;
      padding: 1px 5px;
      border-radius: 4px;
      color: #2E7D32;
      font-size: 11px;
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

    .cancel-btn:active { background: #f5f5f5; }
  </style>
</head>
<body>

  <div class="header">
    <h2>Total to pay</h2>
    <div class="amount">${amountStr} €</div>
  </div>

  <div class="card">
    <div class="badge">🔗 PopupBridge — hybrid mode</div>
    <div id="paypal-button-container"></div>
    <p class="sdk-note">
      Buttons rendered by the PayPal JS SDK.<br/>
      The approval popup is intercepted and opened<br/>
      in a native <code>ASWebAuthenticationSession</code>.
    </p>
  </div>

  <button class="cancel-btn" onclick="cancel()">Cancel</button>
  <p class="secure">🔒 Approval via secure browser session</p>

  <!--
    PopupBridge polyfill — MUST be injected BEFORE the PayPal SDK script.
    Reproduces the interface that popup-bridge-ios injects natively into
    the WKWebView via evaluateJavaScript() at init time.
  -->
  <script>
    function postMsg(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function cancel() {
      postMsg({ type: 'cancel' });
    }

    // Guard: only send one popup_open per payment session.
    // After ASWebAuth returns, the SDK may re-trigger popupBridge.open()
    // or window.open() (e.g. for a confirmation page), which would cause
    // RN to open a second ASWebAuth — creating the loop the user sees.
    var _popupSent = false;

    // ── PopupBridge polyfill ──────────────────────────────────────────────────
    // Simulates the window.popupBridge object injected by popup-bridge-ios.
    // The PayPal JS SDK (and Braintree) detect its presence and use it
    // instead of window.open() for the approval window.
    window.popupBridge = {
      getReturnUrlPrefix: function() {
        // App deep-link scheme — PayPal will build return_url with this prefix
        return 'myshop://';
      },
      open: function(url) {
        if (_popupSent) return;
        _popupSent = true;
        // Intercepts the PayPal popup opening → React Native
        postMsg({ type: 'popup_open', url: url });
      },
      // onComplete will be called by React Native via injectJavaScript
      // after the ASWebAuthenticationSession returns
      onComplete: null
    };

    // ── Fallback: override window.open ────────────────────────────────────────
    // For SDK versions that don't use window.popupBridge
    // but call window.open() directly for the approval popup.
    (function() {
      var _originalOpen = window.open;
      window.open = function(url, name, features) {
        if (url && typeof url === 'string' && url.indexOf('paypal') !== -1) {
          if (_popupSent) {
            // Already sent the approval URL to RN — return a fake window
            // but don't re-trigger ASWebAuth
            return {
              closed: false,
              close: function() { this.closed = true; },
              location: { href: url },
              focus: function() {},
              blur: function() {}
            };
          }
          _popupSent = true;
          postMsg({ type: 'popup_open', url: url });
          // Return a fake window to prevent SDK crashes
          return {
            closed: false,
            close: function() { this.closed = true; },
            location: { href: url },
            focus: function() {},
            blur: function() {}
          };
        }
        return _originalOpen ? _originalOpen.apply(window, arguments) : null;
      };
    })();

    // ── Callback injected by React Native ──────────────────────────────────────
    // Called after the ASWebAuthenticationSession returns with the return URL.
    // If the SDK registered popupBridge.onComplete, we trigger it so that
    // the onApprove → capture flow happens on the JS SDK side.
    // Otherwise, we extract the token and send it back to RN for native capture.
    window.onPopupBridgeComplete = function(resultUrl) {
      if (window.popupBridge && typeof window.popupBridge.onComplete === 'function') {
        window.popupBridge.onComplete(null, { url: resultUrl });
      } else {
        var match = resultUrl ? resultUrl.match(/[?&]token=([^&]+)/) : null;
        postMsg({ type: 'popup_return', token: match ? match[1] : null, url: resultUrl });
      }
    };
  </script>

  <!-- PayPal JS SDK loaded AFTER the polyfills -->
  <script src="https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=EUR&intent=capture"></script>
  <script>
    var buttons = paypal.Buttons({
      ${appSwitch ? 'appSwitchWhenAvailable: true,' : ''}
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
        // Triggered if the SDK handles the approval itself
        // (via popupBridge.onComplete or SDK internal mechanism)
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

    });

    if (buttons.hasReturned()) {
      buttons.resume();
    } else {
      buttons.render('#paypal-button-container');
    }
  </script>
</body>
</html>`;
}
