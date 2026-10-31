import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { erro: string }> {
  state = { erro: '' };

  static getDerivedStateFromError(error: unknown) {
    return { erro: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="crash-screen">
          <h1>Algo deu errado</h1>
          <p>{this.state.erro}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Recarregar o app
          </button>
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
