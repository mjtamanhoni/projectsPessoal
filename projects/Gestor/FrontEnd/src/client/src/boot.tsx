import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppModeProvider } from '@/context/AppModeContext';
import App from './App';
import './index.css';

export type AppMode = '' | 'gestor' | 'horas' | 'producao';

export function boot(mode: AppMode) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AppModeProvider mode={mode}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </AppModeProvider>
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
}
