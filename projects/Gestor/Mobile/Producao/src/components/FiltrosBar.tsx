interface FiltroOpcao {
  valor: string;
  label: string;
}

interface FiltrosBarProps {
  busca?: { valor: string; onChange: (valor: string) => void; placeholder?: string };
  status?: { valor: string; opcoes: FiltroOpcao[]; onChange: (valor: string) => void };
  checks?: {
    opcao1: boolean;
    onOpcao1: (valor: boolean) => void;
    opcao2: boolean;
    onOpcao2: (valor: boolean) => void;
    label1: string;
    label2: string;
  };
  periodo?: {
    inicio: string;
    fim: string;
    onInicio: (valor: string) => void;
    onFim: (valor: string) => void;
  };
}

export default function FiltrosBar({ busca, status, checks, periodo }: FiltrosBarProps) {
  return (
    <div className="filtros-bar">
      {busca && (
        <input
          type="text"
          className="filtros-busca"
          value={busca.valor}
          onChange={(e) => busca.onChange(e.target.value)}
          placeholder={busca.placeholder ?? 'Buscar...'}
        />
      )}

      {status && (
        <select className="filtros-select" value={status.valor} onChange={(e) => status.onChange(e.target.value)}>
          {status.opcoes.map((op) => (
            <option key={op.valor} value={op.valor}>
              {op.label}
            </option>
          ))}
        </select>
      )}

      {checks && (
        <div className="filtros-checks">
          <label className="filtros-check">
            <input
              type="checkbox"
              className="filtros-checkbox"
              checked={checks.opcao1}
              onChange={(e) => checks.onOpcao1(e.target.checked)}
            />
            <span>{checks.label1}</span>
          </label>
          <label className="filtros-check">
            <input
              type="checkbox"
              className="filtros-checkbox"
              checked={checks.opcao2}
              onChange={(e) => checks.onOpcao2(e.target.checked)}
            />
            <span>{checks.label2}</span>
          </label>
        </div>
      )}

      {periodo && (
        <div className="filtros-row">
          <input
            type="date"
            className="filtros-data"
            value={periodo.inicio}
            onChange={(e) => periodo.onInicio(e.target.value)}
          />
          <input
            type="date"
            className="filtros-data"
            value={periodo.fim}
            onChange={(e) => periodo.onFim(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}