import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  buscarClientePorDocumento,
  extrairErro,
  VERSAO_APP,
  fotoUrl,
  getBaseURL,
  getDocumentoLembrado,
  listarEmpresas,
  setDocumentoLembrado,
  type EmpresaPublic,
} from '../api';
import { useSessao } from '../auth';
import { mascaraCpfCnpj, mascaraTelefone } from '../format';
import QRCode from 'qrcode';

export default function Entrada() {
  const navigate = useNavigate();
  const { entrar, cliente } = useSessao();

  const [empresas, setEmpresas] = useState<EmpresaPublic[]>([]);
  const [documento, setDocumento] = useState(() => getDocumentoLembrado() || cliente?.cnpj_cpf || '');
  const [documentoBloqueado, setDocumentoBloqueado] = useState(() => !!getDocumentoLembrado());
  const [erro, setErro] = useState('');
  const [carregandoId, setCarregandoId] = useState<number | null>(null);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

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
              ...(documentoBloqueado ? { background: 'rgba(50, 50, 50, 0.5)', color: '#707070' } : {}),
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
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='1.5'%3E%3Crect x='2' y='2' width='8' height='8' rx='1'/%3E%3Crect x='14' y='2' width='8' height='8' rx='1'/%3E%3Crect x='2' y='14' width='8' height='8' rx='1'/%3E%3Crect x='5' y='5' width='2' height='2'/%3E%3Crect x='17' y='5' width='2' height='2'/%3E%3Crect x='5' y='17' width='2' height='2'/%3E%3Crect x='14' y='14' width='2' height='2'/%3E%3Crect x='18' y='14' width='4' height='2'/%3E%3Crect x='14' y='18' width='2' height='4'/%3E%3Crect x='18' y='18' width='4' height='4'/%3E%3C/svg%3E"
            alt="QR"
            style={{ width: 22, height: 22, cursor: 'pointer', opacity: 0.6, flexShrink: 0 }}
            onClick={async () => {
              const baseURL = getBaseURL();
              const url = `${baseURL}/apk/chegou-latest.apk`;
              const dataUrl = await QRCode.toDataURL(url, {
                width: 250,
                margin: 2,
                errorCorrectionLevel: 'M',
              });
              setQrDataUrl(dataUrl);
              setQrVisible(true);
            }}
          />
          {documentoBloqueado && (
            <button className="entrada-trocar" onClick={limparDocumento}>
              trocar
            </button>
          )}
        </div>
        <div className="entrada-rodape">
          <span style={{ fontSize: 11, color: '#707070' }}>Cliente v{VERSAO_APP}</span>
          <span
            style={{ fontSize: 11, color: '#FF3B30', cursor: 'pointer' }}
            onClick={() => navigate('/server-config')}
          >
            Configurações do Servidor
          </span>
        </div>
      </div>

      {qrVisible && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setQrVisible(false)}
        >
          <div
            style={{
              background: '#FFF',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              maxWidth: 300,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', textAlign: 'center' }}>
              Escaneie para instalar o App
            </div>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code" style={{ width: 220, height: 220 }} />
            )}
            <div style={{ fontSize: 11, color: '#777', textAlign: 'center' }}>
              Abra a câmera do celular e aponte para o QR Code
            </div>
            <button
              onClick={() => setQrVisible(false)}
              style={{
                background: '#FF3B30',
                color: '#FFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 24px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Fechar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
