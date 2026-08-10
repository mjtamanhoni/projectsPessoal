import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { mesCorrente, passaPeriodo } from '../lib/filtros';
import type { FiltroPeriodo } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  excluirCompraInsumo,
  extrairErro,
  listarCompraInsumoItens,
  listarComprasInsumo,
  listarFornecedores,
  listarInsumos,
  listarMarcas,
  salvarCompraInsumo,
  type CompraInsumo,
  type CompraInsumoItem,
  type Fornecedor,
  type Insumo,
  type Marca,
} from '../api';
import CompraInsumoModal from '../components/CompraInsumoModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

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

type ExpandState = Record<number, CompraInsumoItem[] | 'loading'>;

export default function ComprasInsumo() {
  const navigate = useNavigate();
  const [compras, setCompras] = useState<CompraInsumo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompraInsumo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<CompraInsumo | null>(null);
  const [expandido, setExpandido] = useState<ExpandState>({});
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);

  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
const [filtroAbertas, setFiltroAbertas] = useState(true);
const [filtroPagas, setFiltroPagas] = useState(false);

const comprasFiltradas = useMemo(() => {
  let lista = compras;
  if (filtroAbertas !== filtroPagas) {
    lista = lista.filter(
      (c) => (filtroAbertas && c.pago !== true) || (filtroPagas && c.pago === true),
    );
  }
  return lista.filter((c) => passaPeriodo(c.data_compra, periodo));
}, [compras, periodo, filtroAbertas, filtroPagas]);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [c, i, f, m] = await Promise.all([
        listarComprasInsumo(),
        listarInsumos(),
        listarFornecedores(),
        listarMarcas(),
      ]);
      setCompras(c);
      setInsumos(i);
      setFornecedores(f);
      setMarcas(m);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const idCompra = (c: CompraInsumo): number | undefined => c.id ?? c.codigo;

  const toggleExpandir = async (c: CompraInsumo) => {
    const id = idCompra(c);
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
      const itens = await listarCompraInsumoItens(id);
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

  const abrirEditar = async (c: CompraInsumo) => {
    const id = idCompra(c);
    setCarregandoEdicao(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    if (id == null) {
      setEditing(c);
      setCarregandoEdicao(false);
      return;
    }
    try {
      const itens = await listarCompraInsumoItens(id);
      setEditing({ ...c, itens });
    } catch {
      setEditing(c);
    } finally {
      setCarregandoEdicao(false);
    }
  };

  const aoSalvar = async (data: CompraInsumo) => {
    await salvarCompraInsumo({ ...data, id: editing?.id ?? editing?.codigo });
    setModalOpen(false);
    setEditing(null);
    setExpandido({});
    await carregar();
  };

  const aoExcluir = async () => {
    const id = confirmDelete ? idCompra(confirmDelete) : undefined;
    if (id == null) return;
    try {
      await excluirCompraInsumo(id);
      setConfirmDelete(null);
      setExpandido({});
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const qtdItens = (c: CompraInsumo): number | undefined => {
    if (c.qtd_itens != null) return c.qtd_itens;
    const id = idCompra(c);
    if (id != null) {
      const itens = expandido[id];
      if (Array.isArray(itens)) return itens.length;
    }
    return undefined;
  };

  const renderSubComponent = (c: CompraInsumo) => {
    const id = idCompra(c);
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
          <span className="col-insumo">Insumo</span>
          <span className="col-marca">Marca</span>
          <span className="col-qtd">Qtd</span>
          <span className="col-unit">Valor Un.</span>
          <span className="col-total">Valor Total</span>
        </div>
        <div className="compra-sub-sep" />
        {itens.map((item, i) => (
          <div key={i}>
            <div className="compra-sub-row compra-item">
              <span className="col-insumo">
                {insumos.find((s) => s.id === item.insumo_id)?.nome ?? item.insumo_nome ?? `ID ${item.insumo_id}`}
              </span>
              <span className="col-marca compra-item-muted">{item.marca_nome ?? '—'}</span>
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
      <BackButton onClick={() => navigate(-1)} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Compras Insumo
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie compras de insumos
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
              opcao2: filtroPagas,
              onOpcao2: setFiltroPagas,
              label1: 'Abertas',
              label2: 'Pagas',
            }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && comprasFiltradas.length === 0 && (
          <div className="list-empty">Nenhuma compra cadastrada</div>
        )}
        {!loading && !erro && comprasFiltradas.length > 0 && (
          <div className="list-scroll">
            {comprasFiltradas.map((c) => {
              const id = idCompra(c);
              const aberto = id != null && expandido[id] !== undefined;
              const nItens = qtdItens(c);
              return (
                <div key={id ?? `${c.fornecedor_id}-${c.data_compra}`}>
                  <div className="compra-row">
                    <div className="compra-cod">#{id}</div>
                    <div className="compra-nome">{c.fornecedor_nome || '—'}</div>
                    <div className="compra-det">
                      {fmtData(c.data_compra)} &nbsp;•&nbsp; {c.pago ? 'Sim' : 'Não'} &nbsp;•&nbsp;{' '}
                      {nItens != null ? `${nItens} ${nItens === 1 ? 'item' : 'itens'}` : '—'}
                    </div>
                    <div className="compra-total">{fmtMoeda(c.valor_total)}</div>
                    <RowMenu
                      className="compra-btn"
                      style={{ top: 10, height: 36 }}
                      fontSize={21}
                      opcoes={[
                        { rotulo: 'Editar', onPress: () => abrirEditar(c) },
                        { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(c) },
                      ]}
                    />
                    <button
                      className="compra-btn"
                      style={{ top: 50, height: 36, color: '#9ca09d', fontSize: 16 }}
                      onClick={() => toggleExpandir(c)}
                    >
                      {aberto ? '▲' : '▼'}
                    </button>
                    {aberto && renderSubComponent(c)}
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
        <CompraInsumoModal
          key={`compra-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Compra' : 'Nova Compra'}
          inicial={editing}
          insumos={insumos}
          fornecedores={fornecedores}
          marcas={marcas}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      ))}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Compra"
          nome={confirmDelete.fornecedor_nome ?? `a compra #${idCompra(confirmDelete)}`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}
    </div>
  );
}
