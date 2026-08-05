import { useState } from 'react';
import { mascaraMoeda, numeroParaDecimal } from '../format';
import type { Insumo, PerdaInsumo } from '../api';

const QTD_CASAS = 4;

interface Props {
  titulo: string;
  inicial: PerdaInsumo | null;
  insumos: Insumo[];
  onCancel: () => void;
  onSalvar: (data: PerdaInsumo) => Promise<void>;
}

export default function PerdaInsumoModal({ titulo, inicial, insumos, onCancel, onSalvar }: Props) {
  const [insumoId, setInsumoId] = useState(inicial?.insumo_id ? String(inicial.insumo_id) : '');
  const [quantidade, setQuantidade] = useState(numeroParaDecimal(inicial?.quantidade, QTD_CASAS));
  const [dataPerda, setDataPerda] = useState(
    inicial?.data_perda ? inicial.data_perda.split('T')[0] : new Date().toISOString().slice(0, 10)
  );
  const [motivo, setMotivo] = useState(inicial?.motivo ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const qtdParsed = quantidade ? Number(quantidade.replace(/\D/g, '')) / 10000 : 0;

  const salvar = async () => {
    setErro('');
    if (!insumoId) {
      setErro('Selecione um insumo');
      return;
    }
    if (qtdParsed <= 0) {
      setErro('Informe a quantidade perdida');
      return;
    }
    if (!dataPerda) {
      setErro('Data da perda é obrigatória');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        id: inicial?.id ?? inicial?.codigo,
        insumo_id: Number(insumoId),
        quantidade: qtdParsed,
        data_perda: dataPerda,
        motivo: motivo.trim(),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar perda');
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
            Insumo *
          </div>
          <select
            className="modal-input modal-select"
            style={{ top: 22 }}
            value={insumoId}
            onChange={(e) => setInsumoId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>

          <div className="modal-label" style={{ top: 62 }}>
            Quantidade Perdida *
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
            Data da Perda *
          </div>
          <input
            className="modal-input"
            style={{ top: 134 }}
            type="date"
            value={dataPerda}
            onChange={(e) => setDataPerda(e.target.value)}
          />

          <div className="modal-label" style={{ top: 174 }}>
            Motivo / Observação
          </div>
          <textarea
            className="modal-input modal-textarea"
            style={{ top: 190, height: 64 }}
            placeholder="Informe o motivo da perda"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          {erro && <div className="modal-erro">{erro}</div>}

          <button className="modal-btn cancel" style={{ left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Perda'}
          </button>
        </div>
      </div>
    </div>
  );
}