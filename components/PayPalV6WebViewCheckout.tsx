/**
 * WebView mode using the PayPal JS SDK V6.
 *
 * Unlike the V5 WebView mode (PayPalWebViewCheckout), the V6 SDK requires:
 *   - A clientToken generated server-side (POST /v1/identity/generate-token)
 *   - An accessToken for server-side order creation and capture
 *   - Session-based API (createPayPalOneTimePaymentSession)
 *   - Native web components (<paypal-button>) instead of paypal.Buttons()
 *
 * The component fetches both tokens on mount, then renders the WebView
 * with the V6 HTML template. Order creation and capture happen via
 * REST API calls from within the WebView (demo only — should use a
 * backend server in production).
 */

import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useRef, useState, useEffect } from 'react';
import { getPayPalV6CheckoutHtml } from '../utils/paypalV6CheckoutHtml';
import { getPayPalTokens } from '../utils/paypal';

interface WebViewMessage {
  type: 'success' | 'cancel' | 'error';
  orderId?: string;
  payerName?: string;
  message?: string;
}

interface Props {
  amount: number;
  onSuccess: (orderId?: string, payerName?: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function PayPalV6WebViewCheckout({ amount, onSuccess, onCancel, onError }: Props) {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<{ accessToken: string; clientToken: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    getPayPalTokens()
      .then((t) => {
        setTokens(t);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to get PayPal tokens.';
        setTokenError(msg);
        onError(msg);
      });
  }, []);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg: WebViewMessage = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'success':
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

  if (tokenError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize PayPal V6</Text>
        <Text style={styles.errorDetail}>{tokenError}</Text>
      </View>
    );
  }

  if (!tokens) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#E65100" />
        <Text style={styles.loadingText}>Initializing PayPal V6 SDK…</Text>
      </View>
    );
  }

  const html = getPayPalV6CheckoutHtml(amount, tokens.accessToken, tokens.clientToken);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://www.sandbox.paypal.com' }}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => onError('Failed to load the PayPal V6 page.')}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={['*']}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#E65100" />
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FC',
    padding: 24,
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4757',
  },
  errorDetail: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
