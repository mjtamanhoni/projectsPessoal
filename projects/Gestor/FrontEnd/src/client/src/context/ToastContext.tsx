import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, { border: string; bg: string; icon: string; text: string }> = {
  success: {
    border: 'border-l-accent-primary',
    bg: 'bg-white',
    icon: 'text-accent-primary',
    text: 'text-text-primary',
  },
  error: {
    border: 'border-l-accent-red',
    bg: 'bg-white',
    icon: 'text-accent-red',
    text: 'text-text-primary',
  },
  warning: {
    border: 'border-l-yellow-500',
    bg: 'bg-white',
    icon: 'text-yellow-500',
    text: 'text-text-primary',
  },
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-white',
    icon: 'text-blue-500',
    text: 'text-text-primary',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type !== 'error') {
      setTimeout(() => removeToast(id), 4000);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          const s = styles[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto animate-slide-in rounded-xl border border-border-subtle shadow-lg ${s.border} ${s.bg} border-l-4 min-w-[320px] max-w-[420px]`}
            >
              <div className="flex items-start gap-3 p-4">
                <Icon size={20} className={`${s.icon} shrink-0 mt-0.5`} />
                <p className={`text-sm ${s.text} flex-1`}>{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-0.5 rounded hover:bg-bg-muted transition-colors shrink-0"
                >
                  <X size={14} className="text-text-muted" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }
  return context;
}
