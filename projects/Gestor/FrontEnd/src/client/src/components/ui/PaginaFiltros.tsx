import { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

interface FiltoSelectProps {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; label: string }[];
  onChange: (valor: string) => void;
}

interface FiltroMultiSelectProps {
  rotulo: string;
  valor: string[];
  opcoes: { valor: string; label: string }[];
  padrao?: string[];
  onChange: (valores: string[]) => void;
}

interface PaginaFiltrosProps {
  busca?: { valor: string; onChange: (valor: string) => void; placeholder?: string };
  status?: FiltoSelectProps;
  multiStatus?: FiltroMultiSelectProps;
  select?: FiltoSelectProps;
  periodo?: { inicio: string; fim: string; onInicio: (valor: string) => void; onFim: (valor: string) => void };
  onLimpar: () => void;
}

function arraysIguais(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

function MultiSelectFiltro({ rotulo, valor, opcoes, onChange }: FiltroMultiSelectProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  const todasSelecionadas = opcoes.length > 0 && valor.length === opcoes.length;
  const labels = valor.map((v) => opcoes.find((o) => o.valor === v)?.label).filter(Boolean);

  const alternar = (v: string) => {
    if (valor.includes(v)) onChange(valor.filter((x) => x !== v));
    else onChange([...valor, v]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="input-field py-2 w-auto flex items-center gap-2"
        title={rotulo}
      >
        <span className="max-w-[200px] truncate">
          {rotulo}: {todasSelecionadas || valor.length === 0 ? 'Todas' : labels.join(', ')}
        </span>
        <ChevronDown size={14} className="shrink-0 text-text-muted" />
      </button>
      {aberto && (
        <div className="absolute z-50 mt-1 min-w-[220px] rounded-lg border border-border-primary bg-bg-card shadow-lg py-1">
          {opcoes.map((op) => {
            const marcado = valor.includes(op.valor);
            return (
              <button
                key={op.valor}
                type="button"
                onClick={() => alternar(op.valor)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-muted transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    marcado ? 'bg-accent-primary border-accent-primary' : 'border-border-subtle'
                  }`}
                >
                  {marcado && <Check size={12} className="text-text-inverse" />}
                </span>
                <span className="text-text-primary">{op.label}</span>
              </button>
            );
          })}
          <div className="border-t border-border-primary mt-1 pt-1">
            <button
              type="button"
              onClick={() => onChange(todasSelecionadas ? [] : opcoes.map((o) => o.valor))}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg-muted transition-colors text-accent-primary font-medium"
            >
              {todasSelecionadas ? 'Desmarcar todas' : 'Marcar todas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PaginaFiltros({ busca, status, multiStatus, select, periodo, onLimpar }: PaginaFiltrosProps) {
  const ativo =
    (busca ? busca.valor !== '' : false) ||
    (status ? status.valor !== 'todos' : false) ||
    (select ? select.valor !== 'todos' : false) ||
    (multiStatus ? !arraysIguais(multiStatus.valor, multiStatus.padrao ?? []) : false) ||
    (periodo ? periodo.inicio !== '' || periodo.fim !== '' : false);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {busca && (
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={busca.valor}
            onChange={(e) => busca.onChange(e.target.value)}
            placeholder={busca.placeholder ?? 'Buscar...'}
            className="input-field py-2 pl-9"
          />
        </div>
      )}

      {multiStatus && <MultiSelectFiltro {...multiStatus} />}

      {status && (
        <select
          value={status.valor}
          onChange={(e) => status.onChange(e.target.value)}
          className="input-field py-2 w-auto"
          title={status.rotulo}
        >
          {status.opcoes.map((op) => (
            <option key={op.valor} value={op.valor}>
              {op.label}
            </option>
          ))}
        </select>
      )}

      {select && (
        <select
          value={select.valor}
          onChange={(e) => select.onChange(e.target.value)}
          className="input-field py-2 w-auto"
          title={select.rotulo}
        >
          {select.opcoes.map((op) => (
            <option key={op.valor} value={op.valor}>
              {op.label}
            </option>
          ))}
        </select>
      )}

      {periodo && (
        <>
          <input
            type="date"
            value={periodo.inicio}
            onChange={(e) => periodo.onInicio(e.target.value)}
            className="input-field py-2 w-auto"
            title="Data inicial"
          />
          <span className="text-text-muted">até</span>
          <input
            type="date"
            value={periodo.fim}
            onChange={(e) => periodo.onFim(e.target.value)}
            className="input-field py-2 w-auto"
            title="Data final"
          />
        </>
      )}

      {ativo && (
        <button
          onClick={onLimpar}
          className="p-2 rounded-lg border border-border-subtle hover:bg-bg-muted transition-colors"
          title="Limpar filtros"
        >
          <X size={16} className="text-text-secondary" />
        </button>
      )}
    </div>
  );
}
