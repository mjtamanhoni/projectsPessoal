import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  excluirProdutoFabricado,
  extrairErro,
  listarProdutosFabricados,
  salvarProdutoFabricado,
  type ProdutoFabricado,
} from '../api';
import ProdutoFabricadoModal from '../components/ProdutoFabricadoModal';
import ConfirmDialog from '../components/ConfirmDialog';
import BackButton from '../components/BackButton';
import PlusButton from '../components/PlusButton';

function fmtMoeda(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setProdutos(await listarProdutosFabricados());
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

  const aoSalvar = async (data: ProdutoFabricado) => {
    await salvarProdutoFabricado({ ...data, id: editing?.id });
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

      <div className="list-card" style={{ top: 80, height: 720 }}>
        {loading && <div className="list-empty">Carregando...</div>}
        {!loading && erro && (
          <div className="list-empty" style={{ color: '#c0392b' }}>
            {erro}
          </div>
        )}
        {!loading && !erro && produtos.length === 0 && (
          <div className="list-empty">Nenhum produto fabricado cadastrado</div>
        )}
        {!loading && !erro && produtos.length > 0 && (
          <div className="list-scroll">
            {produtos.map((p) => (
              <div key={p.id}>
                <div
                  className="insumo-row"
                  onClick={() => p.id != null && navigate(`/ingredientes/${p.id}`)}
                >
                  <div className="insumo-cod">#{p.id}</div>
                  <div className="insumo-nome">{p.nome}</div>
                  <div className="insumo-det">
                    {p.unidade_medida || '—'} &nbsp;•&nbsp; {fmtMoeda(p.custo_unitario)}
                  </div>
                  <div className="insumo-det" style={{ color: '#2d5e3a' }}>
                    Venda: {fmtMoeda(p.valor_venda_sugerido)}
                  </div>
                  <button
                    className="row-btn"
                    style={{ top: 16, color: '#6b706c', fontSize: 18 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirEditar(p);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="row-btn"
                    style={{ top: 44, color: '#dc2626', fontSize: 16 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(p);
                    }}
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
    </div>
  );
}
