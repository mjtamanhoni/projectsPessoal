import { useEffect, useState } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import type { EmpresaPublic, Encomenda, FormaPagamentoPublica, BandeiraCartaoPublica } from '../api';
import { listarFormasPagamentoPublico, listarBandeirasCartaoPublico, extrairErro } from '../api';
import { gerarPayloadPix, gerarQrPixDataUrl } from '../lib/pix';

interface Props {
  empresa: EmpresaPublic;
  encomenda: Encomenda;
  onConfirmar: (forma: FormaPagamentoPublica, trocoPara?: number, bandeiraCartao?: BandeiraCartaoPublica) => void;
  onFechar: () => void;
}

const CLASSIFICACAO_ICONE: Record<string, string> = {
  DINHEIRO: '💵',
  PIX: '📱',
  CARTAO_CREDITO: '💳',
  CARTAO_DEBITO: '💳',
  BOLETO: '📄',
  TRANSFERENCIA: '🏦',
  CHEQUE: '📄',
  OUTROS: '📋',
};

const CLASSIFICACAO_COR: Record<string, string> = {
  DINHEIRO: '#34C759',
  PIX: '#FF3B30',
  CARTAO_CREDITO: '#7c3aed',
  CARTAO_DEBITO: '#2563eb',
  BOLETO: '#d97706',
  TRANSFERENCIA: '#0369a1',
  CHEQUE: '#6b7280',
  OUTROS: '#6b7280',
};

export default function FormaPagamentoModal({ empresa, encomenda, onConfirmar, onFechar }: Props) {
  const [formas, setFormas] = useState<FormaPagamentoPublica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionada, setSelecionada] = useState<FormaPagamentoPublica | null>(null);
  const [trocoPara, setTrocoPara] = useState('');
  const [qrPix, setQrPix] = useState<string | null>(null);
  const [payloadPix, setPayloadPix] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<'chave' | 'payload' | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [bandeiras, setBandeiras] = useState<BandeiraCartaoPublica[]>([]);
  const [bandeiraSelecionada, setBandeiraSelecionada] = useState<BandeiraCartaoPublica | null>(null);
  const [bandeiraCarregando, setBandeiraCarregando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    listarFormasPagamentoPublico(empresa.id)
      .then((f) => {
        if (!cancelado) setFormas(f);
      })
      .catch((e) => {
        if (!cancelado) setErro(extrairErro(e));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => { cancelado = true; };
  }, [empresa.id]);

  useEffect(() => {
    if (!selecionada || selecionada.classificacao !== 'PIX') {
      setQrPix(null);
      setPayloadPix(null);
      return;
    }
    const chave = empresa.chave_pix || '';
    if (!chave) return;
    let cancelado = false;
    const numeroCupom = encomenda.id ?? encomenda.codigo ?? 0;
    const p = gerarPayloadPix({
      chave,
      nome: empresa.fantasia || empresa.razao_social || 'EMPRESA',
      cidade: '',
      valor: Number(encomenda.valor_total) || 0,
      txid: `CUPOM${String(numeroCupom).padStart(5, '0')}`,
    });
    if (p) {
      setPayloadPix(p);
      gerarQrPixDataUrl(p, 240).then((url) => {
        if (!cancelado) setQrPix(url);
      });
    }
    return () => { cancelado = true; };
  }, [selecionada, empresa, encomenda]);

  useEffect(() => {
    if (!selecionada || (selecionada.classificacao !== 'CARTAO_CREDITO' && selecionada.classificacao !== 'CARTAO_DEBITO')) {
      setBandeiras([]);
      setBandeiraSelecionada(null);
      return;
    }
    let cancelado = false;
    setBandeiraCarregando(true);
    setErro('');
    listarBandeirasCartaoPublico(empresa.id)
      .then((b) => {
        if (!cancelado) setBandeiras(b);
      })
      .catch((e) => {
        console.error('Erro ao listar bandeiras:', e);
        if (!cancelado) setErro(extrairErro(e));
      })
      .finally(() => { if (!cancelado) setBandeiraCarregando(false); });
    return () => { cancelado = true; };
  }, [selecionada, empresa.id]);

  const copiarPix = async (modo: 'chave' | 'payload') => {
    const texto = modo === 'payload' ? payloadPix : empresa.chave_pix;
    if (!texto) return;
    try {
      await Clipboard.write({ string: texto });
      setCopiado(modo);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      setErro('Não foi possível copiar');
    }
  };

  const confirmar = () => {
    if (!selecionada) return;
    const isCartao = selecionada.classificacao === 'CARTAO_CREDITO' || selecionada.classificacao === 'CARTAO_DEBITO';
    if (isCartao && !bandeiraSelecionada) return;
    if (selecionada.classificacao === 'DINHEIRO') {
      const valor = parseFloat(trocoPara.replace(',', '.'));
      onConfirmar(selecionada, isNaN(valor) ? undefined : valor, isCartao ? bandeiraSelecionada! : undefined);
    } else {
      onConfirmar(selecionada, undefined, isCartao ? bandeiraSelecionada! : undefined);
    }
    setConfirmado(true);
  };

  const valorTotal = Number(encomenda.valor_total) || 0;
  const trocoValor = parseFloat(trocoPara.replace(',', '.'));
  const trocoCalculado = !isNaN(trocoValor) && trocoValor > valorTotal ? trocoValor - valorTotal : null;

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
            Forma de Pagamento
          </div>
          <button className="modal-close" onClick={onFechar} disabled={confirmado}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 120px)' }}>
          {carregando && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#707070', padding: 20 }}>
              Carregando formas de pagamento...
            </div>
          )}

          {erro && (
            <div className="modal-erro" style={{ position: 'static', margin: '0 4px 8px', textAlign: 'center' }}>
              {erro}
            </div>
          )}

          {!carregando && !erro && formas.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#707070', padding: 20 }}>
              Nenhuma forma de pagamento cadastrada
            </div>
          )}

          {!carregando && formas.length > 0 && !selecionada && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 12px' }}>
              <div style={{ fontSize: 11, color: '#B0B0B0', marginBottom: 4 }}>
                Selecione como você vai pagar:
              </div>
              {formas.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelecionada(f)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(50, 50, 50, 0.6)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 24 }}>
                    {CLASSIFICACAO_ICONE[f.classificacao] || '📋'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                      {f.descricao}
                    </div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: CLASSIFICACAO_COR[f.classificacao] || '#555555',
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}>
                      {f.classificacao.replace('_', ' ')}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: '#707070' }}>›</span>
                </button>
              ))}
            </div>
          )}

          {selecionada && !confirmado && (
            <div style={{ padding: '0 4px 12px' }}>
              <button
                onClick={() => { setSelecionada(null); setQrPix(null); setPayloadPix(null); setTrocoPara(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  color: '#B0B0B0',
                  fontSize: 12,
                  padding: '4px 0',
                  cursor: 'pointer',
                  marginBottom: 8,
                }}
              >
                ← Trocar forma de pagamento
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 10,
                border: `2px solid ${CLASSIFICACAO_COR[selecionada.classificacao] || 'rgba(255, 255, 255, 0.15)'}`,
                background: 'rgba(50, 50, 50, 0.5)',
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 24 }}>
                  {CLASSIFICACAO_ICONE[selecionada.classificacao] || '📋'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                    {selecionada.descricao}
                  </div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: CLASSIFICACAO_COR[selecionada.classificacao] || '#555555',
                    textTransform: 'uppercase',
                  }}>
                    {selecionada.classificacao.replace('_', ' ')}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FF3B30' }}>
                  {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>

              {selecionada.classificacao === 'DINHEIRO' && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', marginBottom: 6 }}>
                    Troco para:
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 14,
                  color: '#B0B0B0',
                      fontWeight: 600,
                    }}>
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={trocoPara}
                      onBlur={() => {
                        if (!trocoPara) return;
                        const num = parseFloat(trocoPara.replace(',', '.'));
                        if (!isNaN(num)) {
                          setTrocoPara(num.toFixed(2).replace('.', ','));
                        }
                      }}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^0-9,]/g, '');
                        const parts = v.split(',');
                        if (parts.length > 2) v = parts[0] + ',' + parts.slice(1).join('');
                        if (parts[1] && parts[1].length > 2) v = parts[0] + ',' + parts[1].slice(0, 2);
                        setTrocoPara(v);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        borderRadius: 8,
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#FFFFFF',
                    background: 'rgba(42, 42, 42, 0.6)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {trocoCalculado !== null && trocoCalculado > 0 && (
                    <div style={{
                      marginTop: 6,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(52, 199, 89, 0.15)',
                      border: '1px solid #34C759',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#34C759',
                    }}>
                      Troco: {trocoCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: '#B0B0B0', marginTop: 4 }}>
                    Informe o valor que o cliente vai pagar para calcular o troco
                  </div>
                </div>
              )}

              {selecionada.classificacao === 'PIX' && (
                <div style={{ marginBottom: 12 }}>
                  {empresa.chave_pix ? (
                    <>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                        {qrPix ? (
                          <img src={qrPix} alt="QR Code PIX" style={{ width: 140, height: 140 }} />
                        ) : (
                          <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#707070', background: 'rgba(50, 50, 50, 0.5)', borderRadius: 8 }}>
                            Gerando QR Code...
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: '#B0B0B0', wordBreak: 'break-all', marginBottom: 8 }}>
                            Chave PIX: {empresa.chave_pix}
                          </div>
                          {payloadPix && (
                            <div style={{ fontSize: 10, color: '#B0B0B0', wordBreak: 'break-all' }}>
                              Copia e cola: {payloadPix.slice(0, 30)}...
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => copiarPix('chave')}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: 8,
                            border: '1.5px solid #FF3B30',
                            background: 'rgba(52, 199, 89, 0.15)',
                            color: '#FF3B30',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {copiado === 'chave' ? '✓ Chave copiada!' : 'Copiar chave PIX'}
                        </button>
                        {payloadPix && (
                          <button
                            onClick={() => copiarPix('payload')}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: 8,
                              border: '1.5px solid #FF3B30',
                              background: '#FF3B30',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {copiado === 'payload' ? '✓ Código copiado!' : 'Copiar código PIX'}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#707070', padding: 16 }}>
                      Chave PIX não configurada pela empresa
                    </div>
                  )}
                </div>
              )}

              {(selecionada.classificacao === 'CARTAO_CREDITO' || selecionada.classificacao === 'CARTAO_DEBITO') && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: '#fef3c7',
                    border: '1px solid #d97706',
                    marginBottom: 12,
                    fontSize: 12,
                    color: '#92400e',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {selecionada.classificacao === 'CARTAO_CREDITO' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                    </div>
                    <div>
                      Selecione a bandeira do cartão abaixo.
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', marginBottom: 6 }}>
                    Bandeira do Cartão:
                  </div>
                  {bandeiraCarregando ? (
                    <div style={{ fontSize: 11, color: '#B0B0B0', padding: '8px 0' }}>Carregando bandeiras...</div>
                  ) : bandeiras.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#B0B0B0', padding: '8px 0' }}>Nenhuma bandeira cadastrada</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {bandeiras.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBandeiraSelecionada(b)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: `1.5px solid ${bandeiraSelecionada?.id === b.id ? '#7c3aed' : 'rgba(255, 255, 255, 0.15)'}`,
                            background: bandeiraSelecionada?.id === b.id ? 'rgba(124, 58, 237, 0.2)' : 'rgba(50, 50, 50, 0.6)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: 16 }}>💳</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{b.nome}</span>
                          {bandeiraSelecionada?.id === b.id && (
                            <span style={{ marginLeft: 'auto', color: '#7c3aed', fontSize: 16 }}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selecionada.classificacao !== 'DINHEIRO' &&
                selecionada.classificacao !== 'PIX' &&
                selecionada.classificacao !== 'CARTAO_CREDITO' &&
                selecionada.classificacao !== 'CARTAO_DEBITO' && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(50, 50, 50, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: 12,
                  fontSize: 12,
                  color: '#B0B0B0',
                }}>
                  Pagamento registrado. O cupom não fiscal será gerado com esta forma de pagamento.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
                <button className="confirm-btn cancel" onClick={onFechar}>
                  Cancelar
                </button>
                <button
                  className="confirm-btn save"
                  onClick={confirmar}
                  disabled={(selecionada.classificacao === 'DINHEIRO' && !trocoPara) || ((selecionada.classificacao === 'CARTAO_CREDITO' || selecionada.classificacao === 'CARTAO_DEBITO') && !bandeiraSelecionada)}
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          )}

          {confirmado && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                Pagamento registrado!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
