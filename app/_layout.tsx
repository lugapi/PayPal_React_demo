import { Stack } from 'expo-router';
import { CartProvider } from '../context/CartContext';
import { PaymentModeProvider } from '../context/PaymentModeContext';
import { AppSwitchProvider } from '../context/AppSwitchContext';

export default function RootLayout() {
  return (
    <CartProvider>
    <PaymentModeProvider>
    <AppSwitchProvider>
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
    </AppSwitchProvider>
    </PaymentModeProvider>
    </CartProvider>
  );
}
