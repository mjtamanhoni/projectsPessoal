import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { mesCorrente, passaBusca, passaPeriodo } from '../lib/filtros';
import type { FiltroPeriodo } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  excluirCustoAdicionalFabricacao,
  excluirFabricacao,
  extrairErro,
  listarCustosAdicionaisFabricacao,
  listarCustosAdicionaisTipo,
  listarFabricacoes,
  listarProdutosFabricados,
  salvarCustoAdicionalFabricacao,
  salvarFabricacao,
  type CustoAdicionalTipo,
  type Fabricacao,
  type FabricacaoCustoAdicional,
  type ProdutoFabricado,
} from '../api';
import FabricacaoModal from '../components/FabricacaoModal';
import RowMenu from '../components/RowMenu';
import CustoAdicionalFabModal from '../components/CustoAdicionalFabModal';
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

function fmtQtd(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return '0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ExpandState = Record<number, FabricacaoCustoAdicional[] | 'loading'>;

export default function Fabricacoes() {
  const navigate = useNavigate();
  const [fabricacoes, setFabricacoes] = useState<Fabricacao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [tiposCusto, setTiposCusto] = useState<CustoAdicionalTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fabricacao | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Fabricacao | null>(null);
  const [expandido, setExpandido] = useState<ExpandState>({});

  const [caModalOpen, setCaModalOpen] = useState(false);
  const [caEditing, setCaEditing] = useState<FabricacaoCustoAdicional | null>(null);
  const [caFabricacaoId, setCaFabricacaoId] = useState<number | null>(null);
  const [confirmDeleteCa, setConfirmDeleteCa] = useState<FabricacaoCustoAdicional | null>(null);

  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
  const [busca, setBusca] = useState('');

const fabricacoesFiltradas = useMemo(
  () =>
    fabricacoes.filter(
      (f) => passaPeriodo(f.data_fabricacao, periodo) && passaBusca([f.produto_nome], busca),
    ),
  [fabricacoes, periodo, busca],
);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [f, p, t] = await Promise.all([
        listarFabricacoes(),
        listarProdutosFabricados(),
        listarCustosAdicionaisTipo(),
      ]);
      setFabricacoes(f);
      setProdutos(p);
      setTiposCusto(t);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const idFab = (f: Fabricacao): number | undefined => f.id ?? f.codigo;

  const toggleExpandir = async (f: Fabricacao) => {
    const id = idFab(f);
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
      const custos = await listarCustosAdicionaisFabricacao(id);
      setExpandido((prev) => ({ ...prev, [id]: custos }));
    } catch {
      setExpandido((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const abrirNovaFabricacao = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditarFabricacao = (f: Fabricacao) => {
    setEditing(f);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvarFabricacao = async (data: Fabricacao) => {
    await salvarFabricacao({ ...data, id: editing?.id ?? editing?.codigo });
    setModalOpen(false);
    setEditing(null);
    setExpandido({});
    await carregar();
  };

  const aoExcluirFabricacao = async () => {
    const id = confirmDelete ? idFab(confirmDelete) : undefined;
    if (id == null) return;
    try {
      await excluirFabricacao(id);
      setConfirmDelete(null);
      setExpandido({});
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const abrirNovoCusto = (f: Fabricacao) => {
    setCaEditing(null);
    setCaFabricacaoId(idFab(f) ?? null);
    setCaModalOpen(true);
  };

  const abrirEditarCusto = (f: Fabricacao, item: FabricacaoCustoAdicional) => {
    setCaEditing(item);
    setCaFabricacaoId(idFab(f) ?? null);
    setCaModalOpen(true);
  };

  const aoSalvarCusto = async (data: FabricacaoCustoAdicional) => {
    await salvarCustoAdicionalFabricacao({ ...data, id: caEditing?.id ?? caEditing?.codigo });
    setCaModalOpen(false);
    setCaEditing(null);
    const fid = caFabricacaoId;
    setCaFabricacaoId(null);
    if (fid != null) {
      try {
        const custos = await listarCustosAdicionaisFabricacao(fid);
        setExpandido((prev) => ({ ...prev, [fid]: custos }));
      } catch {
        setExpandido((prev) => ({ ...prev, [fid]: [] }));
      }
      await carregar();
    }
  };

  const aoExcluirCusto = async () => {
    const id = confirmDeleteCa ? confirmDeleteCa.id ?? confirmDeleteCa.codigo : undefined;
    if (id == null) return;
    try {
      await excluirCustoAdicionalFabricacao(id);
      const fid = caFabricacaoId;
      setConfirmDeleteCa(null);
      if (fid != null) {
        try {
          const custos = await listarCustosAdicionaisFabricacao(fid);
          setExpandido((prev) => ({ ...prev, [fid]: custos }));
        } catch {
          setExpandido((prev) => ({ ...prev, [fid]: [] }));
        }
        await carregar();
      }
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const nomeTipoCusto = (tipoId: number): string =>
    tiposCusto.find((t) => t.id === tipoId)?.nome ?? '—';

  const renderSubComponent = (f: Fabricacao) => {
    const id = idFab(f);
    if (id == null) return null;
    const custos = expandido[id];
    if (custos === 'loading') {
      return (
        <div className="fab-sub">
          <div style={{ padding: 8, fontSize: 10, color: '#9ca09d' }}>Carregando...</div>
        </div>
      );
    }
    if (!Array.isArray(custos)) return null;
    return (
      <div className="fab-sub">
        <div className="fab-sub-title">Custos Adicionais</div>
        <button className="fab-add" onClick={() => abrirNovoCusto(f)}>
          + Add
        </button>
        <div className="fab-sub-row fab-hdr">
          <span className="col-cod">Cód</span>
          <span className="col-tipo">Tipo de Custo</span>
          <span className="col-valor">Valor</span>
        </div>
        <div className="fab-sub-sep" />
        {custos.length === 0 && (
          <div style={{ padding: '8px 6px', fontSize: 10, color: '#9ca09d' }}>Nenhum custo adicional</div>
        )}
        {custos.map((item) => {
          const itemId = item.id ?? item.codigo;
          return (
            <div key={itemId}>
              <div className="fab-sub-row fab-item">
                <span className="col-cod">{itemId}</span>
                <span className="col-tipo">{item.custo_adicional_nome ?? nomeTipoCusto(item.custo_adicional_tipo_id)}</span>
                <span className="col-valor">{fmtMoeda(item.valor)}</span>
                <span className="fab-item-actions">
                  <button className="row-btn" style={{ color: '#6b706c', fontSize: 12 }} onClick={() => abrirEditarCusto(f, item)}>
                    ✎
                  </button>
                  <button className="row-btn" style={{ color: '#dc2626', fontSize: 11 }} onClick={() => { setCaFabricacaoId(id); setConfirmDeleteCa(item); }}>
                    🗑
                  </button>
                </span>
              </div>
              <div className="fab-sub-sep" />
            </div>
          );
        })}
        <div className="fab-sub-total">
          Total: {fmtMoeda((custos as FabricacaoCustoAdicional[]).reduce((acc, it) => acc + (Number(it.valor) || 0), 0))}
        </div>
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/movimento')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Fabricações
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie as fabricações
      </div>
      <PlusButton onClick={abrirNovaFabricacao} />

            <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {!loading && !erro && (
          <FiltrosBar
            busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar produto...' }}
            periodo={{
              inicio: periodo.inicio,
              fim: periodo.fim,
              onInicio: (v) => setPeriodo((p) => ({ ...p, inicio: v })),
              onFim: (v) => setPeriodo((p) => ({ ...p, fim: v })),
            }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && fabricacoesFiltradas.length === 0 && (
          <div className="list-empty">Nenhuma fabricação cadastrada</div>
        )}
        {!loading && !erro && fabricacoes.length > 0 && (
          <div className="list-scroll">
            {fabricacoes.map((f) => {
              const id = idFab(f);
              const aberto = id != null && expandido[id] !== undefined;
              return (
                <div key={id ?? `${f.produto_fabricado_id}-${f.data_fabricacao}`}>
                  <div className="compra-row">
                    <div className="compra-cod">#{id}</div>
                    <div className="compra-nome">{f.produto_nome || '—'}</div>
                    <div className="compra-det">
                      Qtd: {fmtQtd(f.quantidade_produzida)} &nbsp;|&nbsp; Insumos: {fmtMoeda(f.custo_insumos)} &nbsp;|&nbsp;{' '}
                      Adic: {fmtMoeda(f.custo_adicional_total)}
                    </div>
                    <div className="compra-total">
                      Total: {fmtMoeda(f.custo_total)} &nbsp;|&nbsp; Unit: {fmtMoeda(f.custo_unitario)} &nbsp;|&nbsp;{' '}
                      {fmtData(f.data_fabricacao)}
                    </div>
                    <RowMenu
                      className="compra-btn"
                      style={{ top: 10, height: 36 }}
                      fontSize={21}
                      opcoes={[
                        { rotulo: 'Editar', onPress: () => abrirEditarFabricacao(f) },
                        { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(f) },
                      ]}
                    />
                    <button
                      className="compra-btn"
                      style={{ top: 50, height: 36, color: '#9ca09d', fontSize: 16 }}
                      onClick={() => toggleExpandir(f)}
                    >
                      {aberto ? '▲' : '▼'}
                    </button>
                    {aberto && renderSubComponent(f)}
                  </div>
                  <div className="row-sep" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <FabricacaoModal
          key={`fab-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Fabricação' : 'Nova Fabricação'}
          inicial={editing}
          produtos={produtos}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvarFabricacao}
        />
      )}

      {caModalOpen && caFabricacaoId != null && (
        <CustoAdicionalFabModal
          key={`ca-form-${caEditing?.id ?? caEditing?.codigo ?? 'new'}`}
          titulo={caEditing ? 'Editar Custo Adicional' : 'Novo Custo Adicional'}
          inicial={caEditing}
          fabricacaoId={caFabricacaoId}
          tiposCusto={tiposCusto}
          onCancel={() => {
            setCaModalOpen(false);
            setCaEditing(null);
            setCaFabricacaoId(null);
          }}
          onSalvar={aoSalvarCusto}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Fabricação"
          nome={confirmDelete.produto_nome ?? `a fabricação #${idFab(confirmDelete)}`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluirFabricacao}
        />
      )}

      {confirmDeleteCa && (
        <ConfirmDialog
          titulo="Excluir Custo Adicional"
          nome={`o custo adicional #${confirmDeleteCa.id ?? confirmDeleteCa.codigo}`}
          onCancel={() => {
            setConfirmDeleteCa(null);
            setCaFabricacaoId(null);
          }}
          onConfirm={aoExcluirCusto}
        />
      )}
    </div>
  );
}
