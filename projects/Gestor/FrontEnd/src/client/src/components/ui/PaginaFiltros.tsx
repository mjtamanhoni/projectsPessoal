import { Search, X } from 'lucide-react';

interface FiltoSelectProps {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; label: string }[];
  onChange: (valor: string) => void;
}

interface PaginaFiltrosProps {
  busca?: { valor: string; onChange: (valor: string) => void; placeholder?: string };
  status?: FiltoSelectProps;
  select?: FiltoSelectProps;
  periodo?: { inicio: string; fim: string; onInicio: (valor: string) => void; onFim: (valor: string) => void };
  onLimpar: () => void;
}

export function PaginaFiltros({ busca, status, select, periodo, onLimpar }: PaginaFiltrosProps) {
  const ativo =
    (busca ? busca.valor !== '' : false) ||
    (status ? status.valor !== 'todos' : false) ||
    (select ? select.valor !== 'todos' : false) ||
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