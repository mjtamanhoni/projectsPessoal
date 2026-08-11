import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscarClientePorDocumento, extrairErro, listarEmpresas, type EmpresaPublic } from '../api';
import { useSessao } from '../auth';

function mascaraCpfCnpj(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  if (numbers.length <= 13) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

export default function Entrada() {
  const navigate = useNavigate();
  const { entrar, empresa: empresaSessao, cliente } = useSessao();

  const [empresas, setEmpresas] = useState<EmpresaPublic[]>([]);
  const [empresaAberta, setEmpresaAberta] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaPublic | null>(empresaSessao);
  const [documento, setDocumento] = useState(cliente?.cnpj_cpf || '');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (empresas.length > 0) return;
    listarEmpresas()
      .then((lista) => {
        setEmpresas(lista);
        if (lista.length === 1 && !empresaSelecionada) setEmpresaSelecionada(lista[0]);
      })
      .catch((e) => setErro(extrairErro(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nomeEmpresa = (e: EmpresaPublic | null) => (e ? e.fantasia || e.razao_social : 'Selecione a empresa');

  const continuar = async () => {
    setErro('');
    if (!empresaSelecionada) {
      setErro('Selecione a empresa');
      return;
    }
    const doc = documento.replace(/\D/g, '');
    if (!doc) {
      setErro('Informe o documento (CPF/CNPJ)');
      return;
    }
    setLoading(true);
    try {
      const clientes = await buscarClientePorDocumento(empresaSelecionada.id, doc);
      if (clientes.length === 0) {
        navigate('/cadastro', { state: { documento: doc } });
        return;
      }
      entrar(empresaSelecionada, clientes[0]);
      navigate('/minhas-encomendas');
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="logo-box" style={{ marginTop: 40 }}>
        C
      </div>
      <div className="auth-title" style={{ fontSize: 26 }}>
        {nomeEmpresa(empresaSelecionada)}
      </div>
      <div className="auth-subtitle">Faça seu pedido em poucos passos</div>

      <div className="auth-card" style={{ height: 330 }}>
        <div className="field-label" style={{ top: 18 }}>
          Empresa
        </div>
        <div
          className="field-select"
          style={{ top: 38, zIndex: 20 }}
          onClick={() => setEmpresaAberta(!empresaAberta)}
        >
          <span>{nomeEmpresa(empresaSelecionada)}</span>
          <span className="arrow">{empresaAberta ? '˄' : '>'}</span>
        </div>
        {empresaAberta && (
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: 84,
              width: 'calc(100% - 40px)',
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #d6ddd0',
              zIndex: 30,
              overflow: 'hidden',
            }}
          >
            {empresas.length === 0 && (
              <div style={{ padding: 12, fontSize: 12, color: '#6b706c' }}>Carregando empresas...</div>
            )}
            {empresas.map((e) => (
              <div
                key={e.id}
                onClick={() => {
                  setEmpresaSelecionada(e);
                  setEmpresaAberta(false);
                }}
                style={{
                  padding: '12px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: e.id === empresaSelecionada?.id ? '#f5f3ee' : '#ffffff',
                  borderBottom: '1px solid #efeee9',
                }}
              >
                {e.fantasia || e.razao_social}
              </div>
            ))}
          </div>
        )}

        <div className="field-label" style={{ top: 110 }}>
          Seu documento (CPF/CNPJ)
        </div>
        <input
          className="field-input"
          style={{ top: 130 }}
          type="tel"
          inputMode="numeric"
          placeholder="Digite seu CPF ou CNPJ"
          value={documento}
          onChange={(e) => setDocumento(mascaraCpfCnpj(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') continuar();
          }}
        />

        {erro && (
          <div style={{ position: 'absolute', left: 20, top: 200, fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>
        )}

        <button className="green-button" style={{ top: 226 }} onClick={continuar} disabled={loading}>
          {loading ? 'Verificando...' : 'Continuar'}
        </button>
      </div>

      <div className="auth-footer" style={{ top: 560 }} onClick={() => navigate('/server-config')}>
        <b>Servidor do App</b>
      </div>
      <div className="auth-footer" style={{ top: 580 }} onClick={() => navigate('/server-config')}>
        Configurações do Servidor
      </div>
      <div className="version" style={{ top: 640 }}>
        Cliente v1.0
      </div>
    </div>
  );
}