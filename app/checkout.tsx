import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useCart } from '../context/CartContext';
import { usePaymentMode } from '../context/PaymentModeContext';
import type { PaymentMode } from '../context/PaymentModeContext';
import { useAppSwitch } from '../context/AppSwitchContext';
import { PayPalButton } from '../components/PayPalButton';
import { PayPalWebViewCheckout } from '../components/PayPalWebViewCheckout';
import { PayPalPopupBridgeCheckout } from '../components/PayPalPopupBridgeCheckout';
import { PayPalV6WebViewCheckout } from '../components/PayPalV6WebViewCheckout';

// ─── Header toggle component ────────────────────────────────────────────────

const MODE_LABELS: Record<PaymentMode, string> = {
  native:      '📱 Native',
  webview:     '🌐 WebView',
  popupbridge: '🔗 Hybrid',
  webviewv6:   '🚀 V6 SDK',
};

const MODE_PILL_BG: Record<PaymentMode, string> = {
  native:      '#EDE9FF',
  webview:     '#E3F2FD',
  popupbridge: '#E8F5E9',
  webviewv6:   '#FFF3E0',
};

function HeaderRight() {
  const { mode, setMode } = usePaymentMode();
  const { appSwitch, setAppSwitch } = useAppSwitch();

  const supportsAppSwitch = mode === 'webview' || mode === 'popupbridge';

  function handleAppSwitchChange(value: boolean) {
    if (!supportsAppSwitch) {
      Alert.alert(
        'App Switch unavailable',
        'App Switch is only available with JS SDK V5 modes (WebView and PopupBridge). Switch to one of these modes to enable it.'
      );
      return;
    }
    setAppSwitch(value);
  }

  function handleToggle() {
    Alert.alert(
      '⚙️ PayPal Integration Mode',
      'Choose how PayPal is integrated in this demo.',
      [
        {
          text: '📱 Native REST API',
          style: mode === 'native' ? 'destructive' : 'default',
          onPress: () => setMode('native'),
        },
        {
          text: '🌐 WebView JS SDK',
          style: mode === 'webview' ? 'destructive' : 'default',
          onPress: () => setMode('webview'),
        },
        {
          text: '🔗 PopupBridge (Hybrid)',
          style: mode === 'popupbridge' ? 'destructive' : 'default',
          onPress: () => setMode('popupbridge'),
        },
        {
          text: '🚀 JS SDK V6',
          style: mode === 'webviewv6' ? 'destructive' : 'default',
          onPress: () => setMode('webviewv6'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return (
    <View style={styles.headerRight}>
      <View style={styles.appSwitchToggle}>
        <Text style={[styles.appSwitchLabel, !supportsAppSwitch && { color: '#ccc' }]}>App Switch</Text>
        <Switch
          value={supportsAppSwitch && appSwitch}
          onValueChange={handleAppSwitchChange}
          trackColor={{ false: '#D1D1D6', true: '#34C759' }}
          style={[
            { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },
            !supportsAppSwitch && { opacity: 0.4 },
          ]}
        />
      </View>
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
        <View style={[styles.modePill, { backgroundColor: MODE_PILL_BG[mode] }]}>
          <Text style={styles.modePillText}>{MODE_LABELS[mode]}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Form fields ────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  maxLength?: number;
  error?: string;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
        autoCorrect={false}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { mode } = usePaymentMode();
  const { appSwitch } = useAppSwitch();

  const [form, setForm] = useState<FormData>({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    address: '123 Main Street',
    city: 'Paris',
    zip: '75001',
    cardNumber: '4111 1111 1111 1111',
    cardExpiry: '12/28',
    cardCvv: '123',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const shipping = 4.99;
  const total = totalPrice + shipping;

  function set(field: keyof FormData) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name required';
    if (!form.lastName.trim()) e.lastName = 'Last name required';
    if (!form.email.includes('@')) e.email = 'Invalid email';
    if (!form.address.trim()) e.address = 'Address required';
    if (!form.city.trim()) e.city = 'City required';
    if (!/^\d{5}$/.test(form.zip)) e.zip = 'Invalid ZIP code';
    if (!/^\d{16}$/.test(form.cardNumber.replace(/\s/g, ''))) e.cardNumber = 'Invalid card number';
    if (!/^\d{2}\/\d{2}$/.test(form.cardExpiry)) e.cardExpiry = 'MM/YY format';
    if (!/^\d{3,4}$/.test(form.cardCvv)) e.cardCvv = 'Invalid CVV';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCardSubmit() {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      clearCart();
      router.replace('/order-success');
    }, 1500);
  }

  function formatCardNumber(value: string) {
    return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    return digits.length >= 3 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
  }

  function onPayPalSuccess(orderId?: string, payerName?: string) {
    clearCart();
    const params = new URLSearchParams();
    if (orderId) params.set('orderId', orderId);
    if (payerName) params.set('payerName', payerName);
    params.set('method', 'paypal');
    params.set('mode', mode);
    const qs = params.toString();
    router.replace(`/order-success${qs ? `?${qs}` : ''}`);
  }

  // In WebView mode, replace all content with the PayPal WebView (JS SDK)
  if (mode === 'webview') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ headerRight: () => <HeaderRight /> }} />
        <PayPalWebViewCheckout
          amount={total}
          appSwitch={appSwitch}
          onSuccess={onPayPalSuccess}
          onCancel={() => Alert.alert('Cancelled', 'PayPal payment cancelled.')}
          onError={(msg) => Alert.alert('PayPal Error', msg)}
        />
      </View>
    );
  }

  // In PopupBridge mode: WebView UI + approval via native ASWebAuthenticationSession
  if (mode === 'popupbridge') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ headerRight: () => <HeaderRight /> }} />
        <PayPalPopupBridgeCheckout
          amount={total}
          appSwitch={appSwitch}
          onSuccess={onPayPalSuccess}
          onCancel={() => Alert.alert('Cancelled', 'PayPal payment cancelled.')}
          onError={(msg) => Alert.alert('PayPal Error', msg)}
        />
      </View>
    );
  }

  // In V6 SDK mode: JS SDK V6 with session-based API and web components
  if (mode === 'webviewv6') {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ headerRight: () => <HeaderRight /> }} />
        <PayPalV6WebViewCheckout
          amount={total}
          onSuccess={onPayPalSuccess}
          onCancel={() => Alert.alert('Cancelled', 'PayPal payment cancelled.')}
          onError={(msg) => Alert.alert('PayPal Error', msg)}
        />
      </View>
    );
  }

  // Native mode: React Native form + PayPal REST API button
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerRight: () => <HeaderRight /> }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📦 Order Summary</Text>
            {items.map((item) => (
              <View key={item.product.id} style={styles.recapRow}>
                <Text style={styles.recapName}>
                  {item.product.emoji} {item.product.name} × {item.quantity}
                </Text>
                <Text style={styles.recapPrice}>
                  {(item.product.price * item.quantity).toFixed(2)} €
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Shipping</Text>
              <Text style={styles.recapPrice}>{shipping.toFixed(2)} €</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapTotal}>Total</Text>
              <Text style={styles.recapTotalPrice}>{total.toFixed(2)} €</Text>
            </View>
          </View>

          {/* Shipping address */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🏠 Shipping Address</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="First name" value={form.firstName} onChangeText={set('firstName')} placeholder="John" error={errors.firstName} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last name" value={form.lastName} onChangeText={set('lastName')} placeholder="Smith" error={errors.lastName} />
              </View>
            </View>
            <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="john@example.com" keyboardType="email-address" error={errors.email} />
            <Field label="Address" value={form.address} onChangeText={set('address')} placeholder="123 Main St" error={errors.address} />
            <View style={styles.row2}>
              <View style={{ flex: 2 }}>
                <Field label="City" value={form.city} onChangeText={set('city')} placeholder="New York" error={errors.city} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="ZIP code" value={form.zip} onChangeText={set('zip')} placeholder="10001" keyboardType="numeric" maxLength={5} error={errors.zip} />
              </View>
            </View>
          </View>

          {/* Card payment */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>💳 Payment</Text>
            <Field
              label="Card number"
              value={form.cardNumber}
              onChangeText={(v) => set('cardNumber')(formatCardNumber(v))}
              placeholder="1234 5678 9012 3456"
              keyboardType="numeric"
              maxLength={19}
              error={errors.cardNumber}
            />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Expiration"
                  value={form.cardExpiry}
                  onChangeText={(v) => set('cardExpiry')(formatExpiry(v))}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                  error={errors.cardExpiry}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="CVV" value={form.cardCvv} onChangeText={set('cardCvv')} placeholder="123" keyboardType="numeric" maxLength={4} error={errors.cardCvv} />
              </View>
            </View>
            <View style={styles.secureNote}>
              <Text style={styles.secureText}>🔒 100% secure payment</Text>
            </View>
          </View>

          {/* PayPal native (REST API) */}
          <PayPalButton
            amount={total}
            onSuccess={onPayPalSuccess}
            onCancel={() => Alert.alert('Cancelled', 'PayPal payment cancelled.')}
            onError={(msg) => Alert.alert('PayPal Error', msg)}
          />

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Card payment button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnLoading]}
            onPress={handleCardSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? 'Processing...' : `💳 Pay by card ${total.toFixed(2)} €`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header toggle
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  appSwitchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  appSwitchLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
  },

  // Layout
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },

  // Summary
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recapName: { fontSize: 13, color: '#555', flex: 1 },
  recapPrice: { fontSize: 13, color: '#1A1A2E', fontWeight: '600' },
  recapLabel: { fontSize: 14, color: '#555' },
  recapTotal: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  recapTotalPrice: { fontSize: 18, fontWeight: '800', color: '#6C63FF' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
  row2: { flexDirection: 'row', gap: 12 },

  // Form fields
  fieldWrapper: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#FF4757' },
  errorText: { fontSize: 11, color: '#FF4757' },
  secureNote: { alignItems: 'center', paddingTop: 4 },
  secureText: { fontSize: 12, color: '#999' },

  // Separator
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  separatorText: { fontSize: 13, color: '#999', fontWeight: '600' },

  // Card button
  submitBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitBtnLoading: { backgroundColor: '#A09CFF' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
