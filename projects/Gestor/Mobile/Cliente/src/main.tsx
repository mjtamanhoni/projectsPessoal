import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { erro: string }> {
  state = { erro: '' };

  static getDerivedStateFromError(e: unknown) {
    return { erro: e instanceof Error ? e.message : String(e) };
  }

  render() {
    if (this.state.erro) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#f6f8f5',
            padding: 24,
          }}
        >
          <div style={{ textAlign: 'center', fontSize: 13, color: '#1b1f1c' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Algo deu errado</div>
            <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12 }}>{this.state.erro}</div>
            <button
              className="confirm-btn save"
              onClick={() => window.location.reload()}
              style={{ height: 34, padding: '0 16px', fontSize: 12 }}
            >
              Recarregar o app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
