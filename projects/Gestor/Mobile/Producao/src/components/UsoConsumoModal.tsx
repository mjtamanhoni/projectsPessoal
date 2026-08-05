import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { ProdutoFabricado, UsoConsumo } from '../api';

const QTD_CASAS = 4;

interface Props {
  titulo: string;
  inicial: UsoConsumo | null;
  produtos: ProdutoFabricado[];
  onCancel: () => void;
  onSalvar: (data: UsoConsumo) => Promise<void>;
}

export default function UsoConsumoModal({ titulo, inicial, produtos, onCancel, onSalvar }: Props) {
  const [produtoId, setProdutoId] = useState(inicial?.produto_fabricado_id ? String(inicial.produto_fabricado_id) : '');
  const [quantidade, setQuantidade] = useState(numeroParaDecimal(inicial?.quantidade, QTD_CASAS));
  const [dataUso, setDataUso] = useState(
    inicial?.data_uso ? inicial.data_uso.split('T')[0] : new Date().toISOString().slice(0, 10)
  );
  const [motivo, setMotivo] = useState(inicial?.motivo ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const qtdParsed = quantidade ? Number(quantidade.replace(/\D/g, '')) / 10000 : 0;

  const salvar = async () => {
    setErro('');
    if (!produtoId) {
      setErro('Selecione um produto');
      return;
    }
    if (qtdParsed <= 0) {
      setErro('Informe a quantidade consumida');
      return;
    }
    if (!dataUso) {
      setErro('Data do uso é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        produto_fabricado_id: Number(produtoId),
        quantidade: qtdParsed,
        data_uso: dataUso,
        motivo: motivo.trim(),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar uso/consumo');
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
            Produto *
          </div>
          <select
            className="modal-input modal-select"
            style={{ top: 22 }}
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <div className="modal-label" style={{ top: 62 }}>
            Quantidade Consumida *
          </div>
          <input
            className="modal-input"
            style={{ top: 78 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,0000"
            value={quantidade}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQuantidade(mascaraMoeda(e.target.value, QTD_CASAS))}
          />

          <div className="modal-label" style={{ top: 118 }}>
            Data do Uso *
          </div>
          <input
            className="modal-input"
            style={{ top: 134 }}
            type="date"
            value={dataUso}
            onChange={(e) => setDataUso(e.target.value)}
          />

          <div className="modal-label" style={{ top: 174 }}>
            Motivo / Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 190, height: 64 }}
            placeholder="Informe o motivo do uso/consumo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          {erro && <div className="modal-erro">{erro}</div>}

          <button className="modal-btn cancel" style={{ left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Uso/Consumo'}
          </button>
        </div>
      </div>
    </div>
  );
}