import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buscarClientePorDocumento,
  extrairErro,
  fotoUrl,
  getDocumentoLembrado,
  listarEmpresas,
  setDocumentoLembrado,
  type EmpresaPublic,
} from '../api';
import { useSessao } from '../auth';
import { mascaraCpfCnpj, mascaraTelefone } from '../format';

export default function Entrada() {
  const navigate = useNavigate();
  const { entrar, cliente } = useSessao();

  const [empresas, setEmpresas] = useState<EmpresaPublic[]>([]);
  const [documento, setDocumento] = useState(() => getDocumentoLembrado() || cliente?.cnpj_cpf || '');
  const [documentoBloqueado, setDocumentoBloqueado] = useState(() => !!getDocumentoLembrado());
  const [erro, setErro] = useState('');
  const [carregandoId, setCarregandoId] = useState<number | null>(null);
  const [carregandoLista, setCarregandoLista] = useState(true);

  useEffect(() => {
    if (empresas.length > 0) return;
    listarEmpresas(true)
      .then((lista) => setEmpresas(lista.filter((e) => Number(e.delivery) === 1)))
      .catch((e) => setErro(extrairErro(e)))
      .finally(() => setCarregandoLista(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limparDocumento = () => {
    setDocumento('');
    setDocumentoBloqueado(false);
    setDocumentoLembrado('');
  };

  const selecionarEmpresa = async (empresa: EmpresaPublic) => {
    setErro('');
    const doc = documento.replace(/\D/g, '');
    if (doc.length < 11) {
      setErro('Informe seu documento (CPF/CNPJ) para continuar');
      return;
    }
    setCarregandoId(empresa.id);
    try {
      setDocumentoLembrado(doc);
      const clientes = await buscarClientePorDocumento(empresa.id, doc);
      if (clientes.length === 0) {
        navigate('/cadastro', { state: { documento: doc, empresa } });
        return;
      }
      entrar(empresa, clientes[0]);
      navigate('/minhas-encomendas');
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setCarregandoId(null);
    }
  };

  return (
    <div className="screen">
      <div className="entrada-title">Mundo de Delícias</div>
      <div className="entrada-subtitle">Selecione quem vai preparar sua encomenda hoje.</div>

      <div className="empresa-list">
        {carregandoLista && empresas.length === 0 && (
          <div className="empresa-vazio">Carregando empresas...</div>
        )}
        {!carregandoLista && empresas.length === 0 && !erro && (
          <div className="empresa-vazio">Nenhuma empresa de delivery disponível.</div>
        )}
        {empresas.map((e) => (
          <button
            key={e.id}
            className="empresa-card"
            disabled={carregandoId !== null}
            onClick={() => selecionarEmpresa(e)}
          >
            <span className="empresa-card-logo">
              {e.logomarca ? (
                <img src={fotoUrl(e.logomarca)} alt="Logomarca" />
              ) : (
                <span className="empresa-card-inicial">{(e.fantasia || e.razao_social || 'D')[0]}</span>
              )}
            </span>
            <span className="empresa-card-nome">{e.fantasia || e.razao_social}</span>
            {e.email && <span className="empresa-card-linha">{e.email}</span>}
            {(e.celular || e.telefone) && (
              <span className="empresa-card-linha">{mascaraTelefone(e.celular || e.telefone || '')}</span>
            )}
            {carregandoId === e.id && <span className="empresa-card-carregando">Verificando...</span>}
          </button>
        ))}
      </div>

      <div className="entrada-footer-bar">
        {erro && <div className="entrada-erro">{erro}</div>}
        <div className="field-label" style={{ position: 'static', marginBottom: 6 }}>
          Seu documento (CPF/CNPJ)
        </div>
        <div className="entrada-doc-row">
          <input
            className="field-input entrada-doc-input"
            style={{
              position: 'static',
              width: '100%',
              ...(documentoBloqueado ? { background: '#f0f2f0', color: '#9ca09d' } : {}),
            }}
            type="tel"
            inputMode="numeric"
            placeholder="Digite seu CPF ou CNPJ"
            value={documento}
            disabled={documentoBloqueado}
            onChange={(e) => setDocumento(mascaraCpfCnpj(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && empresas.length === 1) selecionarEmpresa(empresas[0]);
            }}
          />
          {documentoBloqueado && (
            <button className="entrada-trocar" onClick={limparDocumento}>
              trocar
            </button>
          )}
        </div>
        <div className="entrada-rodape">
          <span style={{ fontSize: 11, color: '#9ca09d' }}>Cliente v1.2</span>
          <span
            style={{ fontSize: 11, color: '#2d5e3a', cursor: 'pointer' }}
            onClick={() => navigate('/server-config')}
          >
            Configurações do Servidor
          </span>
        </div>
      </div>
    </div>
  );
}
