import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-accent-red/10 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-accent-red" />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground-primary mb-2">
            Algo deu errado
          </h2>
          <p className="text-text-secondary mb-1 max-w-md">
            Ocorreu um erro inesperado nesta secao. Voce pode tentar novamente ou voltar para o inicio.
          </p>
          {this.state.error && (
            <p className="text-xs text-text-muted mb-4 font-mono bg-background-secondary px-3 py-2 rounded max-w-lg break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} />
              Tentar novamente
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="px-4 py-2 bg-background-secondary border border-border-primary text-text-primary rounded-lg hover:bg-background-hover transition-colors text-sm font-medium"
            >
              Ir para o inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}