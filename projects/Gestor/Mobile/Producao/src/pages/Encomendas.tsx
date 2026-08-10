import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { mesCorrente, passaPeriodo } from '../lib/filtros';
import type { FiltroPeriodo } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import {
  excluirEncomenda,
  extrairErro,
  gerarVendaDeEncomenda,
  listarClientes,
  listarEncomendaItens,
  listarEncomendas,
  listarEstoqueProdutos,
  listarProdutosFabricados,
  listarVendaProdutoItens,
  listarVendasProduto,
  salvarEncomenda,
  type Cliente,
  type Encomenda,
  type EncomendaItem,
  type EstoqueProdutoFabricado,
  type ProdutoFabricado,
  type VendaProduto,
} from '../api';
import EncomendaModal from '../components/EncomendaModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';
import { useAuth } from '../auth';
import { gerarTextoCupom, type CupomData } from '../lib/cupom';
import { gerarPDFCupom } from '../lib/cupom-pdf';
import { gerarPayloadPix, gerarQrPixDataUrl } from '../lib/pix';
import { compartilharPDF } from '../lib/share';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(d: string | undefined): string {
  if (!d) return '—';
  const date = new Date(`${d.split('T')[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function fmtQtd(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtValor(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ExpandState = Record<number, EncomendaItem[] | 'loading'>;

export default function Encomendas() {
  const navigate = useNavigate();
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estoques, setEstoques] = useState<EstoqueProdutoFabricado[]>([]);
  const [itensPorId, setItensPorId] = useState<Record<number, EncomendaItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Encomenda | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Encomenda | null>(null);
  const [expandido, setExpandido] = useState<ExpandState>({});
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);
  const [baixar, setBaixar] = useState<{ id: number; cliente?: string } | null>(null);
  const [baixarData, setBaixarData] = useState('');
  const [baixarRecebido, setBaixarRecebido] = useState(true);
  const [baixando, setBaixando] = useState(false);
  const [cupomData, setCupomData] = useState<CupomData | null>(null);
  const [cupomQr, setCupomQr] = useState<string | null>(null);
  const [cupomPayload, setCupomPayload] = useState<string | null>(null);
  const [cupomCopiado, setCupomCopiado] = useState<'payload' | 'chave' | null>(null);
  const [cupomBusy, setCupomBusy] = useState(false);
  const [cupomPdfBusy, setCupomPdfBusy] = useState(false);
  const { empresa, empresaNome } = useAuth();

  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
const [filtroABaixar, setFiltroABaixar] = useState(true);
const [filtroBaixadas, setFiltroBaixadas] = useState(false);

const encomendasFiltradas = useMemo(() => {
  let lista = encomendas;
  if (filtroABaixar !== filtroBaixadas) {
    lista = lista.filter(
      (e) => (filtroABaixar && e.baixado !== true) || (filtroBaixadas && e.baixado === true),
    );
  }
  return lista.filter((e) => passaPeriodo(e.data_encomenda, periodo));
}, [encomendas, periodo, filtroABaixar, filtroBaixadas]);

const estoquePorProduto = useMemo(() => {
  const porId = new Map<number, { qtd: number; data: string }>();
  for (const es of estoques) {
    if (es.produto_fabricado_id == null) continue;
    const data = es.data_atualizacao ?? '';
    const prev = porId.get(es.produto_fabricado_id);
    if (!prev || data >= prev.data) porId.set(es.produto_fabricado_id, { qtd: es.quantidade, data });
  }
  const out = new Map<number, number>();
  for (const [k, v] of porId) out.set(k, v.qtd);
  return out;
}, [estoques]);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [e, p, c, es] = await Promise.all([
        listarEncomendas(),
        listarProdutosFabricados(),
        listarClientes(),
        listarEstoqueProdutos(),
      ]);
      setEncomendas(e);
      setProdutos(p);
      setClientes(c);
      setEstoques(es);
      const mapa: Record<number, EncomendaItem[]> = {};
      await Promise.all(
        e
          .map((x) => x.id ?? x.codigo)
          .filter((id): id is number => id != null)
          .map(async (id) => {
            try {
              mapa[id] = await listarEncomendaItens(id);
            } catch {
              mapa[id] = [];
            }
          }),
      );
      setItensPorId(mapa);
    } catch (err) {
      setErro(extrairErro(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const idEncomenda = (e: Encomenda): number | undefined => e.id ?? e.codigo;

  const toggleExpandir = async (e: Encomenda) => {
    const id = idEncomenda(e);
    if (id == null) return;
    const atual = expandido[id];
    if (atual !== undefined) {
      setExpandido((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    const cache = itensPorId[id];
    if (cache) {
      setExpandido((prev) => ({ ...prev, [id]: cache }));
      return;
    }
    setExpandido((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      const itens = await listarEncomendaItens(id);
      setExpandido((prev) => ({ ...prev, [id]: itens }));
    } catch {
      setExpandido((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const abrirNovo = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditar = async (e: Encomenda) => {
    const id = idEncomenda(e);
    setCarregandoEdicao(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    if (id == null) {
      setEditing(e);
      setCarregandoEdicao(false);
      return;
    }
    try {
      const itens = await listarEncomendaItens(id);
      setEditing({ ...e, itens });
    } catch {
      setEditing(e);
    } finally {
      setCarregandoEdicao(false);
    }
  };

  const aoSalvar = async (data: Encomenda) => {
    await salvarEncomenda({ ...data, id: editing?.id ?? editing?.codigo });
    setModalOpen(false);
    setEditing(null);
    setExpandido({});
    await carregar();
  };

  const confirmarBaixar = async () => {
    if (!baixar) return;
    setBaixando(true);
    setErro('');
    try {
      const res = await gerarVendaDeEncomenda({
        id_encomenda: baixar.id,
        data_venda: baixarData,
        recebido: baixarRecebido,
      });
      setBaixar(null);
      setExpandido({});
      await carregar();
      if (res?.venda_id != null) {
        await abrirCupomDaVenda(res.venda_id);
      }
    } catch (e) {
      setBaixar(null);
      setErro(extrairErro(e));
    } finally {
      setBaixando(false);
    }
  };

  const abrirCupomDaVenda = async (vendaId: number) => {
    setCupomData(null);
    setCupomQr(null);
    setCupomPayload(null);
    setCupomCopiado(null);
    setErro('');
    try {
      const venda = (await listarVendasProduto()).find((v) => (v.id ?? v.codigo) === vendaId);
      if (!venda) {
        setErro('Venda gerada, mas não foi possível carregar os dados do cupom.');
        return;
      }
      const itens = await listarVendaProdutoItens(vendaId);
      const vendaComItens: VendaProduto = { ...venda, itens };
      const cliente = clientes.find((c) => c.id === venda.cliente_id) ?? null;
      const data: CupomData = {
        empresaNome: empresa?.fantasia || empresa?.razao_social || empresaNome || 'EMPRESA',
        empresaCnpj: empresa?.cnpj_cpf || '',
        empresaEndereco: empresa?.endereco || '',
        empresaTelefone: empresa?.celular || empresa?.telefone || '',
        empresaEmail: empresa?.email || '',
        chavePix: empresa?.chave_pix || '',
        pixQrBase64: null,
        logoBase64: null,
        venda: vendaComItens,
        cliente,
        numeroCupom: vendaId,
        formaPagamento: venda.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
        parcelas: [],
        desconto: 0,
      };
      setCupomData(data);
      const chave = empresa?.chave_pix;
      if (chave) {
        setCupomBusy(true);
        try {
          const payload = gerarPayloadPix({
            chave,
            nome: empresa?.fantasia || empresa?.razao_social || empresaNome || 'EMPRESA',
            cidade: '',
            valor: Number(venda.valor_total) || 0,
            txid: `CUPOM${String(vendaId).padStart(5, '0')}`,
          });
          if (payload) {
            setCupomPayload(payload);
            setCupomQr(await gerarQrPixDataUrl(payload, 240));
          }
        } catch {
          setCupomQr(null);
        } finally {
          setCupomBusy(false);
        }
      }
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const copiarCupom = async (modo: 'payload' | 'chave') => {
    const texto = modo === 'payload' ? cupomPayload : empresa?.chave_pix;
    if (!texto || !cupomData) return;
    try {
      await Clipboard.write({ string: texto });
      setCupomCopiado(modo);
      setTimeout(() => setCupomCopiado(null), 2500);
    } catch {
      setErro('Não foi possível copiar');
    }
  };

  const gerarCupomPdf = async () => {
    if (!cupomData) return;
    setCupomPdfBusy(true);
    setErro('');
    try {
      const data: CupomData = { ...cupomData, pixQrBase64: cupomQr };
      const doc = gerarPDFCupom(data);
      await compartilharPDF(
        doc,
        `cupom-${String(data.numeroCupom).padStart(5, '0')}-${new Date().toISOString().split('T')[0]}.pdf`,
        'Cupom Não Fiscal',
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar/compartilhar o cupom');
    } finally {
      setCupomPdfBusy(false);
    }
  };

  const aoExcluir = async () => {
    const id = confirmDelete ? idEncomenda(confirmDelete) : undefined;
    if (id == null) return;
    try {
      await excluirEncomenda(id);
      setConfirmDelete(null);
      setExpandido({});
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const qtdItens = (e: Encomenda): number | undefined => {
    if (e.qtd_itens != null) return e.qtd_itens;
    const id = idEncomenda(e);
    if (id != null) {
      const itens = expandido[id];
      if (Array.isArray(itens)) return itens.length;
    }
    return undefined;
  };

  const renderSubComponent = (e: Encomenda) => {
    const id = idEncomenda(e);
    if (id == null) return null;
    const itens = expandido[id];
    if (itens === 'loading') {
      return (
        <div className="compra-sub">
          <div style={{ padding: 8, fontSize: 10, color: '#9ca09d' }}>Carregando...</div>
        </div>
      );
    }
    if (!Array.isArray(itens)) return null;
    if (itens.length === 0) {
      return (
        <div className="compra-sub">
          <div style={{ padding: 8, fontSize: 10, color: '#9ca09d' }}>Nenhum item</div>
        </div>
      );
    }
    return (
      <div className="compra-sub">
        <div className="compra-sub-row compra-hdr">
          <span className="col-produto" style={{ width: 118 }}>Produto</span>
          <span className="col-qtd">Qtd</span>
          <span className="col-unit">Valor Un.</span>
          <span className="col-total">Valor Total</span>
          <span className="col-estoque">Estoque</span>
        </div>
        <div className="compra-sub-sep" />
        {itens.map((item, i) => {
          const estoque = estoquePorProduto.get(item.produto_fabricado_id) ?? 0;
          return (
            <div key={i}>
              <div className="compra-sub-row compra-item">
                <span className="col-produto" style={{ width: 118 }}>
                  {produtos.find((p) => (p.id) === item.produto_fabricado_id)?.nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id}`}
                </span>
                <span className="col-qtd">{fmtQtd(item.quantidade)}</span>
                <span className="col-unit">{fmtValor(item.valor_unitario)}</span>
                <span className="col-total">{fmtValor(item.valor_total)}</span>
                <span
                  className="col-estoque"
                  style={{ color: estoque >= item.quantidade ? '#2d5e3a' : '#dc2626', fontWeight: 700 }}
                >
                  {fmtQtd(estoque)}
                </span>
              </div>
              <div className="compra-sub-sep" />
            </div>
          );
        })}
        <div className="compra-sub-total">Total: {fmtMoeda(itens.reduce((acc, it) => acc + it.valor_total, 0))}</div>
      </div>
    );
  };

  const renderProntaEntrega = (e: Encomenda) => {
    const id = idEncomenda(e);
    if (id == null || itensPorId[id] === undefined) return null;
    const it = itensPorId[id];
    if (it.length === 0) {
      return (
        <div className="compra-det" style={{ marginTop: 2, fontSize: 10, fontWeight: 600, color: '#9ca09d' }}>
          Sem itens
        </div>
      );
    }
    const pe = it.every((x) => (estoquePorProduto.get(x.produto_fabricado_id) ?? 0) >= x.quantidade);
    return (
      <div className="compra-det" style={{ marginTop: 2, fontSize: 10, fontWeight: 600 }}>
        {pe ? (
          <span style={{ color: '#2d5e3a' }}>✓ Pronta entrega</span>
        ) : (
          <span style={{ color: '#dc2626' }}>✗ Sem estoque p/ pronta entrega</span>
        )}
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/movimento')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Encomendas
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie encomendas de produtos
      </div>
      <PlusButton onClick={abrirNovo} />

            <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {!loading && !erro && (
          <FiltrosBar
            periodo={{
              inicio: periodo.inicio,
              fim: periodo.fim,
              onInicio: (v) => setPeriodo((p) => ({ ...p, inicio: v })),
              onFim: (v) => setPeriodo((p) => ({ ...p, fim: v })),
            }}
            checks={{
              opcao1: filtroABaixar,
              onOpcao1: setFiltroABaixar,
              opcao2: filtroBaixadas,
              onOpcao2: setFiltroBaixadas,
              label1: 'A Baixar',
              label2: 'Baixadas',
            }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && encomendasFiltradas.length === 0 && (
          <div className="list-empty">Nenhuma encomenda cadastrada</div>
        )}
        {!loading && !erro && encomendasFiltradas.length > 0 && (
          <div className="list-scroll">
            {encomendasFiltradas.map((e) => {
              const id = idEncomenda(e);
              const aberto = id != null && expandido[id] !== undefined;
              const nItens = qtdItens(e);
              const baixada = !!e.baixado;
              return (
                <div key={id ?? `${e.cliente_id}-${e.data_encomenda}`}>
                  <div className="compra-row">
                    <div className="compra-cod">#{id}</div>
                    <div className="compra-nome">{e.cliente_nome || '—'}</div>
                    <div className="compra-det">
                      {fmtData(e.data_encomenda)} &nbsp;•&nbsp;{' '}
                      {baixada ? `Baixada${e.venda_id ? ` (venda #${e.venda_id})` : ''}` : 'Em aberto'} &nbsp;•&nbsp;{' '}
                      {nItens != null ? `${nItens} ${nItens === 1 ? 'item' : 'itens'}` : '—'}
                    </div>
                    <div className="compra-total">{fmtMoeda(e.valor_total)}</div>
                    {id != null && renderProntaEntrega(e)}
                    <RowMenu
                      className="compra-btn"
                      style={{ top: 10, height: 36 }}
                      fontSize={21}
                      opcoes={[
                        {
                          rotulo: baixada ? 'Baixada' : 'Baixar',
                          cor: baixada ? '#9ca09d' : '#10b981',
                          disabled: baixada,
                          onPress: () => {
                            setBaixar({ id: id ?? 0, cliente: e.cliente_nome });
                            setBaixarData(new Date().toISOString().slice(0, 10));
                            setBaixarRecebido(true);
                          },
                        },
                        { rotulo: 'Editar', onPress: () => abrirEditar(e) },
                        { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(e) },
                      ]}
                    />
                    <button
                      className="compra-btn"
                      style={{ top: 50, height: 36, color: '#9ca09d', fontSize: 16 }}
                      onClick={() => toggleExpandir(e)}
                    >
                      {aberto ? '▲' : '▼'}
                    </button>
                    {aberto && renderSubComponent(e)}
                  </div>
                  <div className="row-sep" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (carregandoEdicao ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#9ca09d' }}>
              Carregando...
            </div>
          </div>
        </div>
      ) : (
        <EncomendaModal
          key={`encomenda-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Encomenda' : 'Nova Encomenda'}
          inicial={editing}
          clientes={clientes}
          produtos={produtos}
          estoques={estoques}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      ))}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Encomenda"
          nome={confirmDelete.cliente_nome ?? `a encomenda #${idEncomenda(confirmDelete)}`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}

      {baixar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Baixar Encomenda</div>
              <button className="modal-close" onClick={() => setBaixar(null)} disabled={baixando}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: '#6b706c', lineHeight: 1.5, margin: '0 4px 12px', padding: 8, background: '#f4f6f4', borderRadius: 6 }}>
                A mercadoria foi entregue? Ao baixar a encomenda será gerada uma venda de produto com os itens desta encomenda (baixa de estoque e contas a receber).
                {baixar.cliente ? ` Cliente: ${baixar.cliente}.` : ''}
              </div>
              <div className="modal-label" style={{ position: 'static', margin: '12px 4px 4px' }}>
                Data da Venda *
              </div>
              <input
                className="modal-input"
                style={{ position: 'static', width: 326, margin: '0 4px 16px' }}
                type="date"
                value={baixarData}
                onChange={(e) => setBaixarData(e.target.value)}
              />
              <div className="modal-check-row" style={{ position: 'static', margin: '0 4px 24px' }}>
                <div className={`modal-checkbox ${baixarRecebido ? 'checked' : ''}`} onClick={() => setBaixarRecebido(!baixarRecebido)}>
                  {baixarRecebido && <div className="modal-check-fill" />}
                </div>
                <span className="modal-check-label">Venda já foi recebida?</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={() => setBaixar(null)} disabled={baixando}>
                  Cancelar
                </button>
                <button className="modal-btn save" style={{ position: 'static', top: 0 }} onClick={confirmarBaixar} disabled={baixando || !baixarData}>
                  {baixando ? 'Gerando...' : 'Baixar e Gerar Venda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cupomData && (
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
                Encomenda baixada — Cupom Não Fiscal {cupomData.venda.cliente_nome ? `(${cupomData.venda.cliente_nome})` : ''}
              </div>
              <button className="modal-close" onClick={() => setCupomData(null)} disabled={cupomPdfBusy}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 120px)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', background: '#f4f6f4', borderRadius: 6, padding: 10, margin: '0 4px 12px', lineHeight: 1.45 }}>
                {gerarTextoCupom(cupomData)}
              </div>

              {empresa?.chave_pix && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 4px 12px' }}>
                  {cupomBusy ? (
                    <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9ca09d' }}>
                      Gerando QR Code...
                    </div>
                  ) : cupomQr ? (
                    <img src={cupomQr} alt="QR Code PIX" style={{ width: 150, height: 150 }} />
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
                      {empresa.chave_pix}
                    </div>
                    {cupomPayload && (
                      <div style={{ fontSize: 10, color: '#6b706c', wordBreak: 'break-all', marginBottom: 8 }}>
                        Copia e cola: {cupomPayload.slice(0, 40)}...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {erro && <div className="modal-erro" style={{ position: 'static', margin: '0 4px 8px' }}>{erro}</div>}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                {empresa?.chave_pix && (
                  <button className="confirm-btn save" onClick={() => copiarCupom('chave')} disabled={cupomPdfBusy}>
                    {cupomCopiado === 'chave' ? 'Chave copiada!' : 'Copiar chave PIX'}
                  </button>
                )}
                {cupomPayload && (
                  <button
                    className="confirm-btn save"
                    onClick={() => copiarCupom('payload')}
                    disabled={cupomPdfBusy}
                    style={{ background: '#0a7a3d' }}
                  >
                    {cupomCopiado === 'payload' ? 'Código copiado!' : 'Copiar código PIX'}
                  </button>
                )}
                <button className="confirm-btn save" onClick={gerarCupomPdf} disabled={cupomPdfBusy}>
                  {cupomPdfBusy ? 'Gerando...' : 'Enviar PDF ao cliente'}
                </button>
                <button className="confirm-btn cancel" onClick={() => setCupomData(null)} disabled={cupomPdfBusy}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}