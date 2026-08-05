import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { Fabricacao, ProdutoFabricado } from '../api';

const QTD_CASAS = 2;

interface Props {
  titulo: string;
  inicial: Fabricacao | null;
  produtos: ProdutoFabricado[];
  onCancel: () => void;
  onSalvar: (data: Fabricacao) => Promise<void>;
}

export default function FabricacaoModal({ titulo, inicial, produtos, onCancel, onSalvar }: Props) {
  const [produtoId, setProdutoId] = useState(inicial?.produto_fabricado_id ? String(inicial.produto_fabricado_id) : '');
  const [qtd, setQtd] = useState(inicial?.quantidade_produzida ? numeroParaDecimal(inicial.quantidade_produzida, QTD_CASAS) : '');
  const [dataFabricacao, setDataFabricacao] = useState(inicial?.data_fabricacao ?? new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const qtdParsed = qtd ? Number(qtd.replace(/\./g, '').replace(',', '.')) : 0;

  const salvar = async () => {
    setErro('');
    if (!produtoId) {
      setErro('Selecione um produto');
      return;
    }
    if (qtdParsed <= 0) {
      setErro('Informe a quantidade produzida maior que zero');
      return;
    }
    if (!dataFabricacao) {
      setErro('Data da fabricação é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        produto_fabricado_id: Number(produtoId),
        quantidade_produzida: qtdParsed,
        data_fabricacao: dataFabricacao,
        observacao: observacao.trim(),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar fabricação');
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
            Quantidade Produzida *
          </div>
          <input
            className="modal-input"
            style={{ top: 78, width: 140 }}
            type="tel"
            inputMode="decimal"
            placeholder="0,00"
            value={qtd}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQtd(mascaraMoeda(e.target.value, QTD_CASAS))}
          />

          <div className="modal-label" style={{ top: 62, left: 176 }}>
            Data da Fabricação *
          </div>
          <input
            className="modal-input"
            style={{ top: 78, left: 176, width: 154 }}
            type="date"
            value={dataFabricacao}
            onChange={(e) => setDataFabricacao(e.target.value)}
          />

          <div className="modal-label" style={{ top: 122 }}>
            Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 138, height: 64 }}
            placeholder="Observações da fabricação"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          {erro && (
            <div className="modal-erro" style={{ top: 224 }}>
              {erro}
            </div>
          )}

          <div style={{ position: 'absolute', left: 0, top: 260, width: 350, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={onCancel} disabled={salvando}>
              Cancelar
            </button>
            <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Fabricação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
