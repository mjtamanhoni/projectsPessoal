import { useEffect, useState, useRef } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import type { EmpresaPublic, Encomenda, FormaPagamentoPublica, BandeiraCartaoPublica, EncomendaPagamento } from '../api';
import { listarFormasPagamentoPublico, listarBandeirasCartaoPublico, extrairErro } from '../api';
import { gerarPayloadPix, gerarQrPixDataUrl } from '../lib/pix';
import { mascaraMoeda, decimalParaNumero } from '../format';

interface Props {
  empresa: EmpresaPublic;
  encomenda: Encomenda;
  onConfirmar: (pagamentos: EncomendaPagamento[]) => void;
  onFechar: () => void;
  pagamentosIniciais?: EncomendaPagamento[];
}

const CLASSIFICACAO_ICONE: Record<string, string> = {
  DINHEIRO: '💵', PIX: '📱', CARTAO_CREDITO: '💳', CARTAO_DEBITO: '💳',
  BOLETO: '📄', TRANSFERENCIA: '🏦', CHEQUE: '📄', OUTROS: '📋',
};

const CLASSIFICACAO_COR: Record<string, string> = {
  DINHEIRO: '#34C759', PIX: '#FF3B30', CARTAO_CREDITO: '#7c3aed', CARTAO_DEBITO: '#2563eb',
  BOLETO: '#d97706', TRANSFERENCIA: '#0369a1', CHEQUE: '#6b7280', OUTROS: '#6b7280',
};

interface PagamentoRow {
  key: string;
  forma: FormaPagamentoPublica | null;
  valor: string;
  trocoPara: string;
  bandeira: BandeiraCartaoPublica | null;
  qrPix: string | null;
  payloadPix: string | null;
  copiado: 'chave' | 'payload' | null;
  bandeiras: BandeiraCartaoPublica[];
  bandeiraCarregando: boolean;
}

function gerarKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatarExibicao(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function valorParaExibicao(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

export default function FormaPagamentoModal({ empresa, encomenda, onConfirmar, onFechar, pagamentosIniciais = [] }: Props) {
  const [formas, setFormas] = useState<FormaPagamentoPublica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [perguntarTroco, setPerguntarTroco] = useState(false);
  const [valorExcedente, setValorExcedente] = useState(0);
  const [confirmado, setConfirmado] = useState(false);
  const inicializadoRef = useRef(false);

  const valorTotal = Number(encomenda.valor_total) || 0;

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    listarFormasPagamentoPublico(empresa.id)
      .then((f) => { if (!cancelado) setFormas(f); })
      .catch((e) => { if (!cancelado) setErro(extrairErro(e)); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [empresa.id]);

  useEffect(() => {
    if (inicializadoRef.current) return;
    inicializadoRef.current = true;
    if (pagamentosIniciais.length > 0) {
      setPagamentos(pagamentosIniciais.map((p) => ({
        key: gerarKey(),
        forma: p.forma_pagamento_id ? { id: p.forma_pagamento_id, descricao: p.forma_pagamento_nome || '', classificacao: p.forma_pagamento_classificacao || 'OUTROS' } : null,
        valor: mascaraMoeda(String(p.valor || 0).replace('.', ','), 2),
        trocoPara: p.troco_para ? mascaraMoeda(String(p.troco_para).replace('.', ','), 2) : '',
        bandeira: p.bandeira_cartao_id ? { id: p.bandeira_cartao_id, nome: p.bandeira_cartao_nome || '' } : null,
        qrPix: null, payloadPix: null, copiado: null, bandeiras: [], bandeiraCarregando: false,
      })));
    } else {
      setPagamentos([{
        key: gerarKey(), forma: null, valor: valorParaExibicao(valorTotal),
        trocoPara: '', bandeira: null, qrPix: null, payloadPix: null,
        copiado: null, bandeiras: [], bandeiraCarregando: false,
      }]);
    }
  }, [pagamentosIniciais, valorTotal]);

  const totalPago = pagamentos.reduce((acc, p) => acc + (decimalParaNumero(p.valor) || 0), 0);
  const valorRestante = Math.max(0, valorTotal - totalPago);
  const saoIguais = Math.abs(totalPago - valorTotal) < 0.01;

  const atualizarPagamento = (key: string, updates: Partial<PagamentoRow>) => {
    setPagamentos((prev) => prev.map((p) => p.key === key ? { ...p, ...updates } : p));
  };

  const selecionarForma = (key: string, forma: FormaPagamentoPublica) => {
    const isCartao = forma.classificacao === 'CARTAO_CREDITO' || forma.classificacao === 'CARTAO_DEBITO';
    const idx = pagamentos.findIndex((p) => p.key === key);
    const isPrimeiro = idx === 0;

    const updates: Partial<PagamentoRow> = {
      forma, bandeira: null, qrPix: null, payloadPix: null, copiado: null,
    };

    // Bug 1: Valor vem com o restante (ou total se for o primeiro)
    if (isPrimeiro) {
      updates.valor = valorParaExibicao(valorTotal);
    } else {
      // Calcular restante até este pagamento
      const totalAteAnterior = pagamentos
        .slice(0, idx)
        .reduce((acc, p) => acc + (decimalParaNumero(p.valor) || 0), 0);
      const restanteParaEste = Math.max(0, valorTotal - totalAteAnterior);
      updates.valor = valorParaExibicao(restanteParaEste);
    }

    if (isCartao) {
      updates.bandeiraCarregando = true;
      listarBandeirasCartaoPublico(empresa.id)
        .then((b) => atualizarPagamento(key, { bandeiras: b, bandeiraCarregando: false }))
        .catch(() => atualizarPagamento(key, { bandeiraCarregando: false }));
    } else {
      updates.bandeiras = [];
    }

    if (forma.classificacao === 'PIX') {
      const chave = empresa.chave_pix || '';
      if (chave) {
        const numeroCupom = encomenda.id ?? encomenda.codigo ?? 0;
        const valorPag = decimalParaNumero(updates.valor || pagamentos[idx]?.valor) || valorTotal;
        const p = gerarPayloadPix({
          chave, nome: empresa.fantasia || empresa.razao_social || 'EMPRESA',
          cidade: '', valor: valorPag, txid: `CUPOM${String(numeroCupom).padStart(5, '0')}`,
        });
        if (p) {
          updates.payloadPix = p;
          gerarQrPixDataUrl(p, 200).then((url) => atualizarPagamento(key, { qrPix: url }));
        }
      }
    }

    atualizarPagamento(key, updates);
  };

  const adicionarPagamento = () => {
    // Bug 4: Calcular restante correto baseado nos pagamentos existentes
    const totalAteAgora = pagamentos.reduce((acc, p) => acc + (decimalParaNumero(p.valor) || 0), 0);
    const restante = Math.max(0, valorTotal - totalAteAgora);
    setPagamentos((prev) => [...prev, {
      key: gerarKey(), forma: null, valor: valorParaExibicao(restante),
      trocoPara: '', bandeira: null, qrPix: null, payloadPix: null,
      copiado: null, bandeiras: [], bandeiraCarregando: false,
    }]);
  };

  const removerPagamento = (key: string) => {
    setPagamentos((prev) => prev.filter((p) => p.key !== key));
  };

  const copiarPix = async (key: string, modo: 'chave' | 'payload') => {
    const pg = pagamentos.find((p) => p.key === key);
    if (!pg) return;
    const texto = modo === 'payload' ? pg.payloadPix : empresa.chave_pix;
    if (!texto) return;
    try {
      await Clipboard.write({ string: texto });
      atualizarPagamento(key, { copiado: modo });
      setTimeout(() => atualizarPagamento(key, { copiado: null }), 2500);
    } catch {
      setErro('Não foi possível copiar');
    }
  };

  // ─── Regras de negócio ───
  const primeiroPg = pagamentos[0];
  const primeiroEhDinheiro = primeiroPg?.forma?.classificacao === 'DINHEIRO';
  const primeiroValorNumerico = decimalParaNumero(primeiroPg?.valor) || 0;

  // Apenas 1 pagamento E é dinheiro → pode exceder total (troco)
  const soDinheiro = pagamentos.length === 1 && primeiroEhDinheiro;
  const primeiroExcedeTotal = soDinheiro && primeiroValorNumerico > valorTotal;

  // Permite adicionar pagamento se: não é cenário troco E ainda falta valor
  const permiteAdicionar = !primeiroExcedeTotal && valorRestante > 0;

  // Verifica se todos os pagamentos têm forma e valor válido
  const todosFormasCompletas = pagamentos.every((p) => {
    if (!p.forma) return false;
    const v = decimalParaNumero(p.valor);
    if (!v || v <= 0) return false;
    const isCartao = p.forma.classificacao === 'CARTAO_CREDITO' || p.forma.classificacao === 'CARTAO_DEBITO';
    if (isCartao && !p.bandeira) return false;
    return true;
  });

  const podeConfirmar = () => {
    if (!todosFormasCompletas) return false;

    // Regra 3: Jamais confirmar se valor pago < total
    if (totalPago < valorTotal - 0.01) return false;

    // Regra 2: Se só tem DINHEIRO, pode exceder (troco), mas nunca menor
    if (soDinheiro) {
      return totalPago >= valorTotal - 0.01;
    }

    // Regra 2: Se tem mais de uma forma, total deve ser EXATAMENTE igual (com tolerância)
    return saoIguais;
  };

  const handleConfirmar = () => {
    // Se só DINHEIRO e valor > total → perguntar sobre troco
    if (soDinheiro && totalPago > valorTotal + 0.01) {
      setValorExcedente(totalPago - valorTotal);
      setPerguntarTroco(true);
      return;
    }
    emitirConfirmacao(false);
  };

  const emitirConfirmacao = (querTroco: boolean) => {
    setPerguntarTroco(false);
    setConfirmado(true);
    const resultado: EncomendaPagamento[] = pagamentos.map((p) => {
      const v = decimalParaNumero(p.valor) || 0;
      const isDinheiro = p.forma?.classificacao === 'DINHEIRO';
      let trocoVal: number | undefined;
      if (isDinheiro && querTroco) {
        trocoVal = v;
      } else if (isDinheiro) {
        const tv = decimalParaNumero(p.trocoPara);
        trocoVal = tv != null ? tv : undefined;
      }
      return {
        forma_pagamento_id: p.forma?.id, forma_pagamento_nome: p.forma?.descricao,
        forma_pagamento_classificacao: p.forma?.classificacao,
        bandeira_cartao_id: p.bandeira?.id, bandeira_cartao_nome: p.bandeira?.nome,
        valor: v, troco_para: trocoVal,
      };
    });
    setTimeout(() => onConfirmar(resultado), 800);
  };

  // ─── Input handler com máscara ───
  const handleValorChange = (key: string, raw: string) => {
    const mascarado = mascaraMoeda(raw, 2);
    atualizarPagamento(key, { valor: mascarado });
  };

  const handleTrocoChange = (key: string, raw: string) => {
    const mascarado = mascaraMoeda(raw, 2);
    atualizarPagamento(key, { trocoPara: mascarado });
  };

  const handleValorBlur = (key: string, raw: string) => {
    const num = decimalParaNumero(raw);
    if (num == null) return;

    const idx = pagamentos.findIndex((p) => p.key === key);
    if (idx < 0) return;

    const pg = pagamentos[idx];
    const isDinheiro = pg.forma?.classificacao === 'DINHEIRO';

    let valorFinal = num;
    if (!isDinheiro) {
      const totalAteAnterior = pagamentos
        .slice(0, idx)
        .reduce((acc, p) => acc + (decimalParaNumero(p.valor) || 0), 0);
      const restanteParaEste = Math.max(0, valorTotal - totalAteAnterior);
      if (num > restanteParaEste) {
        valorFinal = restanteParaEste;
      }
    }

    atualizarPagamento(key, { valor: valorParaExibicao(valorFinal) });
    recalcularPosteriores(idx);
  };

  // Bug 1: Quando um pagamento é alterado, recalcula os posteriores
  const recalcularPosteriores = (idxAlterado: number) => {
    setPagamentos((prev) => {
      const novo = [...prev];
      const totalAteIdx = novo
        .slice(0, idxAlterado + 1)
        .reduce((acc, p) => acc + (decimalParaNumero(p.valor) || 0), 0);
      const restante = Math.max(0, valorTotal - totalAteIdx);
      let restanteDisponivel = restante;

      for (let i = idxAlterado + 1; i < novo.length; i++) {

        if (i === novo.length - 1) {
          novo[i] = { ...novo[i], valor: valorParaExibicao(restanteDisponivel) };
        } else {
          const valorAtual = decimalParaNumero(novo[i].valor) || 0;
          if (valorAtual > restanteDisponivel) {
            novo[i] = { ...novo[i], valor: valorParaExibicao(restanteDisponivel) };
          }
          restanteDisponivel -= Math.min(valorAtual, restanteDisponivel);
        }
      }

      return novo;
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-card" style={{ maxHeight: '92vh', overflow: 'hidden' }}>
        <div className="modal-head" style={{ height: 'auto', minHeight: 56 }}>
          <div className="modal-title" style={{ position: 'static', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 'calc(100% - 60px)', padding: '14px 16px 12px 20px', display: 'block' }}>
            Pagamento
          </div>
          <button className="modal-close" onClick={onFechar} disabled={confirmado}>✕</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 120px)' }}>

          {/* Valor total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', margin: '0 4px 12px', borderRadius: 10, background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#B0B0B0' }}>Valor Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{formatarExibicao(valorTotal)}</span>
          </div>

          {carregando && <div style={{ textAlign: 'center', fontSize: 12, color: '#707070', padding: 20 }}>Carregando...</div>}
          {erro && <div className="modal-erro" style={{ position: 'static', margin: '0 4px 8px', textAlign: 'center' }}>{erro}</div>}

          {!carregando && !confirmado && (
            <div style={{ padding: '0 4px 12px' }}>

              {/* Lista de pagamentos */}
              {pagamentos.map((pg, idx) => {
                const isCartao = pg.forma?.classificacao === 'CARTAO_CREDITO' || pg.forma?.classificacao === 'CARTAO_DEBITO';
                const isDinheiro = pg.forma?.classificacao === 'DINHEIRO';
                const isPix = pg.forma?.classificacao === 'PIX';
                const pgValor = decimalParaNumero(pg.valor) || 0;
                const isPrimeiro = idx === 0;

                return (
                  <div key={pg.key} style={{ border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12, marginBottom: 10, background: 'rgba(50,50,50,0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#B0B0B0', fontWeight: 600 }}>
                        {pg.forma ? `${CLASSIFICACAO_ICONE[pg.forma.classificacao] || '📋'} ${pg.forma.descricao}` : `Pagamento ${idx + 1}`}
                      </span>
                      {pagamentos.length > 1 && (
                        <button onClick={() => removerPagamento(pg.key)} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
                      )}
                    </div>

                    {!pg.forma && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {formas.map((f) => (
                          <button key={f.id} onClick={() => selecionarForma(pg.key, f)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(50,50,50,0.6)', cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontSize: 20 }}>{CLASSIFICACAO_ICONE[f.classificacao] || '📋'}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>{f.descricao}</div>
                              <div style={{ fontSize: 9, fontWeight: 600, color: CLASSIFICACAO_COR[f.classificacao] || '#555', textTransform: 'uppercase' }}>{f.classificacao.replace('_', ' ')}</div>
                            </div>
                            <span style={{ fontSize: 14, color: '#707070' }}>›</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {pg.forma && (
                      <>
                        {/* Valor */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: '#B0B0B0', marginBottom: 4 }}>Valor (R$)</div>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#B0B0B0', fontWeight: 600 }}>R$</span>
                            <input
                              type="text" inputMode="decimal" placeholder="0,00"
                              value={pg.valor}
                              onChange={(e) => handleValorChange(pg.key, e.target.value)}
                              onBlur={(e) => handleValorBlur(pg.key, e.target.value)}
                              style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)', fontSize: 15, fontWeight: 600, color: '#FFFFFF', background: 'rgba(42,42,42,0.6)', boxSizing: 'border-box' }}
                            />
                          </div>
                          {isDinheiro && pgValor > valorTotal && (
                            <div style={{ marginTop: 4, fontSize: 11, color: '#34C759', fontWeight: 600 }}>
                              Troco: {formatarExibicao(pgValor - valorTotal)}
                            </div>
                          )}
                          {!isPrimeiro && !isDinheiro && pgValor > valorRestante && (
                            <div style={{ marginTop: 4, fontSize: 11, color: '#FF3B30', fontWeight: 600 }}>
                              Máximo: {formatarExibicao(valorRestante)}
                            </div>
                          )}
                        </div>

                        {/* Troco (Dinheiro) */}
                        {isDinheiro && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: '#B0B0B0', marginBottom: 4 }}>Troco para (opcional)</div>
                            <input
                              type="text" inputMode="decimal" placeholder="Ex: 150,00"
                              value={pg.trocoPara}
                              onChange={(e) => handleTrocoChange(pg.key, e.target.value)}
                              onBlur={() => {
                                if (!pg.trocoPara) return;
                                const num = decimalParaNumero(pg.trocoPara);
                                if (num != null) atualizarPagamento(pg.key, { trocoPara: valorParaExibicao(num) });
                              }}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)', fontSize: 14, color: '#FFFFFF', background: 'rgba(42,42,42,0.6)', boxSizing: 'border-box' }}
                            />
                            {pg.trocoPara && pgValor > 0 && (decimalParaNumero(pg.trocoPara) || 0) > pgValor && (
                              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: '#34C759' }}>
                                Troco: {formatarExibicao((decimalParaNumero(pg.trocoPara) || 0) - pgValor)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bandeira (Cartão) */}
                        {isCartao && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: '#B0B0B0', marginBottom: 4 }}>Bandeira do Cartão</div>
                            {pg.bandeiraCarregando ? (
                              <div style={{ fontSize: 11, color: '#B0B0B0' }}>Carregando...</div>
                            ) : pg.bandeiras.length === 0 ? (
                              <div style={{ fontSize: 11, color: '#B0B0B0' }}>Nenhuma bandeira cadastrada</div>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {pg.bandeiras.map((b) => (
                                  <button key={b.id} onClick={() => atualizarPagamento(pg.key, { bandeira: b })} style={{ padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${pg.bandeira?.id === b.id ? '#7c3aed' : 'rgba(255,255,255,0.15)'}`, background: pg.bandeira?.id === b.id ? 'rgba(124,58,237,0.2)' : 'rgba(50,50,50,0.6)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>
                                    {b.nome} {pg.bandeira?.id === b.id && '✓'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* PIX QR */}
                        {isPix && empresa.chave_pix && (
                          <div style={{ marginBottom: 8 }}>
                            {pg.qrPix ? (
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <img src={pg.qrPix} alt="QR PIX" style={{ width: 100, height: 100 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, color: '#B0B0B0', wordBreak: 'break-all' }}>Chave: {empresa.chave_pix}</div>
                                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                    <button onClick={() => copiarPix(pg.key, 'chave')} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #FF3B30', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                      {pg.copiado === 'chave' ? '✓' : 'Chave'}
                                    </button>
                                    <button onClick={() => copiarPix(pg.key, 'payload')} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #FF3B30', background: '#FF3B30', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                      {pg.copiado === 'payload' ? '✓' : 'PIX'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: '#707070' }}>Gerando QR Code...</div>
                            )}
                          </div>
                        )}

                        <button onClick={() => atualizarPagamento(pg.key, { forma: null, bandeira: null, qrPix: null, payloadPix: null })} style={{ background: 'none', border: 'none', color: '#B0B0B0', fontSize: 11, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                          ← Trocar forma
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Adicionar pagamento (só aparece se há valor restante e NÃO é cenário troco) */}
              {permiteAdicionar && (
                <button onClick={adicionarPagamento} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: '1.5px dashed rgba(124,58,237,0.4)', background: 'transparent', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                  + Adicionar Pagamento
                </button>
              )}

              {/* Totais */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', color: '#B0B0B0' }}>
                <span>Total Pago:</span>
                <span style={{ fontWeight: 700, color: totalPago >= valorTotal ? '#34C759' : '#FF3B30' }}>{formatarExibicao(totalPago)}</span>
              </div>
              {valorRestante > 0 && !primeiroExcedeTotal && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', color: '#B0B0B0' }}>
                  <span>Falta:</span>
                  <span style={{ fontWeight: 700, color: '#FF3B30' }}>{formatarExibicao(valorRestante)}</span>
                </div>
              )}
              {primeiroExcedeTotal && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', color: '#B0B0B0' }}>
                  <span>Troco estimado:</span>
                  <span style={{ fontWeight: 700, color: '#34C759' }}>{formatarExibicao(primeiroValorNumerico - valorTotal)}</span>
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
                <button className="confirm-btn cancel" onClick={onFechar}>Cancelar</button>
                <button className="confirm-btn save" onClick={handleConfirmar} disabled={!podeConfirmar()}>Confirmar Pagamento</button>
              </div>
            </div>
          )}

          {confirmado && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>Pagamento registrado!</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Troco */}
      {perguntarTroco && (
        <div className="modal-overlay" style={{ zIndex: 70 }}>
          <div className="modal-card" style={{ maxWidth: 320 }}>
            <div className="modal-head"><div className="modal-title">Troco</div></div>
            <div className="modal-body" style={{ padding: 16 }}>
              <p style={{ fontSize: 13, color: '#B0B0B0', marginBottom: 12 }}>
                O valor pago ({formatarExibicao(totalPago)}) excede o total ({formatarExibicao(valorTotal)}).
                Diferença: <strong style={{ color: '#34C759' }}>{formatarExibicao(valorExcedente)}</strong>
              </p>
              <p style={{ fontSize: 13, color: '#B0B0B0', marginBottom: 16 }}>O cliente deseja receber esta diferença como troco?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="confirm-btn cancel" style={{ flex: 1 }} onClick={() => emitirConfirmacao(false)}>Não (Pagar Total)</button>
                <button className="confirm-btn save" style={{ flex: 1 }} onClick={() => emitirConfirmacao(true)}>Sim (Valor Pago)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
