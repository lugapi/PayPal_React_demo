import { Stack } from 'expo-router';
import { CartProvider } from '../context/CartContext';
import { PaymentModeProvider } from '../context/PaymentModeContext';

export default function RootLayout() {
  return (
    <CartProvider>
    <PaymentModeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="checkout"
          options={{
            title: 'Checkout',
            headerBackTitle: 'Cart',
            headerTintColor: '#6C63FF',
          }}
        />
        <Stack.Screen
          name="order-success"
          options={{
            title: 'Order confirmed',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </PaymentModeProvider>
    </CartProvider>
  );
}
