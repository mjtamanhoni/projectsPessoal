import { useState } from 'react';
import type { CustoAdicionalTipo } from '../api';

interface Props {
  titulo: string;
  inicial: CustoAdicionalTipo | null;
  onCancel: () => void;
  onSalvar: (data: CustoAdicionalTipo) => Promise<void>;
}

export default function CustoAdicionalModal({ titulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setErro('');
    if (!nome.trim()) {
      setErro('Nome é obrigatório');
      return;
    }
    if (nome.trim().length > 200) {
      setErro('Nome deve ter no máximo 200 caracteres');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({ nome: nome.trim(), ativo });
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
            placeholder="Nome do tipo de custo"
            value={nome}
            autoFocus
            onChange={(e) => setNome(e.target.value)}
          />

          <div className="modal-check-row" style={{ top: 92 }}>
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
