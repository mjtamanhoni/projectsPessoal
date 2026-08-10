import { useCallback, useEffect, useMemo, useState } from 'react';
import FiltrosBar from '../components/FiltrosBar';
import { passaBusca } from '../lib/filtros';
import { useNavigate } from 'react-router-dom';
import {
  enviarFotoProdutoFabricado,
  excluirProdutoFabricado,
  excluirReceitaIngrediente,
  extrairErro,
  listarInsumos,
  listarProdutosFabricados,
  listarReceitasIngrediente,
  salvarProdutoFabricado,
  salvarReceitaIngrediente,
  type Insumo,
  type ProdutoFabricado,
  type ReceitaIngrediente,
} from '../api';
import IngredienteModal from '../components/IngredienteModal';
import ProdutoFabricadoModal from '../components/ProdutoFabricadoModal';
import RowMenu from '../components/RowMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQtd(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return '0';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

export default function ProdutosFabricados() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoFabricado | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<ProdutoFabricado | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [receitas, setReceitas] = useState<Record<number, ReceitaIngrediente[]>>({});
  const [receitaCarregando, setReceitaCarregando] = useState(false);
  const [receitaErro, setReceitaErro] = useState('');
  const [ingrModal, setIngrModal] = useState<{ aberto: boolean; editing: ReceitaIngrediente | null }>({
    aberto: false,
    editing: null,
  });
  const [confirmDelIngr, setConfirmDelIngr] = useState<ReceitaIngrediente | null>(null);

  const [busca, setBusca] = useState('');
const [filtroAtivo, setFiltroAtivo] = useState(true);
const [filtroInativo, setFiltroInativo] = useState(false);

const produtosFiltrados = useMemo(() => {
  let lista = produtos;
  if (filtroAtivo !== filtroInativo) {
    lista = lista.filter(
      (p) => (filtroAtivo && p.ativo === true) || (filtroInativo && p.ativo !== true),
    );
  }
  return lista.filter((p) => passaBusca([p.nome], busca));
}, [produtos, busca, filtroAtivo, filtroInativo]);
const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [ps, ins] = await Promise.all([listarProdutosFabricados(), listarInsumos()]);
      setProdutos(ps);
      setInsumos(ins);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditar = (p: ProdutoFabricado) => {
    setEditing(p);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: ProdutoFabricado, foto?: { dataUrl?: string; remover?: boolean }) => {
    const res = await salvarProdutoFabricado({ ...data, id: editing?.id });
    const id = res?.id ?? editing?.id;
    if (id && foto) {
      try {
        await enviarFotoProdutoFabricado(id, foto.dataUrl ?? '');
      } catch (e) {
        setErro(extrairErro(e));
        return;
      }
    }
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirProdutoFabricado(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const insumoNome = new Map(insumos.map((i) => [i.id, i.nome]));
  const insumoUnidade = new Map(insumos.map((i) => [i.id, i.unidade_medida]));

  const carregarReceitas = useCallback(async (produtoId: number) => {
    setReceitaErro('');
    setReceitaCarregando(true);
    try {
      const r = await listarReceitasIngrediente(produtoId);
      setReceitas((prev) => ({ ...prev, [produtoId]: r }));
    } catch (e) {
      setReceitaErro(extrairErro(e));
    } finally {
      setReceitaCarregando(false);
    }
  }, []);

  const alternarExpansao = async (p: ProdutoFabricado) => {
    if (!p.id) return;
    if (expandido === p.id) {
      setExpandido(null);
      return;
    }
    setExpandido(p.id);
    await carregarReceitas(p.id);
  };

  const aoSalvarIngrediente = async (data: ReceitaIngrediente) => {
    if (expandido == null) return;
    await salvarReceitaIngrediente({
      ...data,
      id: ingrModal.editing?.id ?? data.id,
      produto_fabricado_id: expandido,
    });
    setIngrModal({ aberto: false, editing: null });
    await carregarReceitas(expandido);
  };

  const aoExcluirIngrediente = async () => {
    if (!confirmDelIngr?.id) return;
    try {
      await excluirReceitaIngrediente(confirmDelIngr.id);
      setConfirmDelIngr(null);
      if (expandido != null) await carregarReceitas(expandido);
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/cadastro')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Produtos Fabricados
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 56, fontSize: 12 }}>
        Gerencie seus produtos
      </div>
      <PlusButton onClick={abrirNovo} />

            <div className="list-card" style={{ top: 88, bottom: 12 }}>
        {!loading && !erro && (
          <FiltrosBar
            busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar...' }}
            checks={{
              opcao1: filtroAtivo,
              onOpcao1: setFiltroAtivo,
              opcao2: filtroInativo,
              onOpcao2: setFiltroInativo,
              label1: 'Ativos',
              label2: 'Inativos',
            }}
          />
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && produtosFiltrados.length === 0 && (
          <div className="list-empty">Nenhum produto fabricado cadastrado</div>
        )}
        {!loading && !erro && produtos.length > 0 && (
          <div className="list-scroll">
            {produtosFiltrados.map((p) => (
              <div key={p.id}>
                <div
                  className="insumo-row"
                  onClick={() => alternarExpansao(p)}
                >
                  <div className="insumo-cod">#{p.id}</div>
                  <div className="insumo-nome">{p.nome}</div>
                  <div className="insumo-det">
                    {p.unidade_medida || '—'} &nbsp;•&nbsp; {fmtMoeda(p.custo_unitario)}
                  </div>
                  <div className="insumo-det" style={{ color: '#2d5e3a' }}>
                    Venda: {fmtMoeda(p.preco ?? p.valor_venda_sugerido)}
                  </div>
                  <RowMenu
                    style={{ top: 12, height: 32 }}
                    fontSize={19}
                    stopPropagacao
                    opcoes={[
                      { rotulo: 'Editar', onPress: () => abrirEditar(p) },
                      { rotulo: 'Excluir', cor: '#dc2626', onPress: () => setConfirmDelete(p) },
                    ]}
                  />
                  <button
                    className="compra-btn"
                    style={{ top: 48, height: 36, color: '#9ca09d', fontSize: 16 }}
                    onClick={() => alternarExpansao(p)}
                  >
                    {expandido === p.id ? '▲' : '▼'}
                  </button>
                </div>
                {expandido === p.id && (
                  <div className="ingr-inline">
                    {receitaErro && (
                      <div className="ingr-vazio" style={{ color: '#c0392b' }}>{receitaErro}</div>
                    )}
                    {!receitaErro && receitaCarregando && !receitas[p.id ?? -1] && (
                      <div className="ingr-vazio">Carregando ingredientes...</div>
                    )}
                    {!receitaErro && !receitaCarregando && (receitas[p.id ?? -1] ?? []).length === 0 && (
                      <div className="ingr-vazio">Nenhum ingrediente na receita</div>
                    )}
                    {(receitas[p.id ?? -1] ?? []).map((r) => (
                      <div key={r.id} className="ingr-linha">
                        <span className="ingr-cod">#{r.id}</span>
                        <span className="ingr-nome">{insumoNome.get(r.insumo_id) ?? '—'}</span>
                        <span className="ingr-qtd">
                          {fmtQtd(r.quantidade)} {insumoUnidade.get(r.insumo_id) ?? ''}
                        </span>
                        <span className="ingr-sub">{fmtMoeda(r.quantidade * (r.insumo_custo_medio ?? 0))}</span>
                        <button className="ingr-remover" onClick={() => setConfirmDelIngr(r)}>✕</button>
                      </div>
                    ))}
                    <button
                      className="ingr-add"
                      onClick={() => setIngrModal({ aberto: true, editing: null })}
                    >
                      + Adicionar Ingrediente
                    </button>
                  </div>
                )}
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ProdutoFabricadoModal
          key={`produto-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Produto' : 'Novo Produto'}
          inicial={editing}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Produto"
          nome={confirmDelete.nome}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}

      {ingrModal.aberto && expandido != null && (
        <IngredienteModal
          key={`ingr-form-${ingrModal.editing?.id ?? 'new'}`}
          titulo={ingrModal.editing ? 'Editar Ingrediente' : 'Novo Ingrediente'}
          inicial={ingrModal.editing ?? ({ produto_fabricado_id: expandido } as ReceitaIngrediente)}
          produtos={produtos.filter((p) => p.id === expandido)}
          insumos={insumos}
          onCancel={() => setIngrModal({ aberto: false, editing: null })}
          onSalvar={aoSalvarIngrediente}
        />
      )}

      {confirmDelIngr && (
        <ConfirmDialog
          titulo="Excluir Ingrediente"
          nome={insumoNome.get(confirmDelIngr.insumo_id) ?? 'este ingrediente'}
          onCancel={() => setConfirmDelIngr(null)}
          onConfirm={aoExcluirIngrediente}
        />
      )}
    </div>
  );
}
