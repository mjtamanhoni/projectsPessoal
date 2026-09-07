import { useState } from 'react';
import { mascaraMoeda, decimalParaNumero } from '../format';
import type { Adicional } from '../api';

interface Props {
  titulo: string;
  inicial: Adicional | null;
  onCancel: () => void;
  onSalvar: (data: Adicional) => Promise<void>;
}

export default function AdicionalModal({ titulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [preco, setPreco] = useState(inicial?.preco != null ? String(inicial.preco).replace('.', ',') : '');
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setErro('');
    if (!nome.trim()) { setErro('Nome é obrigatório'); return; }
    const precoNum = decimalParaNumero(preco) ?? 0;
    setSalvando(true);
    try {
      await onSalvar({ nome: nome.trim(), descricao: descricao.trim() || undefined, preco: precoNum, ativo });
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
          <input className="modal-input" style={{ top: 22 }} placeholder="Nome do adicional" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
          <div className="modal-label" style={{ top: 92 }}>Descrição</div>
          <input className="modal-input" style={{ top: 108 }} placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div className="modal-label" style={{ top: 178 }}>Preço (R$) *</div>
          <input className="modal-input" style={{ top: 194 }} placeholder="0,00" value={preco} onChange={(e) => setPreco(mascaraMoeda(e.target.value, 2))} />
          <div className="modal-check-row" style={{ top: 264 }}>
            <div className={`modal-checkbox ${ativo ? 'checked' : ''}`} onClick={() => setAtivo(!ativo)}>
              {ativo && <div className="modal-check-fill" />}
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
