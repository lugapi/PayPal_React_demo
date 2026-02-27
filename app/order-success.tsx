import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useEffect } from 'react';

const MODE_LABELS: Record<string, string> = {
  native:      '📱 Native REST API',
  webview:     '🌐 WebView JS SDK',
  popupbridge: '🔗 PopupBridge (Hybrid)',
  webviewv6:   '🚀 JS SDK V6',
};

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderId, payerName, method, mode } = useLocalSearchParams<{
    orderId?: string;
    payerName?: string;
    method?: string;
    mode?: string;
  }>();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const isPayPal = method === 'paypal';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { transform: [{ scale }], opacity }]}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkEmoji}>✅</Text>
        </View>
        <Text style={styles.title}>Order confirmed!</Text>
        <Text style={styles.subtitle}>
          Thank you{payerName ? `, ${payerName}` : ''} for your purchase.{'\n'}
          You will receive a confirmation email shortly.
        </Text>

        {isPayPal && (
          <View style={styles.paypalBox}>
            <Text style={styles.paypalTitle}>PayPal Payment Details</Text>
            {orderId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{orderId}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>COMPLETED</Text>
              </View>
            </View>
            {mode && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Integration</Text>
                <Text style={styles.detailValue}>{MODE_LABELS[mode] ?? mode}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoRow}>📦 Estimated delivery: 3-5 business days</Text>
          <Text style={styles.infoRow}>📧 Email confirmation</Text>
          <Text style={styles.infoRow}>🔄 Free returns within 30 days</Text>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Back to shop</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkEmoji: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
  },
  paypalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#003087',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  paypalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#003087',
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    fontSize: 14,
    color: '#555',
  },
  btn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
