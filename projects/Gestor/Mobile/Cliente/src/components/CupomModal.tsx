import { useEffect, useState } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import type { Cliente, EmpresaPublic, Encomenda } from '../api';
import { fotoUrl } from '../api';
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
  const [logo, setLogo] = useState<string | null>(null);

  const baixada = !!encomenda.baixado;
  const chave = empresa.chave_pix || '';
  const numeroCupom = encomenda.id ?? encomenda.codigo ?? 0;
  const temPagamentos = encomenda.pagamentos && encomenda.pagamentos.length > 0;
  const ehPIX = temPagamentos
    ? encomenda.pagamentos!.some((p) => (p.forma_pagamento_nome || '').toUpperCase().includes('PIX'))
    : (encomenda.forma_pagamento_nome || '').toUpperCase().includes('PIX') || !encomenda.forma_pagamento_nome;
  const ehDinheiro = temPagamentos
    ? encomenda.pagamentos!.some((p) => (p.forma_pagamento_nome || '').toUpperCase().includes('DINHEIRO'))
    : (encomenda.forma_pagamento_nome || '').toUpperCase().includes('DINHEIRO');

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

  useEffect(() => {
    if (!empresa.logomarca) return;
    let cancelado = false;
    fetch(fotoUrl(empresa.logomarca))
      .then((res) => {
        if (!res.ok) throw new Error('falha ao buscar a logomarca');
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('falha ao ler a logomarca'));
            reader.readAsDataURL(blob);
          })
      )
      .then((dataUrl) => {
        if (!cancelado) setLogo(dataUrl);
      })
      .catch(() => {
        if (!cancelado) setLogo(null);
      });
    return () => {
      cancelado = true;
    };
  }, [empresa.logomarca]);

  const cupomData: CupomData = {
    empresaNome: empresa.fantasia || empresa.razao_social || 'EMPRESA',
    empresaCnpj: empresa.cnpj_cpf || '',
    empresaEndereco: empresa.endereco || '',
    empresaTelefone: empresa.celular || empresa.telefone || '',
    empresaEmail: empresa.email || '',
    chavePix: chave || undefined,
    pixQrBase64: qr,
    logoBase64: logo,
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
    formaPagamento: temPagamentos
      ? encomenda.pagamentos!.map((p) => `${p.forma_pagamento_nome || '-'} (${(p.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`).join(', ')
      : (encomenda.forma_pagamento_nome || (baixada ? 'A VISTA (PIX)' : 'PIX')),
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
          <div style={{ fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', background: 'rgba(50, 50, 50, 0.5)', borderRadius: 6, padding: 10, margin: '0 4px 12px', lineHeight: 1.45 }}>
            {gerarTextoCupom(cupomData)}
          </div>

          {temPagamentos ? (
            <div style={{ margin: '0 4px 12px', padding: '8px 12px', borderRadius: 8, background: 'rgba(50, 50, 50, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF', marginBottom: 6 }}>Pagamento:</div>
              {encomenda.pagamentos!.map((pg, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: 14 }}>
                    {pg.forma_pagamento_classificacao === 'DINHEIRO' ? '💵' : pg.forma_pagamento_classificacao === 'PIX' ? '📱' : '💳'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF' }}>{pg.forma_pagamento_nome || '-'}</div>
                    {pg.bandeira_cartao_nome && <div style={{ fontSize: 9, color: '#a78bfa' }}>{pg.bandeira_cartao_nome}</div>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
                    {(pg.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              ))}
            </div>
          ) : encomenda.forma_pagamento_nome ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 12px', padding: '8px 12px', borderRadius: 8, background: 'rgba(50, 50, 50, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: 14 }}>
                {ehDinheiro ? '💵' : ehPIX ? '📱' : '💳'}
              </span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF' }}>
                  Forma de Pagamento: {encomenda.forma_pagamento_nome}
                </div>
                {encomenda.bandeira_cartao_nome && (
                  <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600, marginTop: 2 }}>
                    Bandeira: {encomenda.bandeira_cartao_nome}
                  </div>
                )}
                {ehDinheiro && encomenda.troco_para && encomenda.troco_para > 0 && (
                  <div style={{ fontSize: 10, color: '#34C759', fontWeight: 600, marginTop: 2 }}>
                    Troco para: {Number(encomenda.troco_para).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    {encomenda.troco_para > (Number(encomenda.valor_total) || 0) && (
                      <> — Troco: {(Number(encomenda.troco_para) - (Number(encomenda.valor_total) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {chave && ehPIX && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 4px 12px' }}>
              {qrBusy ? (
                <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#707070' }}>
                  Gerando QR Code...
                </div>
              ) : qr ? (
                <img src={qr} alt="QR Code PIX" style={{ width: 150, height: 150 }} />
              ) : (
                <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#707070' }}>
                  QR indisponível
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                  {baixada ? 'Pagamento confirmado (PIX)' : 'Pagar com PIX'}
                </div>
                {baixada && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#34C759', marginBottom: 4 }}>
                    PAGO: R$ {(Number(encomenda.valor_total) || 0).toFixed(2).replace('.', ',')}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#B0B0B0', wordBreak: 'break-all', marginBottom: 8 }}>
                  {chave}
                </div>
                {payload && !baixada && (
                <div style={{ fontSize: 10, color: '#B0B0B0', wordBreak: 'break-all', marginBottom: 8 }}>
                    Copia e cola: {payload.slice(0, 40)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {erro && <div className="modal-erro" style={{ position: 'static', margin: '0 4px 8px' }}>{erro}</div>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {chave && !baixada && ehPIX && (
              <button className="confirm-btn save" onClick={() => copiar('chave')} disabled={pdfBusy}>
                {copiado === 'chave' ? 'Chave copiada!' : 'Copiar chave PIX'}
              </button>
            )}
            {payload && !baixada && ehPIX && (
              <button
                className="confirm-btn save"
                onClick={() => copiar('payload')}
                disabled={pdfBusy}
                style={{ background: '#34C759' }}
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