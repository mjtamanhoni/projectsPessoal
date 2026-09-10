import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { criarClientePublico, extrairErro, setDocumentoLembrado, VERSAO_APP, type Cliente, type EmpresaPublic } from '../api';
import { useSessao } from '../auth';
import BackButton from '../components/BackButton';
import { mascaraCpfCnpj, mascaraTelefone, mascaraCep, buscarCep } from '../format';

interface LocationState {
  documento?: string;
  empresa?: EmpresaPublic;
  clienteExistente?: Cliente | null;
}

export default function Cadastro() {
  const navigate = useNavigate();
  const { empresa: empresaSessao, entrar } = useSessao();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const empresa = empresaSessao || state.empresa || null;
  const existente = state.clienteExistente || null;

  useEffect(() => {
    if (!empresa) navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa]);

  const [documento, setDocumento] = useState(state.documento || existente?.cnpj_cpf || '');
  const [nome, setNome] = useState(existente?.nome || '');
  const [celular, setCelular] = useState(existente?.celular || '');
  const [cep, setCep] = useState(existente?.cep || '');
  const [endereco, setEndereco] = useState(existente?.endereco || '');
  const [nr, setNr] = useState(existente?.nr || '');
  const [complemento, setComplemento] = useState(existente?.complemento || '');
  const [bairro, setBairro] = useState(existente?.bairro || '');
  const [cidade, setCidade] = useState(existente?.cidade || '');
  const [uf, setUf] = useState(existente?.uf || '');
  const [email, setEmail] = useState(existente?.email || '');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  if (!empresa) return null;

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
    if (nome.trim().length < 3) {
      setErro('Informe seu nome completo');
      return;
    }
    if (documento.replace(/\D/g, '').length < 11) {
      setErro('Informe seu documento (CPF/CNPJ)');
      return;
    }
    setLoading(true);
    try {
      const criado = await criarClientePublico(empresa.id, {
        nome: nome.trim(),
        cnpj_cpf: documento,
        celular: celular.replace(/\D/g, ''),
        cep: cep.replace(/\D/g, ''),
        endereco: endereco.trim(),
        nr: nr.trim(),
        complemento: complemento.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim(),
        email: email.trim(),
        status: 1,
      });
      if (!criado?.id) {
        throw new Error('Resposta inválida do servidor');
      }
      setDocumentoLembrado(documento.replace(/\D/g, ''));
      entrar(empresa, {
        id: criado.id,
        nome: nome.trim(),
        cnpj_cpf: documento,
        celular: celular.replace(/\D/g, ''),
        cep: cep.replace(/\D/g, ''),
        endereco: endereco.trim(),
        nr: nr.trim(),
        complemento: complemento.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim(),
        email: email.trim(),
        status: 1,
      });
      navigate('/minhas-encomendas', { replace: true });
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <BackButton onClick={() => navigate('/')} />

      <div className="auth-title" style={{ top: 40, fontSize: 22 }}>
        {existente ? 'Confirme seu cadastro' : 'Complete seu cadastro'}
      </div>
      <div className="auth-subtitle" style={{ top: 76 }}>
        {existente
          ? 'Encontramos seu cadastro em outra empresa. Confirme os dados.'
          : 'Ainda não temos seu cadastro'}
      </div>

      <div className="auth-card" style={{ top: 110, height: '680px', overflowY: 'auto' }}>
        <div className="field-label" style={{ top: 16 }}>
          Documento (CPF/CNPJ) *
        </div>
        <input
          className="field-input"
          style={{ top: 36 }}
          type="tel"
          inputMode="numeric"
          placeholder="CPF ou CNPJ"
          value={documento}
          onChange={(e) => setDocumento(mascaraCpfCnpj(e.target.value))}
        />

        <div className="field-label" style={{ top: 104 }}>
          Nome completo *
        </div>
        <input
          className="field-input"
          style={{ top: 124 }}
          placeholder="Como você quer ser chamado?"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <div className="field-label" style={{ top: 192 }}>
          Celular (WhatsApp) (opcional)
        </div>
        <input
          className="field-input"
          style={{ top: 212 }}
          type="tel"
          inputMode="tel"
          placeholder="(00) 00000-0000"
          value={celular}
          onChange={(e) => setCelular(mascaraTelefone(e.target.value))}
        />

        <div className="field-label" style={{ top: 280 }}>
          CEP (opcional)
        </div>
        <input
          className="field-input"
          style={{ top: 300 }}
          type="tel"
          inputMode="numeric"
          placeholder={buscandoCep ? 'Buscando endereço...' : '00000-000'}
          value={cep}
          onChange={(e) => setCep(mascaraCep(e.target.value))}
          onBlur={() => handleCepBlur(cep)}
        />

        <div className="field-label" style={{ top: 368 }}>
          Endereço (opcional)
        </div>
        <input
          className="field-input"
          style={{ top: 388 }}
          placeholder="Endereço"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
        />

        <div className="field-label" style={{ top: 448 }}>
          Complemento (opcional)
        </div>
        <textarea
          className="field-input"
          style={{ top: 468, height: 56, resize: 'none', paddingTop: 6 }}
          placeholder="Complemento do endereço"
          value={complemento}
          onChange={(e) => setComplemento(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 8, position: 'absolute', top: 544, left: 16, right: 16 }}>
          <input
            className="field-input"
            style={{ flex: 1, position: 'static', width: 'auto' }}
            placeholder="Nº"
            value={nr}
            onChange={(e) => setNr(e.target.value)}
          />
        </div>

        <div className="field-label" style={{ top: 602 }}>
          Bairro (opcional)
        </div>
        <input
          className="field-input"
          style={{ top: 622 }}
          placeholder="Bairro"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 8, position: 'absolute', top: 690, left: 16, right: 16 }}>
          <input
            className="field-input"
            style={{ flex: 1, position: 'static', width: 'auto' }}
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
          <select
            className="field-input"
            style={{ width: 60, position: 'static', padding: '6px 4px', fontSize: 13 }}
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="">UF</option>
            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="field-label" style={{ top: 758 }}>
          E-mail (opcional)
        </div>
        <input
          className="field-input"
          style={{ top: 778 }}
          type="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {erro && (
          <div style={{ position: 'absolute', left: 20, top: 838, fontSize: 11, color: '#FF3B30' }}>
            {erro}
          </div>
        )}

        <button className="green-button" style={{ top: 864 }} onClick={salvar} disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar e continuar'}
        </button>
      </div>

      <div className="version" style={{ top: 820 }}>
        Cliente v{VERSAO_APP}
      </div>
    </div>
  );
}
