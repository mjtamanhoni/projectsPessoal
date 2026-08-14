import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { mesCorrente, passaPeriodo } from '../lib/filtros';
import type { FiltroPeriodo } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  excluirVendaProduto,
  extrairErro,
  listarClientes,
  listarEstoqueProdutos,
  listarProdutosFabricados,
  listarVendaProdutoItens,
  listarVendasProduto,
  salvarVendaProduto,
  type VendaProduto,
  type VendaProdutoItem,
  type Cliente,
  type EstoqueProdutoFabricado,
  type ProdutoFabricado,
} from '../api';
import VendaProdutoModal from '../components/VendaProdutoModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';
import { gerarPDFCupom } from '../lib/cupom-pdf';
import { getLogomarcaBase64 } from '../lib/logomarca';
import { gerarPayloadPix, gerarQrPixDataUrl } from '../lib/pix';
import { compartilharPDF } from '../lib/share';
import { Clipboard } from '@capacitor/clipboard';
import { useAuth } from '../auth';

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

type ExpandState = Record<number, VendaProdutoItem[] | 'loading'>;

export default function VendasProduto() {
  const navigate = useNavigate();
  const { empresaNome, empresa } = useAuth();
  const [vendas, setVendas] = useState<VendaProduto[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [estoques, setEstoques] = useState<EstoqueProdutoFabricado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendaProduto | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<VendaProduto | null>(null);
  const [expandido, setExpandido] = useState<ExpandState>({});
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);
  const [cupomVenda, setCupomVenda] = useState<VendaProduto | null>(null);
  const [cupomBusy, setCupomBusy] = useState(false);
  const [pixVenda, setPixVenda] = useState<VendaProduto | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixBusy, setPixBusy] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);

  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
const [filtroAbertas, setFiltroAbertas] = useState(true);
const [filtroRecebidas, setFiltroRecebidas] = useState(false);

const vendasFiltradas = useMemo(() => {
  let lista = vendas;
  if (filtroAbertas !== filtroRecebidas) {
    lista = lista.filter(
      (v) => (filtroAbertas && v.recebido !== true) || (filtroRecebidas && v.recebido === true),
    );
  }
  return lista.filter((v) => passaPeriodo(v.data_venda, periodo));
}, [vendas, periodo, filtroAbertas, filtroRecebidas]);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [v, p, c, es] = await Promise.all([
        listarVendasProduto(),
        listarProdutosFabricados(),
        listarClientes(),
        listarEstoqueProdutos(),
      ]);
      setVendas(v);
      setProdutos(p);
      setClientes(c);
      setEstoques(es);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const idVenda = (v: VendaProduto): number | undefined => v.id ?? v.codigo;

  const toggleExpandir = async (v: VendaProduto) => {
    const id = idVenda(v);
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
    setExpandido((prev) => ({ ...prev, [id]: 'loading' }));
    try {
      const itens = await listarVendaProdutoItens(id);
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

  const abrirEditar = async (v: VendaProduto) => {
    const id = idVenda(v);
    setCarregandoEdicao(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    if (id == null) {
      setEditing(v);
      setCarregandoEdicao(false);
      return;
    }
    try {
      const itens = await listarVendaProdutoItens(id);
      setEditing({ ...v, itens });
    } catch {
      setEditing(v);
    } finally {
      setCarregandoEdicao(false);
    }
  };

  const aoSalvar = async (data: VendaProduto) => {
    const isNova = !editing;
    const resp = await salvarVendaProduto({ ...data, id: editing?.id ?? editing?.codigo });
    const novoId = resp?.id ?? resp?.codigo ?? data.id ?? data.codigo;
    setModalOpen(false);
    setEditing(null);
    setExpandido({});
    await carregar();
    if (isNova && novoId != null) {
      setCupomVenda({ ...data, id: novoId, codigo: novoId });
    }
  };

  const gerarCupom = async () => {
    if (!cupomVenda) return;
    setCupomBusy(true);
    setErro('');
    try {
      const cliente = clientes.find((c) => c.id === cupomVenda.cliente_id) ?? null;
      const numero = cupomVenda.id ?? cupomVenda.codigo ?? 0;
      let pixQrBase64: string | null = null;
      try {
        const chave = empresa?.chave_pix;
        if (chave) {
          const payload = gerarPayloadPix({
            chave,
            nome: empresa?.fantasia || empresa?.razao_social || empresaNome || 'MARCOS JOSE TAMANHONI',
            cidade: '',
            valor: Number(cupomVenda.valor_total) || 0,
            txid: `CUPOM${String(numero).padStart(5, '0')}`,
          });
          if (payload) pixQrBase64 = await gerarQrPixDataUrl(payload, 240);
        }
      } catch {
        pixQrBase64 = null;
      }
      const doc = gerarPDFCupom({
        empresaNome: empresa?.fantasia || empresa?.razao_social || empresaNome || 'MARCOS JOSE TAMANHONI',
        empresaCnpj: empresa?.cnpj_cpf || '56.134.688/0001-57',
        empresaEndereco: empresa?.endereco || '',
        empresaTelefone: empresa?.celular || empresa?.telefone || '(27) 9 8833-7323',
        empresaEmail: empresa?.email || '',
        chavePix: empresa?.chave_pix || '',
        pixQrBase64,
        logoBase64: getLogomarcaBase64(),
        venda: cupomVenda,
        cliente,
        numeroCupom: numero,
        formaPagamento: cupomVenda.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
        parcelas: [],
        desconto: 0,
      });
      await compartilharPDF(doc, `cupom-${String(numero).padStart(5, '0')}-${new Date().toISOString().split('T')[0]}.pdf`, 'Cupom Não Fiscal');
      setCupomVenda(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar/compartilhar o cupom');
    } finally {
      setCupomBusy(false);
    }
  };

  const abrirPix = async (v: VendaProduto) => {
    setPixVenda(v);
    setPixQr(null);
    setPixPayload(null);
    setPixCopiado(false);
    if (!empresa?.chave_pix) return;
    setPixBusy(true);
    try {
      const numero = idVenda(v);
      const payload = gerarPayloadPix({
        chave: empresa.chave_pix,
        nome: empresa?.fantasia || empresa?.razao_social || empresaNome || 'JADE MARCOS JOSE TAMANHONI',
        cidade: '',
        valor: Number(v.valor_total) || 0,
        txid: `CUPOM${String(numero).padStart(5, '0')}`,
      });
      if (payload) {
        setPixPayload(payload);
        setPixQr(await gerarQrPixDataUrl(payload, 260));
      }
    } catch {
      setPixQr(null);
    } finally {
      setPixBusy(false);
    }
  };

  const copiarPix = async () => {
    if (!pixPayload) return;
    try {
      await Clipboard.write({ string: pixPayload });
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2500);
    } catch {
      setErro('Não foi possível copiar o código PIX');
    }
  };

  const aoExcluir = async () => {
    const id = confirmDelete ? idVenda(confirmDelete) : undefined;
    if (id == null) return;
    try {
      await excluirVendaProduto(id);
      setConfirmDelete(null);
      setExpandido({});
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const qtdItens = (v: VendaProduto): number | undefined => {
    if (v.qtd_itens != null) return v.qtd_itens;
    const id = idVenda(v);
    if (id != null) {
      const itens = expandido[id];
      if (Array.isArray(itens)) return itens.length;
    }
    return undefined;
  };

  const renderSubComponent = (v: VendaProduto) => {
    const id = idVenda(v);
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
          <span className="col-produto">Produto</span>
          <span className="col-qtd">Qtd</span>
          <span className="col-unit">Valor Un.</span>
          <span className="col-total">Valor Total</span>
        </div>
        <div className="compra-sub-sep" />
        {itens.map((item, i) => (
          <div key={i}>
            <div className="compra-sub-row compra-item">
              <span className="col-produto">
                {produtos.find((p) => (p.id) === item.produto_fabricado_id)?.nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id}`}
              </span>
              <span className="col-qtd">{fmtQtd(item.quantidade)}</span>
              <span className="col-unit">{fmtValor(item.valor_unitario)}</span>
              <span className="col-total">{fmtValor(item.valor_total)}</span>
            </div>
            <div className="compra-sub-sep" />
          </div>
        ))}
        <div className="compra-sub-total">Total: {fmtMoeda(itens.reduce((acc, it) => acc + it.valor_total, 0))}</div>
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/movimento')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Vendas Produto
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie vendas de produtos
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
              opcao1: filtroAbertas,
              onOpcao1: setFiltroAbertas,
              opcao2: filtroRecebidas,
              onOpcao2: setFiltroRecebidas,
              label1: 'Abertas',
              label2: 'Recebidas',
            }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && vendasFiltradas.length === 0 && (
          <div className="list-empty">Nenhuma venda cadastrada</div>
        )}
        {!loading && !erro && vendasFiltradas.length > 0 && (
          <div className="list-scroll">
            {vendasFiltradas.map((v) => {
              const id = idVenda(v);
              const aberto = id != null && expandido[id] !== undefined;
              const nItens = qtdItens(v);
              return (
                <div key={id ?? `${v.cliente_id}-${v.data_venda}`}>
                  <div className="compra-row">
                    <div className="compra-cod">#{id}</div>
                    <div className="compra-nome">{v.cliente_nome || '—'}</div>
                    <div className="compra-det">
                      {fmtData(v.data_venda)} &nbsp;•&nbsp; {v.recebido ? 'Sim' : 'Não'} &nbsp;•&nbsp;{' '}
                      {nItens != null ? `${nItens} ${nItens === 1 ? 'item' : 'itens'}` : '—'}
                    </div>
                    <div className="compra-total">{fmtMoeda(v.valor_total)}</div>
                    <RowMenu
                      className="compra-btn"
                      style={{ top: 10, height: 36 }}
                      fontSize={21}
                      opcoes={[
                        { rotulo: 'Editar', onPress: () => abrirEditar(v) },
                        { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(v) },
                        ...(empresa?.chave_pix
                          ? [{ rotulo: 'PIX', cor: '#0a7a3d', onPress: () => abrirPix(v) }]
                          : []),
                      ]}
                    />
                    <button
                      className="compra-btn"
                      style={{ top: 50, height: 36, color: '#9ca09d', fontSize: 16 }}
                      onClick={() => toggleExpandir(v)}
                    >
                      {aberto ? '▲' : '▼'}
                    </button>
                    {aberto && renderSubComponent(v)}
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
        <VendaProdutoModal
          key={`venda-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Venda' : 'Nova Venda'}
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
          titulo="Excluir Venda"
          nome={confirmDelete.cliente_nome ?? `a venda #${idVenda(confirmDelete)}`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}

      {pixVenda && (
        <div className="modal-overlay">
          <div className="confirm-card" style={{ width: 'min(92vw, 360px)' }}>
            <div className="confirm-title">PIX — Pagamento da Venda</div>
            {pixBusy ? (
              <div className="confirm-msg" style={{ textAlign: 'center', padding: 16 }}>
                Gerando QR Code...
              </div>
            ) : (
              <>
                {pixQr ? (
                  <img
                    src={pixQr}
                    alt="QR Code PIX"
                    style={{ width: 220, height: 220, alignSelf: 'center', marginTop: 4 }}
                  />
                ) : (
                  <div className="confirm-msg" style={{ textAlign: 'center', padding: 12 }}>
                    Chave PIX não configurada ou QR indisponível.
                  </div>
                )}
                <div className="confirm-msg" style={{ marginTop: 4, fontSize: 12, color: '#4b5563', wordBreak: 'break-all' }}>
                  {empresa?.chave_pix ?? ''}
                </div>
                <div className="confirm-msg" style={{ fontSize: 11, color: '#6b706c', wordBreak: 'break-all', marginTop: 6 }}>
                  Pix copia e cola: {pixPayload ? `${pixPayload.slice(0, 40)}...` : '—'}
                </div>
                <div className="confirm-actions" style={{ flexWrap: 'wrap' }}>
                  {pixPayload && (
                    <button className="confirm-btn save" onClick={copiarPix}>
                      {pixCopiado ? 'Código copiado!' : 'Copiar código PIX'}
                    </button>
                  )}
                  <button className="confirm-btn cancel" onClick={() => setPixVenda(null)}>
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {cupomVenda && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <div className="confirm-title">Cupom Não Fiscal</div>
            <div className="confirm-msg">
              Venda salva com sucesso! Deseja gerar o cupom não fiscal em PDF para enviar ao cliente{' '}
              {cupomVenda.cliente_nome ? `(${cupomVenda.cliente_nome})` : ''}?
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setCupomVenda(null)} disabled={cupomBusy}>
                Agora não
              </button>
              <button className="confirm-btn save" onClick={gerarCupom} disabled={cupomBusy}>
                {cupomBusy ? 'Gerando...' : 'Gerar e enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}