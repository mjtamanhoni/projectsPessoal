import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { criarClientePublico, extrairErro, setDocumentoLembrado, type EmpresaPublic } from '../api';
import { useSessao } from '../auth';
import BackButton from '../components/BackButton';
import { mascaraCpfCnpj, mascaraTelefone } from '../format';

interface LocationState {
  documento?: string;
  empresa?: EmpresaPublic;
}

export default function Cadastro() {
  const navigate = useNavigate();
  const { empresa: empresaSessao, entrar } = useSessao();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const empresa = empresaSessao || state.empresa || null;

  useEffect(() => {
    if (!empresa) navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa]);

  const [documento, setDocumento] = useState(state.documento || '');
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [endereco, setEndereco] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  if (!empresa) return null;

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
        endereco: endereco.trim(),
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
        endereco: endereco.trim(),
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
        Complete seu cadastro
      </div>
      <div className="auth-subtitle" style={{ top: 76 }}>
        Ainda não temos seu cadastro
      </div>

      <div className="auth-card" style={{ top: 110, height: '520px' }}>
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
          Endereço (opcional)
        </div>
        <input
          className="field-input"
          style={{ top: 300 }}
          placeholder="Rua, número, bairro..."
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
        />

        <div className="field-label" style={{ top: 368 }}>
          E-mail (opcional)
        </div>
        <input
          className="field-input"
          style={{ top: 388 }}
          type="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {erro && (
          <div style={{ position: 'absolute', left: 20, top: 452, fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>
        )}

        <button className="green-button" style={{ top: 478 }} onClick={salvar} disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar e continuar'}
        </button>
      </div>

      <div className="version" style={{ top: 660 }}>
        Cliente v1.2
      </div>
    </div>
  );
}
