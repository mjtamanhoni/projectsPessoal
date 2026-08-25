import { useState } from 'react';
import { emailValido, mascaraCpfCnpj, mascaraTelefone, mascaraCep, buscarCep } from '../format';

interface Pessoa {
  id?: number;
  nome: string;
  telefone?: string;
  celular?: string;
  nr?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
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

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export default function PessoaModal({ titulo, rotulo, inicial, onCancel, onSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [documento, setDocumento] = useState(inicial?.cnpj_cpf ? mascaraCpfCnpj(inicial.cnpj_cpf) : '');
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '');
  const [celular, setCelular] = useState(inicial?.celular ?? '');
  const [cep, setCep] = useState(inicial?.cep ?? '');
  const [endereco, setEndereco] = useState(inicial?.endereco ?? '');
  const [nr, setNr] = useState(inicial?.nr ?? '');
  const [complemento, setComplemento] = useState(inicial?.complemento ?? '');
  const [bairro, setBairro] = useState(inicial?.bairro ?? '');
  const [cidade, setCidade] = useState(inicial?.cidade ?? '');
  const [uf, setUf] = useState(inicial?.uf ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
  const [status, setStatus] = useState<number>(inicial?.status == null ? 1 : Number(inicial.status));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

  const exigirDocumento = rotulo === 'cliente';

  const handleCepBlur = async (valor: string) => {
    const nums = valor.replace(/\D/g, '');
    if (nums.length !== 8) return;
    setBuscandoCep(true);
    try {
      const result = await buscarCep(valor);
      if (result) {
        if (result.logradouro) setEndereco(result.logradouro);
        if (result.bairro) setBairro(result.bairro);
        if (result.localidade) setCidade(result.localidade);
        if (result.uf) setUf(result.uf);
      }
    } finally {
      setBuscandoCep(false);
    }
  };

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
        cep: cep.trim(),
        endereco: endereco.trim(),
        nr: nr.trim(),
        complemento: complemento.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim(),
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

        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '80vh' }}>
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
            CEP
          </div>
          <input
            className="modal-input"
            style={{ top: 286 }}
            type="tel"
            inputMode="numeric"
            placeholder={buscandoCep ? 'Buscando...' : '00000-000'}
            value={cep}
            onChange={(e) => setCep(mascaraCep(e.target.value))}
            onBlur={() => handleCepBlur(cep)}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}>
              <div className="modal-label" style={{ top: 336 }}>
                Endereço
              </div>
              <input
                className="modal-input"
                style={{ top: 352, width: 'calc(100% - 4px)' }}
                placeholder="Endereço"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>
            <div style={{ flex: 3 }}>
              <div className="modal-label" style={{ top: 336 }}>
                Complemento
              </div>
              <textarea
                className="modal-input"
                style={{ top: 352, width: 'calc(100% - 4px)', height: 56, resize: 'none', paddingTop: 6 }}
                placeholder="Complemento do endereço"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-label" style={{ top: 420 }}>
            Número
          </div>
          <input
            className="modal-input"
            style={{ top: 436 }}
            placeholder="Número"
            value={nr}
            onChange={(e) => setNr(e.target.value)}
          />

          <div className="modal-label" style={{ top: 490 }}>
            Bairro
          </div>
          <input
            className="modal-input"
            style={{ top: 506 }}
            placeholder="Bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="modal-label" style={{ top: 556 }}>
                Cidade
              </div>
              <input
                className="modal-input"
                style={{ top: 572, width: 'calc(100% - 8px)' }}
                placeholder="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>
            <div style={{ width: 70 }}>
              <div className="modal-label" style={{ top: 556 }}>
                UF
              </div>
              <select
                className="modal-input"
                style={{ top: 572, width: 62, padding: '6px 4px', fontSize: 13 }}
                value={uf}
                onChange={(e) => setUf(e.target.value)}
              >
                <option value="">UF</option>
                {UF_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-label" style={{ top: 622 }}>
            Email
          </div>
          <input
            className="modal-input"
            style={{ top: 638 }}
            type="email"
            inputMode="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="modal-label" style={{ top: 688 }}>
            Status
          </div>
          <div className="modal-check-row" style={{ top: 704 }}>
            <label className="modal-check-label" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" className="filtros-checkbox" checked={status === 1} onChange={() => setStatus(1)} />
              Ativo
            </label>
            <label className="modal-check-label" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" className="filtros-checkbox" checked={status === 0} onChange={() => setStatus(0)} />
              Inativo
            </label>
          </div>

          {erro && <div className="modal-erro" style={{ top: 750 }}>{erro}</div>}

          <button className="modal-btn cancel" style={{ top: 778, left: 30 }} onClick={onCancel} disabled={salvando}>
            Cancelar
          </button>
          <button className="modal-btn save" style={{ top: 778, left: 190 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
