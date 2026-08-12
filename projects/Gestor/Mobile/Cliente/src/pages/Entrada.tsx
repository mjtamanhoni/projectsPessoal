import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buscarClientePorDocumento,
  extrairErro,
  getDocumentoLembrado,
  getEmpresaSelecionadaMemoria,
  listarEmpresas,
  setDocumentoLembrado,
  setEmpresaSelecionadaMemoria,
  type EmpresaPublic,
} from '../api';
import { useSessao } from '../auth';
import { mascaraCpfCnpj } from '../format';

export default function Entrada() {
  const navigate = useNavigate();
  const { entrar, empresa: empresaSessao, cliente } = useSessao();

  const [empresas, setEmpresas] = useState<EmpresaPublic[]>([]);
  const [empresaAberta, setEmpresaAberta] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaPublic | null>(
    empresaSessao || getEmpresaSelecionadaMemoria()
  );
  const [documento, setDocumento] = useState(() => getDocumentoLembrado() || cliente?.cnpj_cpf || '');
  const [documentoBloqueado, setDocumentoBloqueado] = useState(() => !!getDocumentoLembrado());
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

  const limparDocumento = () => {
    setDocumento('');
    setDocumentoBloqueado(false);
    setDocumentoLembrado('');
  };

  const continuar = async () => {
    setErro('');
    if (!empresaSelecionada) {
      setErro('Selecione a empresa');
      return;
    }
    const doc = documento.replace(/\D/g, '');
    if (doc.length < 11) {
      setErro('Informe o documento (CPF/CNPJ)');
      return;
    }
    setLoading(true);
    try {
      setDocumentoLembrado(doc);
      const clientes = await buscarClientePorDocumento(empresaSelecionada.id, doc);
      if (clientes.length === 0) {
        navigate('/cadastro', { state: { documento: doc, empresa: empresaSelecionada } });
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
      <div className="auth-subtitle">Acompanhe suas encomendas em poucos passos</div>

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
                  setEmpresaSelecionadaMemoria(e);
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
          style={{ top: 130, ...(documentoBloqueado ? { background: '#f0f2f0', color: '#9ca09d' } : {}) }}
          type="tel"
          inputMode="numeric"
          placeholder="Digite seu CPF ou CNPJ"
          value={documento}
          disabled={documentoBloqueado}
          onChange={(e) => setDocumento(mascaraCpfCnpj(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') continuar();
          }}
        />
        {documentoBloqueado && (
          <div style={{ position: 'absolute', left: 20, top: 173, fontSize: 10, color: '#9ca09d' }}>
            Documento salvo neste aparelho{' '}
            <span style={{ color: '#2563eb', textDecoration: 'underline' }} onClick={limparDocumento}>
              (trocar)
            </span>
          </div>
        )}

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
        Cliente v1.2
      </div>
    </div>
  );
}
