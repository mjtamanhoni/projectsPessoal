import { useState } from 'react';
import { mascaraMoeda, decimalParaNumero, numeroParaDecimal } from '../format';
import type { Fornecedor, Insumo, Marca } from '../api';

const UNIDADES = ['kg', 'L', 'un', 'g', 'ml'];
const CUSTO_CASAS = 2;

interface Props {
  titulo: string;
  inicial: Insumo | null;
  fornecedores: Fornecedor[];
  marcas: Marca[];
  onCancel: () => void;
  onSalvar: (data: Insumo) => Promise<void>;
}

export default function InsumoModal({ titulo, inicial, fornecedores, marcas, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [unidade, setUnidade] = useState(inicial?.unidade_medida ?? '');
  const [custo, setCusto] = useState(numeroParaDecimal(inicial?.custo_medio, CUSTO_CASAS));
  const [fornecedor, setFornecedor] = useState(inicial?.id_fornecedor ? String(inicial.id_fornecedor) : '');
  const [marca, setMarca] = useState(inicial?.id_marca ? String(inicial.id_marca) : '');
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
    const custoNum = decimalParaNumero(custo);
    if (custo.trim() !== '' && (custoNum == null || custoNum < 0)) {
      setErro('Custo médio inválido');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        unidade_medida: unidade,
        custo_medio: custoNum,
        ativo,
        id_fornecedor: fornecedor ? Number(fornecedor) : null,
        id_marca: marca ? Number(marca) : null,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar insumo');
      setSalvando(false);
    }
  };

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
            placeholder="Nome do insumo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <div className="modal-label" style={{ top: 62 }}>
            Unidade de Medida *
          </div>
          <select
            className="modal-input modal-select"
            style={{ top: 78 }}
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

          <div className="modal-label" style={{ top: 118 }}>
            Custo Médio
          </div>
          <input
            className="modal-input"
            style={{ top: 134 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={custo}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setCusto(mascaraMoeda(e.target.value, CUSTO_CASAS))}
            onBlur={() => {
              if (custo.trim() !== '') {
                const n = decimalParaNumero(custo);
                if (n != null) setCusto(numeroParaDecimal(n, CUSTO_CASAS));
              }
            }}
          />

          <div className="modal-label" style={{ top: 174 }}>
            Fornecedor
          </div>
          <select
            className="modal-input modal-select"
            style={{ top: 190 }}
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
          >
            <option value="">Selecione...</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>

          <div className="modal-label" style={{ top: 230 }}>
            Marca
          </div>
          <select
            className="modal-input modal-select"
            style={{ top: 246 }}
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
          >
            <option value="">Selecione...</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>

          <div className="modal-check-row" style={{ top: 288 }}>
            <div className={`modal-checkbox ${ativo ? 'checked' : ''}`} onClick={() => setAtivo(!ativo)}>
              {ativo && <div className="modal-check-fill" />}
            </div>
            <span className="modal-check-label">Ativo</span>
          </div>

          {erro && <div className="modal-erro">{erro}</div>}

          <button className="modal-btn cancel" style={{ left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
