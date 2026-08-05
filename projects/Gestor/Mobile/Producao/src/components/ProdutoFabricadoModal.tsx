import { useState } from 'react';
import { mascaraMoeda, mascaraNumero, decimalParaNumero, numeroParaDecimal } from '../format';
import type { ProdutoFabricado } from '../api';

const UNIDADES = ['kg', 'L', 'un', 'g', 'ml'];
const CUSTO_CASAS = 2;

interface Props {
  titulo: string;
  inicial: ProdutoFabricado | null;
  onCancel: () => void;
  onSalvar: (data: ProdutoFabricado) => Promise<void>;
}

export default function ProdutoFabricadoModal({ titulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [rendimento, setRendimento] = useState(
    inicial?.rendimento != null ? numeroParaDecimal(inicial.rendimento, 6) : '12,000000'
  );
  const [unidade, setUnidade] = useState(inicial?.unidade_medida ?? '');
  const [custo, setCusto] = useState(numeroParaDecimal(inicial?.custo_unitario, CUSTO_CASAS));
  const [margem, setMargem] = useState(numeroParaDecimal(inicial?.margem_lucro, CUSTO_CASAS));
  const [venda, setVenda] = useState(numeroParaDecimal(inicial?.valor_venda_sugerido, CUSTO_CASAS));
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setErro('');
    if (!nome.trim()) {
      setErro('Nome é obrigatório');
      return;
    }
    if (!unidade) {
      setErro('Unidade de medida é obrigatória');
      return;
    }
    const rendNum = decimalParaNumero(rendimento);
    if (rendNum == null || rendNum <= 0) {
      setErro('Rendimento inválido');
      return;
    }
    const custoNum = decimalParaNumero(custo);
    const margemNum = decimalParaNumero(margem);
    const vendaNum = decimalParaNumero(venda);
    for (const [label, v] of [
      ['Custo unitário', custoNum],
      ['Margem de lucro', margemNum],
      ['Valor de venda', vendaNum],
    ] as const) {
      if (v != null && v < 0) {
        setErro(`${label} inválido`);
        return;
      }
    }
    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        descricao: descricao.trim(),
        rendimento: rendNum,
        unidade_medida: unidade,
        custo_unitario: custoNum,
        margem_lucro: margemNum,
        valor_venda_sugerido: vendaNum,
        ativo,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar produto');
      setSalvando(false);
    }
  };

  const moeda = (v: string, setV: (s: string) => void) => ({
    value: v,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV(mascaraMoeda(e.target.value, CUSTO_CASAS)),
    onBlur: () => {
      if (v.trim() !== '') {
        const n = decimalParaNumero(v);
        if (n != null) setV(numeroParaDecimal(n, CUSTO_CASAS));
      }
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-label" style={{ top: 6 }}>
            Nome *
          </div>
          <input
            className="modal-input"
            style={{ top: 22 }}
            placeholder="Nome do produto"
            value={nome}
            autoFocus
            onChange={(e) => setNome(e.target.value)}
          />

          <div className="modal-label" style={{ top: 72 }}>
            Descrição
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 88, height: 64 }}
            placeholder="Descrição do produto"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <div className="modal-label" style={{ top: 172 }}>
            Rendimento
          </div>
          <input
            className="modal-input"
            style={{ top: 188 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,000000"
            value={rendimento}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setRendimento(mascaraNumero(e.target.value, 6))}
          />

          <div className="modal-label" style={{ top: 238 }}>
            Unidade de Medida *
          </div>
          <select
            className="modal-input modal-select"
            style={{ top: 254 }}
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
          >
            <option value="">Selecione...</option>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <div className="modal-label" style={{ top: 304 }}>
            Custo Unitário
          </div>
          <input className="modal-input" style={{ top: 320 }} type="tel" inputMode="decimal" placeholder="0,00" {...moeda(custo, setCusto)} />

          <div className="modal-label" style={{ top: 370 }}>
            Margem de Lucro (%)
          </div>
          <input className="modal-input" style={{ top: 386 }} type="tel" inputMode="decimal" placeholder="0,00" {...moeda(margem, setMargem)} />

          <div className="modal-label" style={{ top: 436 }}>
            Valor Venda Sugerido
          </div>
          <input className="modal-input" style={{ top: 452 }} type="tel" inputMode="decimal" placeholder="0,00" {...moeda(venda, setVenda)} />

          <div className="modal-check-row" style={{ top: 508 }}>
            <div className={`modal-checkbox ${ativo ? 'checked' : ''}`} onClick={() => setAtivo(!ativo)}>
              {ativo && <div className="modal-check-fill" />}
            </div>
            <span className="modal-check-label">Ativo</span>
          </div>

          {erro && <div className="modal-erro" style={{ top: 548 }}>{erro}</div>}

          <button className="modal-btn cancel" style={{ top: 578, left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ top: 578, left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
