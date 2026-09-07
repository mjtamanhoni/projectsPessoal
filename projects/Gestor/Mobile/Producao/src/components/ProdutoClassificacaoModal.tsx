import { useState } from 'react';
import type { ProdutoClassificacao } from '../api';

interface Props {
  titulo: string;
  inicial: ProdutoClassificacao | null;
  onCancel: () => void;
  onSalvar: (data: ProdutoClassificacao) => Promise<void>;
}

export default function ProdutoClassificacaoModal({ titulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [status, setStatus] = useState(inicial?.status ?? 1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setErro('');
    if (!nome.trim()) { setErro('Nome é obrigatório'); return; }
    setSalvando(true);
    try {
      await onSalvar({ nome: nome.trim(), status });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">{titulo}</div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-label" style={{ top: 6 }}>Nome *</div>
          <input className="modal-input" style={{ top: 22 }} placeholder="Nome da classificação" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          <div className="modal-check-row" style={{ top: 92 }}>
            <div className={`modal-checkbox ${status === 1 ? 'checked' : ''}`} onClick={() => setStatus(status === 1 ? 0 : 1)}>
              {status === 1 && <div className="modal-check-fill" />}
            </div>
            <span className="modal-check-label">Ativo</span>
          </div>
          {erro && <div className="modal-erro">{erro}</div>}
          <button className="modal-btn cancel" style={{ left: 30 }} onClick={onCancel} disabled={salvando}>Cancelar</button>
          <button className="modal-btn save" style={{ left: 190 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
