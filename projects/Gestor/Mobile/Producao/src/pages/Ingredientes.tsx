import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  excluirReceitaIngrediente,
  extrairErro,
  listarInsumos,
  listarProdutosFabricados,
  listarReceitasIngrediente,
  salvarReceitaIngrediente,
  type Insumo,
  type ProdutoFabricado,
  type ReceitaIngrediente,
} from '../api';
import IngredienteModal from '../components/IngredienteModal';
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

export default function Ingredientes() {
  const navigate = useNavigate();
  const { produtoId } = useParams<{ produtoId: string }>();
  const idProduto = Number(produtoId);

  const [itens, setItens] = useState<ReceitaIngrediente[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReceitaIngrediente | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<ReceitaIngrediente | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [r, i, p] = await Promise.all([
        listarReceitasIngrediente(idProduto),
        listarInsumos(),
        listarProdutosFabricados(),
      ]);
      setItens(r);
      setInsumos(i);
      setProdutos(p);
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, [idProduto]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const produto = produtos.find((p) => p.id === idProduto);
  const total = itens.reduce((acc, r) => acc + r.quantidade * (r.insumo_custo_medio ?? 0), 0);

  const abrirNovo = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const abrirEditar = (r: ReceitaIngrediente) => {
    setEditing(r);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const aoSalvar = async (data: ReceitaIngrediente) => {
    await salvarReceitaIngrediente({ ...data, id: editing?.id });
    setModalOpen(false);
    setEditing(null);
    await carregar();
  };

  const aoExcluir = async () => {
    if (!confirmDelete?.id) return;
    try {
      await excluirReceitaIngrediente(confirmDelete.id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      setErro(extrairErro(e));
    }
  };

  const insumoNome = new Map(insumos.map((i) => [i.id, i.nome]));
  const insumoUnidade = new Map(insumos.map((i) => [i.id, i.unidade_medida]));

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate('/produtos-fabricados')} />
      <div className="dashboard-title" style={{ left: 42, top: 24 }}>
        Ingredientes
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 52, fontSize: 11 }}>
        Total de ingredientes: {itens.length} {itens.length === 1 ? 'item' : 'itens'} • {fmtMoeda(total)}
      </div>
      <PlusButton onClick={abrirNovo} />

      <div className="list-card" style={{ top: 76, height: 724 }}>
        {produto && (
          <>
            <div className="ingr-prod-head">{produto.nome}</div>
            <div className="row-sep" />
          </>
        )}
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && itens.length === 0 && (
          <div className="list-empty">Nenhum ingrediente nesta receita</div>
        )}
        {!loading && !erro && itens.length > 0 && (
          <div className="list-scroll">
            {itens.map((r) => (
              <div key={r.id}>
                <div className="insumo-row">
                  <div className="insumo-cod">#{r.id}</div>
                  <div className="insumo-nome">{insumoNome.get(r.insumo_id) ?? '—'}</div>
                  <div className="insumo-det">
                    {insumoUnidade.get(r.insumo_id) ?? '—'} &nbsp;•&nbsp; {fmtQtd(r.quantidade)} &nbsp;•&nbsp;{' '}
                    {fmtMoeda(r.insumo_custo_medio)}
                  </div>
                  <div className="insumo-det" style={{ color: '#2d5e3a' }}>
                    Subtotal: {fmtMoeda(r.quantidade * (r.insumo_custo_medio ?? 0))}
                  </div>
                  <button
                    className="row-btn"
                    style={{ top: 16, color: '#6b706c', fontSize: 18 }}
                    onClick={() => abrirEditar(r)}
                  >
                    ✎
                  </button>
                  <button
                    className="row-btn"
                    style={{ top: 44, color: '#dc2626', fontSize: 16 }}
                    onClick={() => setConfirmDelete(r)}
                  >
                    🗑
                  </button>
                </div>
                <div className="row-sep" />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <IngredienteModal
          key={`ingrediente-form-${editing?.id ?? `new-${formKey}`}`}
          titulo={editing ? 'Editar Ingrediente' : 'Novo Ingrediente'}
          inicial={editing}
          produtos={produtos}
          insumos={insumos}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSalvar={aoSalvar}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          titulo="Excluir Ingrediente"
          nome={insumoNome.get(confirmDelete.insumo_id) ?? 'este ingrediente'}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={aoExcluir}
        />
      )}
    </div>
  );
}
