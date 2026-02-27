import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { createPayPalOrder, capturePayPalOrder } from '../utils/paypal';

interface Props {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function PayPalButton({ amount, onSuccess, onCancel, onError }: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    setLoading(true);
    try {
      const { orderId, approvalUrl } = await createPayPalOrder(amount);

      const result = await WebBrowser.openAuthSessionAsync(
        approvalUrl,
        'myshop://'
      );

      if (result.type === 'success' && result.url) {
        // Extraire le token PayPal de l'URL de retour
        const tokenMatch = result.url.match(/[?&]token=([^&]+)/);
        const paypalToken = tokenMatch?.[1];

        if (paypalToken) {
          const captured = await capturePayPalOrder(paypalToken);
          if (captured) {
            onSuccess();
          } else {
            onError('Payment capture failed.');
          }
        } else {
          onError('PayPal token missing from return URL.');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        onCancel();
      }
    } catch (e: any) {
      onError(e?.message ?? 'Failed to connect to PayPal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.btn, loading && styles.btnLoading]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.logo}>Pay</Text>
          <Text style={styles.logoBlue}>Pal</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#FFC439',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLoading: {
    backgroundColor: '#FFD97A',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#003087',
  },
  logoBlue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#009CDE',
  },
});
