import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useRef, useState } from 'react';
import { getPayPalCheckoutHtml } from '../utils/paypalCheckoutHtml';

interface WebViewMessage {
  type: 'success' | 'cancel' | 'error';
  orderId?: string;
  payerName?: string;
  message?: string;
}

interface Props {
  amount: number;
  onSuccess: (payerName?: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function PayPalWebViewCheckout({ amount, onSuccess, onCancel, onError }: Props) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg: WebViewMessage = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'success':
          onSuccess(msg.payerName);
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

  const html = getPayPalCheckoutHtml(amount);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://www.paypal.com' }}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => onError('Failed to load the PayPal page.')}
        javaScriptEnabled
        domStorageEnabled
        // Required for the PayPal JS SDK to load correctly
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
