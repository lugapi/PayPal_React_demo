/**
 * PopupBridge mode (hybrid):
 *
 * Same WebView rendering as PayPalWebViewCheckout (real PayPal JS SDK buttons),
 * but the window.popupBridge polyfill + the window.open override injected in
 * the HTML intercept the PayPal approval popup before it opens in the WebView.
 *
 * React Native takes over exactly as popup-bridge-ios would do natively
 * in a WKWebView:
 *   - receives the approval URL via postMessage
 *   - opens it in an ASWebAuthenticationSession (expo-web-browser)
 *   - extracts the token from the return URL (deep-link myshop://)
 *   - captures the order via REST API
 *   - injects the result back into the WebView via injectJavaScript
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { getPayPalPopupBridgeHtml } from '../utils/paypalPopupBridgeHtml';
import { capturePayPalOrder } from '../utils/paypal';

interface WebViewMsg {
  type: 'success' | 'cancel' | 'error' | 'popup_open' | 'popup_return';
  orderId?: string;
  payerName?: string;
  message?: string;
  url?: string;
  token?: string;
}

interface Props {
  amount: number;
  appSwitch?: boolean;
  onSuccess: (orderId?: string, payerName?: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function PayPalPopupBridgeCheckout({ amount, appSwitch, onSuccess, onCancel, onError }: Props) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  // Guard: prevent opening ASWebAuth more than once per payment session.
  // After the first popup_open is handled, the SDK may fire additional
  // popupBridge.open / window.open calls (e.g. confirmation pages).
  const popupHandledRef = useRef(false);

  /**
   * Intercepts the approval URL sent by the polyfill (popup_open).
   * Opens in ASWebAuthenticationSession then captures on the RN side.
   */
  async function handlePopupOpen(approvalUrl: string) {
    if (popupHandledRef.current) return;
    popupHandledRef.current = true;
    try {
      // Analogous to what popup-bridge-ios does:
      // open the URL in an ASWebAuthenticationSession instead of in the WKWebView
      const result = await WebBrowser.openAuthSessionAsync(approvalUrl, 'myshop://');

      if (result.type === 'success' && result.url) {
        const returnUrl = result.url;

        // First try to let the SDK handle it via popupBridge.onComplete
        // (case where the PayPal JS SDK natively supports window.popupBridge)
        webViewRef.current?.injectJavaScript(
          `window.onPopupBridgeComplete(${JSON.stringify(returnUrl)}); true;`
        );

        // Fallback: if the SDK does not handle onComplete, the HTML sends us
        // a popup_return message — handled in handleMessage below.
        // In that case, we capture directly from RN using the token from the URL.
        const tokenMatch = returnUrl.match(/[?&]token=([^&]+)/);
        const token = tokenMatch?.[1];
        if (token) {
          // Attempt capture on the RN side in parallel.
          // If the SDK already captured via onApprove ('success' message received first),
          // this capture will silently fail (order already COMPLETED).
          capturePayPalOrder(token).then((captured) => {
            if (captured) onSuccess(token);
          }).catch(() => {
            // Capture already done by the SDK on the WebView side — no action needed.
          });
        }
      } else {
        // ASWebAuth session closed or cancelled
        onCancel();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'PayPal connection error.';
      onError(msg);
    }
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg: WebViewMsg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'popup_open':
          // The PopupBridge polyfill (or window.open override) intercepted
          // the approval popup — RN takes over
          if (msg.url) handlePopupOpen(msg.url);
          break;

        case 'popup_return':
          // The SDK has no popupBridge.onComplete — the HTML sends back
          // the token so RN can finalize the capture
          if (msg.token) {
            capturePayPalOrder(msg.token).then((captured) => {
              if (captured) onSuccess(msg.token);
              else onError('Payment capture failed.');
            }).catch(() => onError('Capture error.'));
          } else {
            onError('Missing PayPal token in return URL.');
          }
          break;

        case 'success':
          // The SDK handled capture itself (via onApprove → actions.order.capture)
          onSuccess(msg.orderId, msg.payerName);
          break;

        case 'cancel':
          onCancel();
          break;

        case 'error':
          onError(msg.message ?? 'Unknown PayPal error.');
          break;
      }
    } catch {
      onError('Invalid WebView response.');
    }
  }

  const html = getPayPalPopupBridgeHtml(amount, appSwitch);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://www.paypal.com' }}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => onError('Failed to load PayPal page.')}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={['*']}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FC',
  },
});
