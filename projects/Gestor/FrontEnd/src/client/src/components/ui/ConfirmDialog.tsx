import { useEffect } from 'react';
import { AlertTriangle, Trash2, RotateCcw, CheckCircle, X } from 'lucide-react';
import { Button } from './Button';

type ConfirmVariant = 'danger' | 'warning' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  loading?: boolean;
}

const config: Record<ConfirmVariant, {
  icon: typeof Trash2;
  iconBg: string;
  iconColor: string;
  buttonVariant: 'danger' | 'primary';
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-accent-red/10',
    iconColor: 'text-accent-red',
    buttonVariant: 'danger',
  },
  warning: {
    icon: RotateCcw,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    buttonVariant: 'primary',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-accent-primary/10',
    iconColor: 'text-accent-primary',
    buttonVariant: 'primary',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmLabel,
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const { icon: Icon, iconBg, iconColor, buttonVariant } = config[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-bg-card rounded-xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bg-muted transition-colors">
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center -mt-2">
          <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
            <Icon size={28} className={iconColor} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-[260px]">{message}</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Aguarde...' : (confirmLabel || 'Confirmar')}
          </Button>
        </div>
      </div>
    </div>
  );
}
