import { useMemo, useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { Modal } from './Modal';

export function normalizar(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface RegistroOption<T> {
  value: T;
  label: string;
  sub?: string;
}

interface RegistroSelectProps<T extends string | number> {
  value: T | null | undefined;
  onChange: (v: T) => void;
  options: RegistroOption<T>[];
  placeholder?: string;
  title?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RegistroSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  title,
  searchPlaceholder = 'Buscar por nome...',
  disabled,
  className = '',
}: RegistroSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [termo, setTermo] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtrados = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return options;
    return options.filter((o) => normalizar(o.label).includes(t) || (o.sub ? normalizar(o.sub).includes(t) : false));
  }, [options, termo]);

  const fechar = () => {
    setOpen(false);
    setTermo('');
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`input-field flex items-center justify-between gap-2 text-left ${selected?.label ? '' : 'text-text-muted'} ${className}`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-text-muted" />
      </button>

      <Modal isOpen={open} onClose={fechar} title={title ?? placeholder} maxWidth="max-w-lg">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            autoFocus
            className="input-field pl-9"
            placeholder={searchPlaceholder}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>

        <div className="mt-2 text-xs text-text-secondary">
          {filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
        </div>

        <div className="mt-2 max-h-72 overflow-y-auto -mx-2 px-2">
          {filtrados.length === 0 && (
            <div className="py-8 text-center text-sm text-text-muted">Nenhum registro encontrado</div>
          )}
          {filtrados.map((o, idx) => (
            <button
              key={`${reportValue(o.value)}-${idx}`}
              type="button"
              onClick={() => {
                onChange(o.value);
                fechar();
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                o.value === value ? 'bg-accent-light text-accent-primary' : 'hover:bg-bg-muted'
              }`}
            >
              <div className="min-w-0">
                <div className={`truncate text-sm font-medium ${o.value === value ? '' : 'text-text-primary'}`}>{o.label}</div>
                {o.sub && <div className="truncate text-xs text-text-secondary">{o.sub}</div>}
              </div>
              {o.value === value && <Check size={16} className="shrink-0" />}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

function reportValue(v: string | number): string {
  return typeof v === 'number' ? String(v) : v;
}