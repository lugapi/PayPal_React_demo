import React, { createContext, useContext, useState } from 'react';

interface AppSwitchContextValue {
  appSwitch: boolean;
  setAppSwitch: (enabled: boolean) => void;
}

const AppSwitchContext = createContext<AppSwitchContextValue | null>(null);

export function AppSwitchProvider({ children }: { children: React.ReactNode }) {
  const [appSwitch, setAppSwitch] = useState(false);
  return (
    <AppSwitchContext.Provider value={{ appSwitch, setAppSwitch }}>
      {children}
    </AppSwitchContext.Provider>
  );
}

export function useAppSwitch() {
  const ctx = useContext(AppSwitchContext);
  if (!ctx) throw new Error('useAppSwitch must be used inside AppSwitchProvider');
  return ctx;
}
