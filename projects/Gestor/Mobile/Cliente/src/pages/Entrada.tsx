import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  buscarClientePorDocumento,
  buscarClientePorDocumentoGlobal,
  extrairErro,
  listarEncomendasPublicas,
  VERSAO_APP,
  fotoUrl,
  getBaseURL,
  getDocumentoLembrado,
  listarEmpresas,
  setDocumentoLembrado,
  type EmpresaPublic,
  type Encomenda,
} from '../api';
import { useSessao } from '../auth';
import { mascaraCpfCnpj, mascaraTelefone } from '../format';
import QRCode from 'qrcode';
import AvaliacaoModal from '../components/AvaliacaoModal';

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
  const [pendentes, setPendentes] = useState<Record<number, number>>({});
  const [avaliacaoPendente, setAvaliacaoPendente] = useState<{ empresa: EmpresaPublic; encomenda: Encomenda } | null>(null);
  const [avaliacaoModalAberto, setAvaliacaoModalAberto] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (empresas.length > 0) return;
    listarEmpresas(true)
      .then((lista) => {
        const delivery = lista.filter((e) => Number(e.delivery) === 1);
        delivery.sort((a, b) => {
          const cntA = a.total_encomendas ?? 0;
          const cntB = b.total_encomendas ?? 0;
          if (cntB !== cntA) return cntB - cntA;
          const nomA = (a.fantasia || a.razao_social || '').toUpperCase();
          const nomB = (b.fantasia || b.razao_social || '').toUpperCase();
          return nomA.localeCompare(nomB);
        });
        setEmpresas(delivery);
      })
      .catch((e) => setErro(extrairErro(e)))
      .finally(() => setCarregandoLista(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const doc = documento.replace(/\D/g, '');
    if (doc.length < 11 || empresas.length === 0) return;
    cancelRef.current = false;
    const counts: Record<number, number> = {};
    let entregaPendente: { empresa: EmpresaPublic; encomenda: Encomenda } | null = null;
    Promise.all(
      empresas.map(async (e) => {
        try {
          const encs = await listarEncomendasPublicas(e.id, doc);
          counts[e.id] = encs.filter((x) => x.status != null && x.status <= 3).length;
          if (!entregaPendente) {
            const entrega = encs.find((x) => x.status === 4 && !x.avaliacao_nota);
            if (entrega) entregaPendente = { empresa: e, encomenda: entrega };
          }
        } catch {
          counts[e.id] = 0;
        }
      }),
    ).then(() => {
      if (!cancelRef.current) {
        setPendentes(counts);
        setAvaliacaoPendente(entregaPendente);
      }
    });
    return () => { cancelRef.current = true; };
  }, [documento, empresas]);

  const pollEmpresas = useCallback(async () => {
    try {
      const lista = await listarEmpresas(true);
      const delivery = lista.filter((e) => Number(e.delivery) === 1);
      setEmpresas((prev) => {
        if (prev.length === 0) return prev;
        const prevMap = new Map(prev.map((e) => [e.id, e]));
        let mudou = false;
        for (const e of delivery) {
          const old = prevMap.get(e.id);
          if (!old || old.is_open !== e.is_open || old.total_encomendas !== e.total_encomendas) {
            mudou = true;
            break;
          }
        }
        if (!mudou && delivery.length === prev.length) return prev;
        delivery.sort((a, b) => {
          const cntA = a.total_encomendas ?? 0;
          const cntB = b.total_encomendas ?? 0;
          if (cntB !== cntA) return cntB - cntA;
          const nomA = (a.fantasia || a.razao_social || '').toUpperCase();
          const nomB = (b.fantasia || b.razao_social || '').toUpperCase();
          return nomA.localeCompare(nomB);
        });
        return delivery;
      });
    } catch {
      // polling silencioso
    }
  }, []);

  useEffect(() => {
    if (empresas.length === 0) return;
    const id = setInterval(pollEmpresas, 10000);
    return () => clearInterval(id);
  }, [empresas.length, pollEmpresas]);

  // Refresh pending count periodically
  useEffect(() => {
    const doc = documento.replace(/\D/g, '');
    if (doc.length < 11 || empresas.length === 0) return;
    const refreshPendentes = async () => {
      const counts: Record<number, number> = {};
      let entregaPendente: { empresa: EmpresaPublic; encomenda: Encomenda } | null = null;
      await Promise.all(
        empresas.map(async (e) => {
          try {
            const encs = await listarEncomendasPublicas(e.id, doc);
            counts[e.id] = encs.filter((x) => x.status != null && x.status <= 3).length;
            if (!entregaPendente) {
              const entrega = encs.find((x) => x.status === 4 && !x.avaliacao_nota);
              if (entrega) entregaPendente = { empresa: e, encomenda: entrega };
            }
          } catch {
            counts[e.id] = 0;
          }
        }),
      );
      setPendentes(counts);
      setAvaliacaoPendente(entregaPendente);
    };
    const id = setInterval(refreshPendentes, 10000);
    return () => clearInterval(id);
  }, [documento, empresas]);

  const limparDocumento = () => {
    setDocumento('');
    setDocumentoBloqueado(false);
    setDocumentoLembrado('');
  };

  const selecionarEmpresa = async (empresa: EmpresaPublic) => {
    setErro('');
    if (Number(empresa.is_open) !== 1) {
      setErro('Esta loja esta fechada no momento');
      return;
    }
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
        const existente = await buscarClientePorDocumentoGlobal(doc);
        navigate('/cadastro', { state: { documento: doc, empresa, clienteExistente: existente } });
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

      {avaliacaoPendente && (
        <div
          onClick={() => setAvaliacaoModalAberto(true)}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#FFFFFF',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            flexShrink: 0,
            borderRadius: 8,
            margin: '0 12px 8px',
          }}
        >
          <span style={{ fontSize: 18 }}>⭐</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              Avalie o atendimento de {avaliacaoPendente.empresa.fantasia || avaliacaoPendente.empresa.razao_social}
            </div>
            <div style={{ fontSize: 10, opacity: 0.85 }}>
              Toque para avaliar a encomenda #{avaliacaoPendente.encomenda.id}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAvaliacaoPendente(null);
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#FFF',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Depois
          </button>
        </div>
      )}

      <div className="empresa-list">
        {carregandoLista && empresas.length === 0 && (
          <div className="empresa-vazio">Carregando empresas...</div>
        )}
        {!carregandoLista && empresas.length === 0 && !erro && (
          <div className="empresa-vazio">Nenhuma empresa de delivery disponível.</div>
        )}
        {empresas.map((e) => {
          const fechada = Number(e.is_open) !== 1;
          return (
          <button
            key={e.id}
            className="empresa-card"
            disabled={carregandoId !== null}
            onClick={() => selecionarEmpresa(e)}
            style={fechada ? { opacity: 0.4, filter: 'grayscale(0.6)', pointerEvents: 'auto' } : undefined}
          >
            <span className="empresa-card-logo">
              {e.logomarca ? (
                <img src={fotoUrl(e.logomarca)} alt="Logomarca" />
              ) : (
                <span className="empresa-card-inicial">{(e.fantasia || e.razao_social || 'D')[0]}</span>
              )}
            </span>
            <span className="empresa-card-nome">
              {e.fantasia || e.razao_social}
            </span>
            {fechada && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#FF3B30',
                letterSpacing: 0.5,
                textTransform: 'uppercase' as const,
                marginBottom: 2,
              }}>
                Fechada
              </span>
            )}
            {(pendentes[e.id] ?? 0) > 0 && (
              <span style={{
                position: 'absolute',
                top: 8,
                left: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 20,
                height: 20,
                padding: '0 5px',
                borderRadius: 10,
                background: '#FF3B30',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              }}>
                {pendentes[e.id]}
              </span>
            )}
            {e.email && <span className="empresa-card-linha">{e.email}</span>}
            {(e.celular || e.telefone) && (
              <span className="empresa-card-linha">{mascaraTelefone(e.celular || e.telefone || '')}</span>
            )}
            {carregandoId === e.id && <span className="empresa-card-carregando">Verificando...</span>}
          </button>
          );
        })}
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
              let url = `${baseURL}/apk/chegou-latest.apk`;
              try {
                const res = await fetch(`${baseURL}/apk/versao?app=cliente`);
                if (res.ok) {
                  const data = await res.json();
                  if (data?.arquivo) {
                    url = `${baseURL}/apk/${encodeURIComponent(data.arquivo)}`;
                  }
                }
              } catch { /* mantém fallback */ }
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

      {avaliacaoPendente && avaliacaoModalAberto && (
        <AvaliacaoModal
          empresaId={avaliacaoPendente.empresa.id}
          clienteId={avaliacaoPendente.encomenda.cliente_id!}
          encomenda={avaliacaoPendente.encomenda}
          onClose={() => setAvaliacaoModalAberto(false)}
          onAvaliado={() => {
            setAvaliacaoModalAberto(false);
            setAvaliacaoPendente(null);
            const doc = documento.replace(/\D/g, '');
            if (doc.length >= 11 && empresas.length > 0) {
              const counts: Record<number, number> = {};
              let novaEntrega: { empresa: EmpresaPublic; encomenda: Encomenda } | null = null;
              Promise.all(
                empresas.map(async (e) => {
                  try {
                    const encs = await listarEncomendasPublicas(e.id, doc);
                    counts[e.id] = encs.filter((x) => x.status != null && x.status <= 3).length;
                    if (!novaEntrega) {
                      const entrega = encs.find((x) => x.status === 4 && !x.avaliacao_nota);
                      if (entrega) novaEntrega = { empresa: e, encomenda: entrega };
                    }
                  } catch {
                    counts[e.id] = 0;
                  }
                }),
              ).then(() => {
                setPendentes(counts);
                setAvaliacaoPendente(novaEntrega);
              });
            }
          }}
        />
      )}
    </div>
  );
}
