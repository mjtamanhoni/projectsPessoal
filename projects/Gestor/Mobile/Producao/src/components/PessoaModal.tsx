import { useState } from 'react';
import { emailValido, mascaraCpfCnpj, mascaraTelefone } from '../format';

interface Pessoa {
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  endereco?: string;
  email?: string;
  cnpj_cpf?: string;
  status?: number;
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
  const [documento, setDocumento] = useState(inicial?.cnpj_cpf ? mascaraCpfCnpj(inicial.cnpj_cpf) : '');
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '');
  const [celular, setCelular] = useState(inicial?.celular ?? '');
  const [endereco, setEndereco] = useState(inicial?.endereco ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
  const [status, setStatus] = useState<number>(inicial?.status == null ? 1 : Number(inicial.status));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const exigirDocumento = rotulo === 'cliente';

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
    const doc = documento.replace(/\D/g, '');
    if (exigirDocumento && doc.length < 11) {
      setErro('Documento (CPF/CNPJ) é obrigatório');
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
        cnpj_cpf: doc,
        telefone: telefone.trim(),
        celular: celular.trim(),
        endereco: endereco.trim(),
        email: email.trim(),
        status,
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
            Documento (CPF/CNPJ) {exigirDocumento ? '*' : ''}
          </div>
          <input
            className="modal-input"
            style={{ top: 88 }}
            type="tel"
            inputMode="numeric"
            placeholder="CPF ou CNPJ"
            value={documento}
            onChange={(e) => setDocumento(mascaraCpfCnpj(e.target.value))}
          />

          <div className="modal-label" style={{ top: 138 }}>
            Telefone
          </div>
          <input
            className="modal-input"
            style={{ top: 154 }}
            type="tel"
            inputMode="numeric"
            placeholder="(00) 0000-0000"
            value={telefone}
            onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          />

          <div className="modal-label" style={{ top: 204 }}>
            Celular
          </div>
          <input
            className="modal-input"
            style={{ top: 220 }}
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            value={celular}
            onChange={(e) => setCelular(mascaraTelefone(e.target.value))}
          />

          <div className="modal-label" style={{ top: 270 }}>
            Endereço
          </div>
          <input
            className="modal-input"
            style={{ top: 286 }}
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
          />

          <div className="modal-label" style={{ top: 336 }}>
            Email
          </div>
          <input
            className="modal-input"
            style={{ top: 352 }}
            type="email"
            inputMode="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="modal-label" style={{ top: 398 }}>
            Status
          </div>
          <div className="modal-check-row" style={{ top: 414 }}>
            <label className="modal-check-label" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" className="filtros-checkbox" checked={status === 1} onChange={() => setStatus(1)} />
              Ativo
            </label>
            <label className="modal-check-label" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" className="filtros-checkbox" checked={status === 0} onChange={() => setStatus(0)} />
              Inativo
            </label>
          </div>

          {erro && <div className="modal-erro" style={{ top: 462 }}>{erro}</div>}

          <button className="modal-btn cancel" style={{ top: 490, left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ top: 490, left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}