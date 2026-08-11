import { useEffect, useState } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import type { Cliente, EmpresaPublic, Encomenda } from '../api';
import { gerarTextoCupom, type CupomData } from '../lib/cupom';
import { gerarPDFCupom } from '../lib/cupom-pdf';
import { gerarPayloadPix, gerarQrPixDataUrl } from '../lib/pix';
import { compartilharPDF } from '../lib/share';

interface Props {
  empresa: EmpresaPublic;
  cliente: Cliente;
  encomenda: Encomenda;
  onClose: () => void;
}

export default function CupomModal({ empresa, cliente, encomenda, onClose }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<'payload' | 'chave' | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [erro, setErro] = useState('');

  const baixada = !!encomenda.baixado;
  const chave = baixada ? '' : empresa.chave_pix || '';
  const numeroCupom = encomenda.id ?? encomenda.codigo ?? 0;

  useEffect(() => {
    if (!chave) return;
    let cancelado = false;
    setQrBusy(true);
    try {
      const p = gerarPayloadPix({
        chave,
        nome: empresa.fantasia || empresa.razao_social || 'EMPRESA',
        cidade: '',
        valor: Number(encomenda.valor_total) || 0,
        txid: `CUPOM${String(numeroCupom).padStart(5, '0')}`,
      });
      if (p) {
        setPayload(p);
        gerarQrPixDataUrl(p, 240).then((url) => {
          if (!cancelado) setQr(url);
        });
      }
    } catch {
      setPayload(null);
      setQr(null);
    } finally {
      setQrBusy(false);
    }
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encomenda.id, baixada]);

  const cupomData: CupomData = {
    empresaNome: empresa.fantasia || empresa.razao_social || 'EMPRESA',
    empresaCnpj: empresa.cnpj_cpf || '',
    empresaEndereco: empresa.endereco || '',
    empresaTelefone: empresa.celular || empresa.telefone || '',
    empresaEmail: empresa.email || '',
    chavePix: chave || undefined,
    pixQrBase64: qr,
    logoBase64: null,
    venda: {
      id: encomenda.id,
      codigo: encomenda.codigo ?? encomenda.id,
      cliente_id: encomenda.cliente_id,
      cliente_nome: encomenda.cliente_nome,
      data_venda: encomenda.data_encomenda,
      valor_total: encomenda.valor_total,
      recebido: baixada,
      itens: encomenda.itens ?? [],
    },
    cliente,
    numeroCupom,
    formaPagamento: baixada ? 'A VISTA (PIX)' : 'PIX',
    parcelas: [],
    desconto: 0,
  };

  const copiar = async (modo: 'payload' | 'chave') => {
    const texto = modo === 'payload' ? payload : chave;
    if (!texto) return;
    try {
      await Clipboard.write({ string: texto });
      setCopiado(modo);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      setErro('Não foi possível copiar');
    }
  };

  const gerarPdf = async () => {
    setPdfBusy(true);
    setErro('');
    try {
      const doc = gerarPDFCupom({ ...cupomData, pixQrBase64: qr });
      await compartilharPDF(
        doc,
        `cupom-encomenda-${String(numeroCupom).padStart(5, '0')}-${new Date().toISOString().split('T')[0]}.pdf`,
        'Cupom da Encomenda',
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar/compartilhar o cupom');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-card" style={{ maxHeight: '92vh', overflow: 'hidden' }}>
        <div className="modal-head" style={{ height: 'auto', minHeight: 56 }}>
          <div
            className="modal-title"
            style={{
              position: 'static',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              maxWidth: 'calc(100% - 60px)',
              padding: '14px 16px 12px 20px',
              display: 'block',
            }}
          >
            Cupom Não Fiscal — Encomenda #{numeroCupom}
            {baixada ? ' (baixada)' : ' (aberta)'}
          </div>
          <button className="modal-close" onClick={onClose} disabled={pdfBusy}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 120px)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', background: '#f4f6f4', borderRadius: 6, padding: 10, margin: '0 4px 12px', lineHeight: 1.45 }}>
            {gerarTextoCupom(cupomData)}
          </div>

          {chave && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 4px 12px' }}>
              {qrBusy ? (
                <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9ca09d' }}>
                  Gerando QR Code...
                </div>
              ) : qr ? (
                <img src={qr} alt="QR Code PIX" style={{ width: 150, height: 150 }} />
              ) : (
                <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9ca09d' }}>
                  QR indisponível
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1b1f1c', marginBottom: 4 }}>
                  Pagar com PIX
                </div>
                <div style={{ fontSize: 10, color: '#4b5563', wordBreak: 'break-all', marginBottom: 8 }}>
                  {chave}
                </div>
                {payload && (
                  <div style={{ fontSize: 10, color: '#6b706c', wordBreak: 'break-all', marginBottom: 8 }}>
                    Copia e cola: {payload.slice(0, 40)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {erro && <div className="modal-erro" style={{ position: 'static', margin: '0 4px 8px' }}>{erro}</div>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {chave && (
              <button className="confirm-btn save" onClick={() => copiar('chave')} disabled={pdfBusy}>
                {copiado === 'chave' ? 'Chave copiada!' : 'Copiar chave PIX'}
              </button>
            )}
            {payload && (
              <button
                className="confirm-btn save"
                onClick={() => copiar('payload')}
                disabled={pdfBusy}
                style={{ background: '#0a7a3d' }}
              >
                {copiado === 'payload' ? 'Código copiado!' : 'Copiar código PIX'}
              </button>
            )}
            <button className="confirm-btn save" onClick={gerarPdf} disabled={pdfBusy}>
              {pdfBusy ? 'Gerando...' : 'Baixar cupom em PDF'}
            </button>
            <button className="confirm-btn cancel" onClick={onClose} disabled={pdfBusy}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}