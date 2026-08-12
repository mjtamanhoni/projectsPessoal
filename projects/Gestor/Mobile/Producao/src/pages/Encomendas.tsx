import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { mesCorrente, passaPeriodo } from '../lib/filtros';
import type { FiltroPeriodo } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import {
  alterarStatusEncomenda,
  excluirEncomenda,
  extrairErro,
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

const ETAPAS_ENCOMENDA: Record<number, { label: string; cor: string; fundo: string }> = {
  0: { label: 'Aguardando', cor: '#92400e', fundo: '#fef3c7' },
  1: { label: 'Em produção', cor: '#1e40af', fundo: '#dbeafe' },
  2: { label: 'Finalizado', cor: '#166534', fundo: '#dcfce7' },
  3: { label: 'Entregue', cor: '#065f46', fundo: '#d1fae5' },
  4: { label: 'Cancelada', cor: '#991b1b', fundo: '#fee2e2' },
};

function etapasPermitidas(status: number): number[] {
  switch (status) {
    case 0:
      return [1, 4];
    case 1:
      return [2, 4];
    case 2:
      return [3];
    default:
      return [];
  }
}

function estiloBadge(status: number): CSSProperties {
  const info = ETAPAS_ENCOMENDA[status] ?? ETAPAS_ENCOMENDA[0];
  return {
    display: 'inline-block',
    padding: '1px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    color: info.cor,
    background: info.fundo,
  };
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
  const [etapa, setEtapa] = useState<{ id: number; cliente?: string; status: number } | null>(null);
  const [etapaAlvo, setEtapaAlvo] = useState<number | null>(null);
  const [etapaDataVenda, setEtapaDataVenda] = useState('');
  const [etapaRecebido, setEtapaRecebido] = useState(true);
  const [salvandoEtapa, setSalvandoEtapa] = useState(false);
  const [cupomData, setCupomData] = useState<CupomData | null>(null);
  const [cupomQr, setCupomQr] = useState<string | null>(null);
  const [cupomPayload, setCupomPayload] = useState<string | null>(null);
  const [cupomCopiado, setCupomCopiado] = useState<'payload' | 'chave' | null>(null);
  const [cupomBusy, setCupomBusy] = useState(false);
  const [cupomPdfBusy, setCupomPdfBusy] = useState(false);
  const { empresa, empresaNome } = useAuth();

  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
  const [filtroStatus, setFiltroStatus] = useState<number[]>([0, 1]);

  const encomendasFiltradas = useMemo(() => {
    return encomendas.filter(
      (e) =>
        (filtroStatus.length === 0 || filtroStatus.includes(Number(e.status ?? 0))) &&
        passaPeriodo(e.data_encomenda, periodo),
    );
  }, [encomendas, periodo, filtroStatus]);

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

  const confirmarEtapa = async () => {
    if (!etapa || etapaAlvo === null) return;
    setSalvandoEtapa(true);
    setErro('');
    try {
      const res = await alterarStatusEncomenda({
        id: etapa.id,
        status: etapaAlvo,
        data_venda: etapaAlvo === 2 ? etapaDataVenda : undefined,
        recebido: etapaAlvo === 2 ? etapaRecebido : undefined,
      });
      setEtapa(null);
      setEtapaAlvo(null);
      setExpandido({});
      await carregar();
      if (etapaAlvo === 2 && res?.venda_id != null) {
        await abrirCupomDaVenda(res.venda_id);
      }
    } catch (e) {
      setEtapa(null);
      setErro(extrairErro(e));
    } finally {
      setSalvandoEtapa(false);
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

  const alvosDoModal = etapa ? etapasPermitidas(etapa.status) : [];

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
            statuses={{
              valor: filtroStatus,
              opcoes: [
                { valor: 0, label: 'Aguardando' },
                { valor: 1, label: 'Em produção' },
                { valor: 2, label: 'Finalizado' },
                { valor: 3, label: 'Entregue' },
                { valor: 4, label: 'Cancelada' },
              ],
              onChange: setFiltroStatus,
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
              const status = Number(e.status ?? 0);
              const podeEditar = status < 2;
              const alvos = etapasPermitidas(status);
              return (
                <div key={id ?? `${e.cliente_id}-${e.data_encomenda}`}>
                  <div className="compra-row">
                    <div className="compra-cod">#{id}</div>
                    <div className="compra-nome">{e.cliente_nome || '—'}</div>
                    <div className="compra-det">
                      {fmtData(e.data_encomenda)} &nbsp;•&nbsp;
                      <span style={estiloBadge(status)}>{ETAPAS_ENCOMENDA[status]?.label ?? '—'}</span>
                      {e.data_entrega ? (
                        <>
                          {' '}
                          &nbsp;•&nbsp; Entrega: {fmtData(e.data_entrega)}
                        </>
                      ) : null}
                      {e.venda_id ? ` &nbsp;•&nbsp; venda #${e.venda_id}` : ''} &nbsp;•&nbsp;{' '}
                      {nItens != null ? `${nItens} ${nItens === 1 ? 'item' : 'itens'}` : '—'}
                    </div>
                    <div className="compra-total">{fmtMoeda(e.valor_total)}</div>
                    {id != null && renderProntaEntrega(e)}
                    <RowMenu
                      className="compra-btn"
                      style={{ top: 10, height: 36 }}
                      fontSize={21}
                      opcoes={[
                        ...(e.venda_id != null
                          ? [
                              {
                                rotulo: 'Cupom',
                                cor: '#10b981',
                                onPress: () => {
                                  if (e.venda_id != null) abrirCupomDaVenda(e.venda_id);
                                },
                              },
                            ]
                          : []),
                        ...(alvos.length > 0
                          ? [
                              {
                                rotulo: 'Alterar Etapa',
                                cor: '#10b981',
                                onPress: () => {
                                  setEtapa({ id: id ?? 0, cliente: e.cliente_nome, status });
                                  setEtapaAlvo(null);
                                  setEtapaDataVenda(new Date().toISOString().slice(0, 10));
                                  setEtapaRecebido(true);
                                },
                              },
                            ]
                          : []),
                        ...(podeEditar
                          ? [
                              { rotulo: 'Editar', onPress: () => abrirEditar(e) },
                              { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(e) },
                            ]
                          : []),
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

      {etapa && (
        <div className="modal-overlay" style={{ zIndex: 55 }}>
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Alterar Etapa da Encomenda</div>
              <button className="modal-close" onClick={() => setEtapa(null)} disabled={salvandoEtapa}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: '#6b706c', lineHeight: 1.5, margin: '0 4px 12px', padding: 8, background: '#f4f6f4', borderRadius: 6 }}>
                Etapa atual: <span style={estiloBadge(etapa.status)}>{ETAPAS_ENCOMENDA[etapa.status]?.label ?? '—'}</span>
                {etapa.cliente ? `  Cliente: ${etapa.cliente}.` : ''}
                {etapa.status === 2 ? ' A encomenda já foi finalizada e gerou uma venda.' : ''}
              </div>

              {alvosDoModal.length > 0 && (
                <div style={{ margin: '0 4px 8px' }}>
                  {alvosDoModal.map((alvo) => {
                    const info = ETAPAS_ENCOMENDA[alvo] ?? { label: '—', cor: '#1b1f1c', fundo: '#e5e7eb' };
                    const selecionado = etapaAlvo === alvo;
                    return (
                      <button
                        key={alvo}
                        onClick={() => setEtapaAlvo(alvo)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '10px 12px',
                          marginBottom: 8,
                          borderRadius: 8,
                          textAlign: 'left',
                          border: selecionado ? '2px solid #2d5e3a' : '1px solid #d6ddd0',
                          background: selecionado ? '#e8efea' : '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={estiloBadge(alvo)}>{info.label}</span>
                        <span style={{ fontSize: 11, color: '#6b706c' }}>
                          {alvo === 2
                            ? 'Finalizar: gera venda de produto (baixa de estoque e contas a receber)'
                            : alvo === 3
                              ? 'Marcar como entregue ao cliente'
                              : alvo === 4
                                ? 'Cancelar esta encomenda'
                                : alvo === 1
                                  ? 'Iniciar a produção'
                                  : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {etapaAlvo === 2 && (
                <>
                  <div className="modal-label" style={{ position: 'static', margin: '12px 4px 4px' }}>
                    Data da Venda *
                  </div>
                  <input
                    className="modal-input"
                    style={{ position: 'static', width: 326, margin: '0 4px 16px' }}
                    type="date"
                    value={etapaDataVenda}
                    onChange={(e) => setEtapaDataVenda(e.target.value)}
                  />
                  <div className="modal-check-row" style={{ position: 'static', margin: '0 4px 24px' }}>
                    <div className={`modal-checkbox ${etapaRecebido ? 'checked' : ''}`} onClick={() => setEtapaRecebido(!etapaRecebido)}>
                      {etapaRecebido && <div className="modal-check-fill" />}
                    </div>
                    <span className="modal-check-label">Venda já foi recebida?</span>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button className="modal-btn cancel" style={{ position: 'static', top: 0 }} onClick={() => setEtapa(null)} disabled={salvandoEtapa}>
                  Cancelar
                </button>
                <button
                  className="modal-btn save"
                  style={{ position: 'static', top: 0 }}
                  onClick={confirmarEtapa}
                  disabled={salvandoEtapa || etapaAlvo === null || (etapaAlvo === 2 && !etapaDataVenda)}
                >
                  {salvandoEtapa ? 'Salvando...' : 'Salvar Etapa'}
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
                Encomenda finalizada — Cupom Não Fiscal {cupomData.venda.cliente_nome ? `(${cupomData.venda.cliente_nome})` : ''}
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