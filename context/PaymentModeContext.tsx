import React, { createContext, useContext, useState } from 'react';

export type PaymentMode = 'native' | 'webview' | 'popupbridge' | 'webviewv6';

interface PaymentModeContextValue {
  mode: PaymentMode;
  setMode: (mode: PaymentMode) => void;
}

const PaymentModeContext = createContext<PaymentModeContextValue | null>(null);

export function PaymentModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaymentMode>('native');
  return (
    <PaymentModeContext.Provider value={{ mode, setMode }}>
      {children}
    </PaymentModeContext.Provider>
  );
}

export function usePaymentMode() {
  const ctx = useContext(PaymentModeContext);
  if (!ctx) throw new Error('usePaymentMode must be used inside PaymentModeProvider');
  return ctx;
}
