import { useState } from 'react';
import { emailValido, mascaraTelefone } from '../format';

interface Pessoa {
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  email?: string;
}

interface Props {
  titulo: string;
  rotulo: string;
  inicial: Pessoa | null;
  onCancel: () => void;
  onSalvar: (data: Pessoa) => Promise<void>;
}

export default function PessoaModal({ titulo, rotulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '');
  const [celular, setCelular] = useState(inicial?.celular ?? '');
  const [endereco, setEndereco] = useState(inicial?.endereco ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
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
    if (!emailValido(email)) {
      setErro('Email inválido');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        telefone: telefone.trim(),
        celular: celular.trim(),
        endereco: endereco.trim(),
        email: email.trim(),
      });
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
            placeholder={`Nome do ${rotulo.toLowerCase()}`}
            value={nome}
            autoFocus
            onChange={(e) => setNome(e.target.value)}
          />

          <div className="modal-label" style={{ top: 72 }}>
            Telefone
          </div>
          <input
            className="modal-input"
            style={{ top: 88 }}
            type="tel"
            inputMode="numeric"
            placeholder="(00) 0000-0000"
            value={telefone}
            onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          />

          <div className="modal-label" style={{ top: 138 }}>
            Celular
          </div>
          <input
            className="modal-input"
            style={{ top: 154 }}
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            value={celular}
            onChange={(e) => setCelular(mascaraTelefone(e.target.value))}
          />

          <div className="modal-label" style={{ top: 204 }}>
            Endereço
          </div>
          <input
            className="modal-input"
            style={{ top: 220 }}
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
          />

          <div className="modal-label" style={{ top: 270 }}>
            Email
          </div>
          <input
            className="modal-input"
            style={{ top: 286 }}
            type="email"
            inputMode="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {erro && <div className="modal-erro" style={{ top: 336 }}>{erro}</div>}

          <button className="modal-btn cancel" style={{ top: 366, left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ top: 366, left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
