import { createContext, useContext, ReactNode } from 'react';

type AppMode = '' | 'gestor' | 'horas' | 'producao';

const AppModeContext = createContext<AppMode>('');

export function AppModeProvider({ mode, children }: { mode: AppMode; children: ReactNode }) {
  return (
    <AppModeContext.Provider value={mode}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  return useContext(AppModeContext);
}
